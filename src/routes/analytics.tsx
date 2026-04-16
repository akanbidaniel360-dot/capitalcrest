import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions").select("*").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(200).then(({ data }) => setTransactions(data ?? []));
  }, [user]);

  if (!profile) return null;

  const spending: Record<string, number> = {};
  const income: Record<string, number> = {};
  transactions.forEach((t) => {
    const month = new Date(t.created_at).toLocaleDateString("en-US", { month: "short" });
    if (["withdrawal", "transfer_out", "bill_payment"].includes(t.type)) {
      spending[t.type] = (spending[t.type] || 0) + Number(t.amount);
    }
    if (["deposit", "transfer_in", "loan_credit"].includes(t.type)) {
      income[t.type] = (income[t.type] || 0) + Number(t.amount);
    }
  });

  const totalSpending = Object.values(spending).reduce((a, b) => a + b, 0);
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="mt-1 text-lg font-bold text-emerald">{formatCurrency(totalIncome, profile.primary_currency)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Spending</p>
            <p className="mt-1 text-lg font-bold text-destructive">{formatCurrency(totalSpending, profile.primary_currency)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">Spending by Category</h3>
          {Object.keys(spending).length === 0 ? (
            <p className="text-sm text-muted-foreground">No spending data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(spending).map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-foreground">{type.replace(/_/g, " ")}</span>
                    <span className="font-medium text-foreground">{formatCurrency(amount, profile.primary_currency)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(amount / totalSpending) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">Income Sources</h3>
          {Object.keys(income).length === 0 ? (
            <p className="text-sm text-muted-foreground">No income data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(income).map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-foreground">{type.replace(/_/g, " ")}</span>
                    <span className="font-medium text-foreground">{formatCurrency(amount, profile.primary_currency)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald" style={{ width: `${(amount / totalIncome) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
