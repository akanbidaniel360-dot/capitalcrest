import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, PiggyBank, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/savings")({
  component: SavingsPage,
});

function SavingsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [lockMonths, setLockMonths] = useState("3");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setGoals(data ?? []));
  }, [user]);

  if (!profile) return null;

  const createGoal = async () => {
    const targetAmt = parseFloat(target);
    if (!name.trim() || !targetAmt) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      const maturity = new Date();
      maturity.setMonth(maturity.getMonth() + parseInt(lockMonths));
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user!.id,
        name: name.trim(),
        target_amount: targetAmt,
        lock_period_months: parseInt(lockMonths),
        maturity_date: maturity.toISOString().split("T")[0],
      });
      if (error) throw error;
      toast.success("Savings goal created!");
      setShowCreate(false);
      setName(""); setTarget("");
      const { data } = await supabase.from("savings_goals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      setGoals(data ?? []);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-lg font-semibold text-foreground">Savings</h1>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" />New Goal</Button>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        {showCreate && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold text-foreground">Create Savings Goal</h2>
            <div className="space-y-3">
              <div><Label>Goal Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" /></div>
              <div><Label>Target Amount ({profile.primary_currency})</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" /></div>
              <div><Label>Lock Period (months)</Label><Input type="number" value={lockMonths} onChange={(e) => setLockMonths(e.target.value)} min="1" max="60" /></div>
              <p className="text-xs text-muted-foreground">Interest rate: 3.5% per annum</p>
              <Button onClick={createGoal} disabled={loading} className="w-full">{loading ? "Creating..." : "Create Goal"}</Button>
            </div>
          </div>
        )}

        {goals.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center justify-center py-16">
            <PiggyBank className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No savings goals yet</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>Create Goal</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{g.name}</p>
                  {g.is_matured ? (
                    <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-xs font-semibold text-emerald">Matured</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Matures {new Date(g.maturity_date).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatCurrency(g.current_amount, profile.primary_currency)}</span>
                    <span className="font-medium text-foreground">{formatCurrency(g.target_amount, profile.primary_currency)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${Math.min((g.current_amount / g.target_amount) * 100, 100)}%` }} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Interest: {g.interest_rate}% p.a. • Lock: {g.lock_period_months} months</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
