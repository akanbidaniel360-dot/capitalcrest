import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowDownLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { CURRENCIES } from "@/lib/currency";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/deposit")({
  component: DepositPage,
});

function DepositPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  if (!profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "deposit" as const,
        amount: amt,
        currency: profile.primary_currency,
        description: `Deposit via ${method.replace("_", " ")}`,
        status: "pending" as const,
        metadata: { method, reference },
      });
      if (error) throw error;
      toast.success("Deposit request submitted! Awaiting admin approval.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit deposit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Deposit Funds</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald/10 p-4">
          <ArrowDownLeft className="h-8 w-8 text-emerald" />
          <div>
            <p className="font-semibold text-foreground">Add money to your account</p>
            <p className="text-sm text-muted-foreground">Funds will be available after admin approval</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Amount ({profile.primary_currency})</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" required />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                <SelectItem value="card">Debit/Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Reference / Transaction ID</Label>
            <Textarea placeholder="Enter your payment reference..." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Submit Deposit Request"}
          </Button>
        </form>
      </div>
    </div>
  );
}
