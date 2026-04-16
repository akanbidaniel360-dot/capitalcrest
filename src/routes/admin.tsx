import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Users, Check, X, CreditCard, Landmark, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [pendingCards, setPendingCards] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate({ to: "/dashboard" });
  }, [user, isAdmin, isLoading]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const load = async () => {
      const [u, d, w, k, l, c] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").eq("type", "deposit").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").eq("type", "withdrawal").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("kyc_documents").select("*").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("loans").select("*").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("cards").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      ]);
      setUsers(u.data ?? []);
      setPendingDeposits(d.data ?? []);
      setPendingWithdrawals(w.data ?? []);
      setPendingKyc(k.data ?? []);
      setPendingLoans(l.data ?? []);
      setPendingCards(c.data ?? []);
    };
    load();
  }, [user, isAdmin]);

  const approveDeposit = async (t: any) => {
    await supabase.from("transactions").update({ status: "approved" as any }).eq("id", t.id);
    const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", t.user_id).eq("currency", t.currency).single();
    if (wallet) {
      await supabase.from("wallets").update({ available_balance: wallet.available_balance + t.amount }).eq("id", wallet.id);
    }
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
    if (!wallet || wallet.available_balance < t.amount) { toast.error("Insufficient balance"); return; }
    await supabase.from("transactions").update({ status: "approved" as any }).eq("id", t.id);
    await supabase.from("wallets").update({ available_balance: wallet.available_balance - t.amount }).eq("id", wallet.id);
    setPendingWithdrawals((p) => p.filter((x) => x.id !== t.id));
    toast.success("Withdrawal approved");
  };

  const approveKyc = async (k: any) => {
    await supabase.from("kyc_documents").update({ status: "verified" as any }).eq("id", k.id);
    await supabase.from("profiles").update({ kyc_status: "verified" as any }).eq("user_id", k.user_id);
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
    const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", l.user_id).limit(1).single();
    if (wallet) {
      await supabase.from("wallets").update({ available_balance: wallet.available_balance + l.amount }).eq("id", wallet.id);
    }
    await supabase.from("transactions").insert({ user_id: l.user_id, type: "loan_credit" as any, amount: l.amount, currency: wallet?.currency ?? "USD", description: "Loan approved", status: "completed" as any });
    setPendingLoans((p) => p.filter((x) => x.id !== l.id));
    toast.success("Loan approved");
  };

  const approveCard = async (c: any) => {
    await supabase.from("cards").update({ status: "active" as any }).eq("id", c.id);
    setPendingCards((p) => p.filter((x) => x.id !== c.id));
    toast.success("Card approved");
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* Stats */}
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
          <TabsList className="w-full">
            <TabsTrigger value="deposits">Deposits ({pendingDeposits.length})</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals ({pendingWithdrawals.length})</TabsTrigger>
            <TabsTrigger value="kyc">KYC ({pendingKyc.length})</TabsTrigger>
            <TabsTrigger value="loans">Loans ({pendingLoans.length})</TabsTrigger>
            <TabsTrigger value="cards">Cards ({pendingCards.length})</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="deposits" className="space-y-2 mt-4">
            {pendingDeposits.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No pending deposits</p> : pendingDeposits.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(t.amount, t.currency)}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => approveDeposit(t)}><Check className="h-4 w-4 text-emerald" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => rejectTransaction(t)}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

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

          <TabsContent value="loans" className="space-y-2 mt-4">
            {pendingLoans.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No pending loans</p> : pendingLoans.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(l.amount, "USD")} for {l.duration_months}mo</p>
                  <p className="text-xs text-muted-foreground">Rate: {l.interest_rate}%</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => approveLoan(l)}><Check className="h-4 w-4 text-emerald" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { supabase.from("loans").update({ status: "rejected" as any }).eq("id", l.id); setPendingLoans(p => p.filter(x => x.id !== l.id)); }}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="cards" className="space-y-2 mt-4">
            {pendingCards.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No pending cards</p> : pendingCards.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.card_holder}</p>
                  <p className="text-xs text-muted-foreground">****{c.card_number.slice(-4)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => approveCard(c)}><Check className="h-4 w-4 text-emerald" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { supabase.from("cards").update({ status: "cancelled" as any }).eq("id", c.id); setPendingCards(p => p.filter(x => x.id !== c.id)); }}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-2 mt-4">
            {users.map((u) => (
              <div key={u.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email} • {u.account_number}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.kyc_status === "verified" ? "bg-emerald/10 text-emerald" : "bg-muted text-muted-foreground"}`}>{u.kyc_status}</span>
                </div>
                <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                  <span>Score: {u.credit_score}</span>
                  <span>•</span>
                  <span>{u.primary_currency}</span>
                  {u.is_frozen && <span className="text-destructive">• FROZEN</span>}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
