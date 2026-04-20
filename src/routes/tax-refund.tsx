import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Receipt, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/tax-refund")({
  component: TaxRefundPage,
});

function TaxRefundPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.from("tax_refunds").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => {
    reload();
    if (!user) return;
    const ch = supabase.channel(`tax-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tax_refunds", filter: `user_id=eq.${user.id}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!profile) return null;

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!reason.trim() || reason.length < 10) { toast.error("Reason must be at least 10 characters"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("tax_refunds").insert({
        user_id: user!.id, amount: amt, reason: reason.trim(), status: "pending",
      });
      if (error) throw error;
      toast.success("Tax refund request submitted");
      setAmount(""); setReason("");
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-chart-4/10 text-chart-4",
      approved: "bg-emerald/10 text-emerald",
      rejected: "bg-destructive/10 text-destructive",
    };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[s] || "bg-muted text-muted-foreground"}`}>{s}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Tax Refund</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold text-foreground">Request a Tax Refund</h2>
          <form onSubmit={apply} className="space-y-3">
            <div>
              <Label>Refund Amount ({profile.primary_currency})</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" required />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea placeholder="Describe the basis for your refund..." value={reason} onChange={(e) => setReason(e.target.value)} rows={4} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Refund Request"}
            </Button>
          </form>
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-foreground">Your Requests</h2>
          {items.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No tax refund requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((g) => (
                <div key={g.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{formatCurrency(g.amount, profile.primary_currency)}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{g.reason}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(g.created_at).toLocaleString()}</p>
                    </div>
                    {statusBadge(g.status)}
                  </div>
                  {g.admin_notes && (
                    <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-foreground"><strong>Admin:</strong> {g.admin_notes}</p>
                  )}
                  {g.status === "approved" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Refund credited to your account
                    </div>
                  )}
                  {g.status === "rejected" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Request declined
                    </div>
                  )}
                  {g.status === "pending" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-chart-4">
                      <Clock className="h-3.5 w-3.5" /> Under review
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
