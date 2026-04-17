import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, Receipt, Filter, Download, Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [range, setRange] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("transactions")
        .select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(500);
      setTransactions(data ?? []);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel(`txn-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = range === "week" ? now - 7 * 86400000
      : range === "month" ? now - 30 * 86400000
      : range === "year" ? now - 365 * 86400000 : 0;
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (cutoff && new Date(t.created_at).getTime() < cutoff) return false;
      if (q && !(t.description || "").toLowerCase().includes(q)
        && !(t.reference || "").toLowerCase().includes(q)
        && !t.type.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, filter, range, search]);

  const stats = useMemo(() => {
    let inAmt = 0, outAmt = 0;
    filtered.forEach((t) => {
      const isIn = t.type === "deposit" || t.type === "transfer_in" || t.type === "loan_credit" || t.type === "interest" || t.type === "referral_bonus";
      if (t.status === "completed" || t.status === "approved") {
        if (isIn) inAmt += Number(t.amount);
        else outAmt += Number(t.amount);
      }
    });
    return { inAmt, outAmt, net: inAmt - outAmt };
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Date", "Type", "Description", "Amount", "Currency", "Status", "Reference"];
    const rows = filtered.map((t) => [
      new Date(t.created_at).toISOString(),
      t.type, (t.description || "").replace(/,/g, ";"),
      t.amount, t.currency, t.status, t.reference || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capital-crest-transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getIcon = (type: string) => {
    if (type.includes("deposit") || type.includes("in") || type === "loan_credit") return <ArrowDownLeft className="h-4 w-4 text-emerald" />;
    if (type.includes("withdraw") || type.includes("out")) return <ArrowUpRight className="h-4 w-4 text-destructive" />;
    return <Receipt className="h-4 w-4 text-muted-foreground" />;
  };

  if (!profile) return null;
  const cur = profile.primary_currency;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-lg font-semibold text-foreground">Transactions</h1>
          </div>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-3">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] uppercase text-muted-foreground">In</p>
            <p className="text-sm font-bold text-emerald">{formatCurrency(stats.inAmt, cur)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Out</p>
            <p className="text-sm font-bold text-destructive">{formatCurrency(stats.outAmt, cur)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Net</p>
            <p className={`text-sm font-bold ${stats.net >= 0 ? "text-emerald" : "text-destructive"}`}>{formatCurrency(stats.net, cur)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search description or reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger><Filter className="mr-1 h-3.5 w-3.5" /><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
              <SelectItem value="transfer_out">Transfers Out</SelectItem>
              <SelectItem value="transfer_in">Transfers In</SelectItem>
              <SelectItem value="bill_payment">Bills</SelectItem>
              <SelectItem value="currency_conversion">Conversions</SelectItem>
              <SelectItem value="loan_credit">Loans</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const isIn = t.type === "deposit" || t.type === "transfer_in" || t.type === "loan_credit" || t.type === "interest";
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">{getIcon(t.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{t.description || t.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()} · {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isIn ? "text-emerald" : "text-foreground"}`}>
                      {isIn ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                    </p>
                    <p className={`text-xs capitalize ${t.status === "completed" || t.status === "approved" ? "text-emerald" : t.status === "pending" ? "text-chart-4" : "text-destructive"}`}>{t.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
