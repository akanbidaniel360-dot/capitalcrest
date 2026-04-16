import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Send, Receipt, Filter } from "lucide-react";
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

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    const q = supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    q.then(({ data }) => setTransactions(data ?? []));
  }, [user]);

  if (!profile) return null;

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  const getIcon = (type: string) => {
    if (type.includes("deposit") || type.includes("in")) return <ArrowDownLeft className="h-4 w-4 text-emerald" />;
    if (type.includes("withdraw") || type.includes("out")) return <ArrowUpRight className="h-4 w-4 text-destructive" />;
    return <Receipt className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Transactions</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="mb-4"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="withdrawal">Withdrawals</SelectItem>
            <SelectItem value="transfer_out">Transfers Out</SelectItem>
            <SelectItem value="transfer_in">Transfers In</SelectItem>
            <SelectItem value="bill_payment">Bills</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length === 0 ? (
          <div className="py-16 text-center"><Receipt className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">No transactions found</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">{getIcon(t.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{t.description || t.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.type.includes("in") || t.type === "deposit" || t.type === "loan_credit" ? "text-emerald" : "text-foreground"}`}>
                    {t.type.includes("in") || t.type === "deposit" ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                  </p>
                  <p className={`text-xs capitalize ${t.status === "completed" || t.status === "approved" ? "text-emerald" : t.status === "pending" ? "text-chart-4" : "text-destructive"}`}>{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
