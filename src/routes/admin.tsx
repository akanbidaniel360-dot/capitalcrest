import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Shield, Check, X, Wallet, RefreshCw, Snowflake,
  UserPlus, Crown, ShieldCheck, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, CURRENCIES } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, isSuperAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [pendingCards, setPendingCards] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [autoSimulate, setAutoSimulate] = useState(false);

  // Edit balance dialog
  const [editUser, setEditUser] = useState<any>(null);
  const [editWallets, setEditWallets] = useState<any[]>([]);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [editNote, setEditNote] = useState("");

  // New admin dialog
  const [newAdminEmail, setNewAdminEmail] = useState("");

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate({ to: "/dashboard" });
  }, [user, isAdmin, isLoading]);

  const reload = async () => {
    if (!user || !isAdmin) return;
    const [u, d, w, k, l, c, r, ar, asg] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("type", "deposit").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("type", "withdrawal").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("kyc_documents").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("loans").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("cards").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("exchange_rates").select("*").order("from_currency"),
      supabase.from("user_roles").select("*"),
      supabase.from("admin_assignments").select("*"),
    ]);
    setUsers(u.data ?? []);
    setPendingDeposits(d.data ?? []);
    setPendingWithdrawals(w.data ?? []);
    setPendingKyc(k.data ?? []);
    setPendingLoans(l.data ?? []);
    setPendingCards(c.data ?? []);
    setRates(r.data ?? []);
    setAdmins(ar.data ?? []);
    setAssignments(asg.data ?? []);
  };

  useEffect(() => { reload(); }, [user, isAdmin]);

  // Auto-simulate rates every 30s
  useEffect(() => {
    if (!autoSimulate || !isSuperAdmin) return;
    const t = setInterval(() => simulateRates(true), 30000);
    return () => clearInterval(t);
  }, [autoSimulate, isSuperAdmin, rates.length]);

  // ----- approval handlers (wallet sync handled by DB trigger) -----
  const approveDeposit = async (t: any) => {
    await supabase.from("transactions").update({ status: "completed" as any }).eq("id", t.id);
    await supabase.from("notifications").insert({
      user_id: t.user_id, type: "deposit" as any, title: "Deposit approved",
      message: `Your deposit of ${formatCurrency(t.amount, t.currency)} has been credited.`,
    });
    setPendingDeposits((p) => p.filter((x) => x.id !== t.id));
    toast.success("Deposit approved");
  };

  const rejectTransaction = async (t: any) => {
    await supabase.from("transactions").update({ status: "rejected" as any }).eq("id", t.id);
    setPendingDeposits((p) => p.filter((x) => x.id !== t.id));
    setPendingWithdrawals((p) => p.filter((x) => x.id !== t.id));
    toast.success("Transaction rejected");
  };

  const approveWithdrawal = async (t: any) => {
    const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", t.user_id).eq("currency", t.currency).single();
    if (!wallet || Number(wallet.available_balance) < Number(t.amount)) { toast.error("Insufficient balance"); return; }
    await supabase.from("transactions").update({ status: "completed" as any }).eq("id", t.id);
    await supabase.from("notifications").insert({
      user_id: t.user_id, type: "withdrawal" as any, title: "Withdrawal approved",
      message: `${formatCurrency(t.amount, t.currency)} has been sent.`,
    });
    setPendingWithdrawals((p) => p.filter((x) => x.id !== t.id));
    toast.success("Withdrawal approved");
  };

  const approveKyc = async (k: any) => {
    await supabase.from("kyc_documents").update({ status: "verified" as any }).eq("id", k.id);
    await supabase.from("profiles").update({ kyc_status: "verified" as any }).eq("user_id", k.user_id);
    await supabase.from("notifications").insert({
      user_id: k.user_id, type: "kyc" as any, title: "KYC verified",
      message: "Your identity has been verified. All features unlocked.",
    });
    setPendingKyc((p) => p.filter((x) => x.id !== k.id));
    toast.success("KYC approved");
  };
  const rejectKyc = async (k: any) => {
    await supabase.from("kyc_documents").update({ status: "rejected" as any }).eq("id", k.id);
    await supabase.from("profiles").update({ kyc_status: "rejected" as any }).eq("user_id", k.user_id);
    setPendingKyc((p) => p.filter((x) => x.id !== k.id));
    toast.success("KYC rejected");
  };

  const approveLoan = async (l: any) => {
    await supabase.from("loans").update({ status: "active" as any }).eq("id", l.id);
    const { data: profile } = await supabase.from("profiles").select("primary_currency").eq("user_id", l.user_id).single();
    const cur = profile?.primary_currency ?? "USD";
    // Insert completed loan_credit transaction → wallet trigger credits user
    await supabase.from("transactions").insert({
      user_id: l.user_id, type: "loan_credit" as any, amount: l.amount,
      currency: cur, description: "Loan approved", status: "completed" as any,
    });
    await supabase.from("notifications").insert({
      user_id: l.user_id, type: "loan" as any, title: "Loan approved",
      message: `Your loan of ${formatCurrency(l.amount, cur)} has been credited.`,
    });
    setPendingLoans((p) => p.filter((x) => x.id !== l.id));
    toast.success("Loan approved");
  };

  const approveCard = async (c: any) => {
    await supabase.from("cards").update({ status: "active" as any }).eq("id", c.id);
    await supabase.from("notifications").insert({
      user_id: c.user_id, type: "card" as any, title: "Card activated",
      message: "Your virtual card is now active.",
    });
    setPendingCards((p) => p.filter((x) => x.id !== c.id));
    toast.success("Card approved");
  };

  // ----- balance editing -----
  const openEditBalance = async (u: any) => {
    setEditUser(u);
    setEditNote("");
    const { data } = await supabase.from("wallets").select("*").eq("user_id", u.user_id);
    setEditWallets(data ?? []);
    const map: Record<string, string> = {};
    (data ?? []).forEach((w: any) => { map[w.currency] = String(w.available_balance); });
    setEditAmounts(map);
  };

  const saveBalances = async () => {
    if (!editUser) return;
    for (const w of editWallets) {
      const next = parseFloat(editAmounts[w.currency] ?? "0");
      if (Number.isNaN(next)) continue;
      const delta = next - Number(w.available_balance);
      if (delta === 0) continue;
      // Insert admin_adjustment — trigger updates wallet balance
      await supabase.from("transactions").insert({
        user_id: editUser.user_id,
        type: "admin_adjustment" as any,
        amount: delta, // signed; trigger uses sign for + adjustment, but our trigger treats admin_adjustment as +amount
        currency: w.currency,
        description: `Admin adjustment${editNote ? `: ${editNote}` : ""}`,
        status: "completed" as any,
        metadata: { previous: w.available_balance, next, by: user!.id, note: editNote, delta },
      });
      await supabase.from("notifications").insert({
        user_id: editUser.user_id, type: "system" as any, title: "Balance updated",
        message: `Your ${w.currency} balance was ${delta > 0 ? "credited" : "debited"} by ${formatCurrency(Math.abs(delta), w.currency)}.`,
      });
    }
    toast.success("Balances updated");
    setEditUser(null);
    reload();
  };

  const toggleFreeze = async (u: any) => {
    await supabase.from("profiles").update({ is_frozen: !u.is_frozen }).eq("user_id", u.user_id);
    toast.success(u.is_frozen ? "Account unfrozen" : "Account frozen");
    reload();
  };

  // ----- exchange rates -----
  const updateRate = async (id: string, value: string) => {
    const v = parseFloat(value);
    if (Number.isNaN(v) || v <= 0) return;
    await supabase.from("exchange_rates").update({ rate: v, updated_at: new Date().toISOString() }).eq("id", id);
    setRates((rs) => rs.map((r) => r.id === id ? { ...r, rate: v } : r));
  };

  const simulateRates = async (silent = false) => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const json = await res.json();
      if (!json.rates) throw new Error("No rates returned");
      for (const r of rates) {
        let next: number;
        if (r.from_currency === "USD" && json.rates[r.to_currency]) {
          next = Number(json.rates[r.to_currency]);
        } else if (r.to_currency === "USD" && json.rates[r.from_currency]) {
          next = 1 / Number(json.rates[r.from_currency]);
        } else continue;
        // ±2% jitter to feel live
        next = next * (1 + (Math.random() * 0.04 - 0.02));
        await supabase.from("exchange_rates").update({ rate: next, updated_at: new Date().toISOString() }).eq("id", r.id);
      }
      if (!silent) toast.success("Exchange rates refreshed from market data");
      reload();
    } catch (e: any) {
      if (!silent) toast.error("Could not fetch live rates");
    }
  };

  // ----- super admin: manage admins -----
  const promoteToAdmin = async (targetUserId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: targetUserId, role: "admin" as any });
    if (error) { toast.error(error.message); return; }
    toast.success("Promoted to admin");
    reload();
  };

  const demoteAdmin = async (targetUserId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", targetUserId).eq("role", "admin");
    if (error) { toast.error(error.message); return; }
    await supabase.from("admin_assignments").delete().eq("admin_id", targetUserId);
    toast.success("Demoted from admin");
    reload();
  };

  const createAdminByEmail = async () => {
    if (!newAdminEmail.trim()) return;
    const { data: profile, error } = await supabase.from("profiles").select("user_id, full_name, email").eq("email", newAdminEmail.trim().toLowerCase()).maybeSingle();
    if (error || !profile) { toast.error("No user found with that email"); return; }
    await promoteToAdmin(profile.user_id);
    setNewAdminEmail("");
  };

  const assignUserToAdmin = async (userId: string, adminId: string | null) => {
    if (!adminId || adminId === "none") {
      await supabase.from("admin_assignments").delete().eq("user_id", userId);
    } else {
      await supabase.from("admin_assignments").upsert({
        user_id: userId, admin_id: adminId, assigned_by: user!.id,
      }, { onConflict: "user_id" });
    }
    toast.success("Assignment updated");
    reload();
  };

  // ----- derived -----
  const adminUserIds = useMemo(() => new Set(admins.filter((r) => r.role === "admin" || r.role === "super_admin").map((r) => r.user_id)), [admins]);
  const superAdminIds = useMemo(() => new Set(admins.filter((r) => r.role === "super_admin").map((r) => r.user_id)), [admins]);
  const adminProfiles = useMemo(() => users.filter((u) => adminUserIds.has(u.user_id)), [users, adminUserIds]);
  const regularUsers = useMemo(() => users.filter((u) => !adminUserIds.has(u.user_id)), [users, adminUserIds]);
  const assignmentMap = useMemo(() => {
    const m: Record<string, string> = {};
    assignments.forEach((a) => { m[a.user_id] = a.admin_id; });
    return m;
  }, [assignments]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
          {isSuperAdmin && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald">
              <Crown className="h-3 w-3" /> SUPER ADMIN
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-xs text-muted-foreground">Users</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-chart-4">{pendingDeposits.length + pendingWithdrawals.length}</p>
            <p className="text-xs text-muted-foreground">Pending Txns</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{pendingKyc.length}</p>
            <p className="text-xs text-muted-foreground">KYC Pending</p>
          </div>
        </div>

        <Tabs defaultValue="deposits">
          <TabsList className="flex w-full flex-wrap h-auto">
            <TabsTrigger value="deposits">Deposits ({pendingDeposits.length})</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals ({pendingWithdrawals.length})</TabsTrigger>
            <TabsTrigger value="kyc">KYC ({pendingKyc.length})</TabsTrigger>
            <TabsTrigger value="loans">Loans ({pendingLoans.length})</TabsTrigger>
            <TabsTrigger value="cards">Cards ({pendingCards.length})</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="admins">Admins</TabsTrigger>}
          </TabsList>

          {/* DEPOSITS */}
          <TabsContent value="deposits" className="space-y-2 mt-4">
            {pendingDeposits.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No pending deposits</p> : pendingDeposits.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{formatCurrency(t.amount, t.currency)}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                  {t.reference && <p className="truncate text-[10px] text-muted-foreground">Ref: {t.reference}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => approveDeposit(t)}><Check className="h-4 w-4 text-emerald" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => rejectTransaction(t)}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* WITHDRAWALS */}
          <TabsContent value="withdrawals" className="space-y-2 mt-4">
            {pendingWithdrawals.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No pending withdrawals</p> : pendingWithdrawals.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(t.amount, t.currency)}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => approveWithdrawal(t)}><Check className="h-4 w-4 text-emerald" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => rejectTransaction(t)}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* KYC */}
          <TabsContent value="kyc" className="space-y-2 mt-4">
            {pendingKyc.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No pending KYC</p> : pendingKyc.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{k.document_type}</p>
                  <p className="text-xs text-muted-foreground">User: {k.user_id.slice(0, 8)}...</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => approveKyc(k)}><Check className="h-4 w-4 text-emerald" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => rejectKyc(k)}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* LOANS */}
          <TabsContent value="loans" className="space-y-2 mt-4">
            {pendingLoans.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No pending loans</p> : pendingLoans.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(l.amount, "USD")} for {l.duration_months}mo</p>
                  <p className="text-xs text-muted-foreground">Rate: {l.interest_rate}%</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => approveLoan(l)}><Check className="h-4 w-4 text-emerald" /></Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("loans").update({ status: "rejected" as any }).eq("id", l.id); setPendingLoans(p => p.filter(x => x.id !== l.id)); }}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* CARDS */}
          <TabsContent value="cards" className="space-y-2 mt-4">
            {pendingCards.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No pending cards</p> : pendingCards.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.card_holder}</p>
                  <p className="text-xs text-muted-foreground">****{c.card_number.slice(-4)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => approveCard(c)}><Check className="h-4 w-4 text-emerald" /></Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("cards").update({ status: "cancelled" as any }).eq("id", c.id); setPendingCards(p => p.filter(x => x.id !== c.id)); }}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="space-y-2 mt-4">
            {regularUsers.map((u) => (
              <div key={u.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{u.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email} • {u.account_number}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Score: {u.credit_score}</span>
                      <span>•</span>
                      <span>{u.primary_currency}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.kyc_status === "verified" ? "bg-emerald/10 text-emerald" : "bg-muted text-muted-foreground"}`}>{u.kyc_status}</span>
                      {u.is_frozen && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">FROZEN</span>}
                    </div>
                    {isSuperAdmin && (
                      <div className="mt-2">
                        <Label className="text-[10px] uppercase text-muted-foreground">Assigned admin</Label>
                        <Select value={assignmentMap[u.user_id] ?? "none"} onValueChange={(v) => assignUserToAdmin(u.user_id, v)}>
                          <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Unassigned —</SelectItem>
                            {adminProfiles.map((a) => (
                              <SelectItem key={a.user_id} value={a.user_id}>{a.full_name} ({a.email})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEditBalance(u)}>
                      <Wallet className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant={u.is_frozen ? "default" : "outline"} onClick={() => toggleFreeze(u)}>
                      <Snowflake className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* RATES */}
          <TabsContent value="rates" className="space-y-3 mt-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Live market simulation</p>
                <p className="text-xs text-muted-foreground">Auto-refresh rates every 30s</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={autoSimulate} onCheckedChange={setAutoSimulate} disabled={!isSuperAdmin} />
                <Button size="sm" variant="outline" onClick={() => simulateRates(false)} disabled={!isSuperAdmin}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              {rates.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                  <span className="w-20 text-xs font-mono font-semibold text-foreground">{r.from_currency} → {r.to_currency}</span>
                  <Input
                    type="number" step="0.0001" defaultValue={r.rate}
                    onBlur={(e) => updateRate(r.id, e.target.value)}
                    disabled={!isSuperAdmin}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ADMINS — super admin only */}
          {isSuperAdmin && (
            <TabsContent value="admins" className="space-y-3 mt-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full"><UserPlus className="mr-2 h-4 w-4" /> Promote user to admin</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add new admin</DialogTitle></DialogHeader>
                  <div className="space-y-2">
                    <Label>User email</Label>
                    <Input placeholder="user@example.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground">User must have an existing account.</p>
                  </div>
                  <DialogFooter>
                    <Button onClick={createAdminByEmail}>Promote to admin</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="space-y-2">
                {adminProfiles.map((a) => {
                  const isSuper = superAdminIds.has(a.user_id);
                  const assigned = assignments.filter((x) => x.admin_id === a.user_id).length;
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          {isSuper ? <Crown className="h-3.5 w-3.5 text-emerald" /> : <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                          {a.full_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                        <p className="text-[10px] text-muted-foreground">{assigned} user{assigned === 1 ? "" : "s"} assigned</p>
                      </div>
                      {!isSuper && (
                        <Button size="sm" variant="ghost" onClick={() => demoteAdmin(a.user_id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Edit balance dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit balance — {editUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {editWallets.length === 0 && (
              <p className="text-sm text-muted-foreground">User has no wallets yet.</p>
            )}
            {editWallets.map((w) => (
              <div key={w.id}>
                <Label className="text-xs">{w.currency} available balance</Label>
                <Input
                  type="number" step="0.01"
                  value={editAmounts[w.currency] ?? ""}
                  onChange={(e) => setEditAmounts((m) => ({ ...m, [w.currency]: e.target.value }))}
                />
              </div>
            ))}
            {/* Add new currency wallet */}
            <details className="rounded-lg border border-border p-2">
              <summary className="cursor-pointer text-xs font-medium text-foreground">Add new currency wallet</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CURRENCIES.filter((c) => !editWallets.some((w) => w.currency === c.code)).map((c) => (
                  <Button
                    key={c.code} size="sm" variant="outline"
                    onClick={async () => {
                      if (!editUser) return;
                      const { data } = await supabase.from("wallets").insert({
                        user_id: editUser.user_id, currency: c.code, available_balance: 0, pending_balance: 0,
                      }).select().single();
                      if (data) {
                        setEditWallets((w) => [...w, data]);
                        setEditAmounts((m) => ({ ...m, [c.code]: "0" }));
                      }
                    }}
                  >+ {c.code}</Button>
                ))}
              </div>
            </details>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Input placeholder="Reason for adjustment" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={saveBalances}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
