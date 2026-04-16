import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Landmark } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/loans")({
  component: LoansPage,
});

function LoansPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("6");
  const [loading, setLoading] = useState(false);
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from("loans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setLoans(data ?? []));
  }, [user]);

  if (!profile) return null;

  const interestRate = profile.credit_score >= 700 ? 3.5 : profile.credit_score >= 500 ? 5.0 : 8.0;
  const amt = parseFloat(amount) || 0;
  const months = parseInt(duration) || 6;
  const totalRepayment = amt * (1 + (interestRate / 100) * (months / 12));
  const monthlyPayment = totalRepayment / months;

  const applyForLoan = async () => {
    if (profile.kyc_status !== "verified") { toast.error("Complete KYC verification first"); return; }
    if (amt <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      const nextPayment = new Date();
      nextPayment.setMonth(nextPayment.getMonth() + 1);
      const { error } = await supabase.from("loans").insert({
        user_id: user!.id,
        amount: amt,
        duration_months: months,
        interest_rate: interestRate,
        monthly_payment: Math.round(monthlyPayment * 100) / 100,
        total_repayment: Math.round(totalRepayment * 100) / 100,
        status: "pending" as const,
        next_payment_date: nextPayment.toISOString().split("T")[0],
      });
      if (error) throw error;
      toast.success("Loan application submitted!");
      setShowApply(false);
      const { data } = await supabase.from("loans").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      setLoans(data ?? []);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "approved": case "active": case "paid": return "text-emerald";
      case "pending": return "text-chart-4";
      default: return "text-destructive";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-lg font-semibold text-foreground">Loans</h1>
          </div>
          <Button size="sm" onClick={() => setShowApply(true)}>Apply</Button>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        {showApply && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-1 font-semibold text-foreground">Apply for a Loan</h2>
            <p className="mb-4 text-sm text-muted-foreground">Interest rate based on your credit score ({profile.credit_score}): {interestRate}%</p>
            <div className="space-y-4">
              <div>
                <Label>Amount ({profile.primary_currency})</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0" />
              </div>
              <div>
                <Label>Duration (months)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" max="60" />
              </div>
              {amt > 0 && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Monthly Payment</span><span className="font-semibold text-foreground">{formatCurrency(monthlyPayment, profile.primary_currency)}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Total Repayment</span><span className="font-semibold text-foreground">{formatCurrency(totalRepayment, profile.primary_currency)}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span className="font-semibold text-foreground">{interestRate}%</span></div>
                </div>
              )}
              <Button onClick={applyForLoan} disabled={loading} className="w-full">{loading ? "Submitting..." : "Submit Application"}</Button>
            </div>
          </div>
        )}

        {loans.length === 0 && !showApply ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Landmark className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No loans yet</p>
            <Button className="mt-4" onClick={() => setShowApply(true)}>Apply for Loan</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <div key={loan.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{formatCurrency(loan.amount, profile.primary_currency)}</p>
                  <span className={`text-xs font-semibold capitalize ${getStatusColor(loan.status)}`}>{loan.status}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Duration: {loan.duration_months} months</span>
                  <span>Rate: {loan.interest_rate}%</span>
                  <span>Monthly: {formatCurrency(loan.monthly_payment ?? 0, profile.primary_currency)}</span>
                  <span>Paid: {formatCurrency(loan.amount_paid, profile.primary_currency)}</span>
                </div>
                {loan.status === "active" && (
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${(loan.amount_paid / loan.total_repayment) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{Math.round((loan.amount_paid / loan.total_repayment) * 100)}% repaid</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
