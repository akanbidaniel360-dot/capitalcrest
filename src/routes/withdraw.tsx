import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/withdraw")({
  component: WithdrawPage,
});

function WithdrawPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || !profile) return;
    supabase.from("wallets").select("*").eq("user_id", user.id).eq("currency", profile.primary_currency).single().then(({ data }) => setWallet(data));
  }, [user, profile]);

  if (!profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.kyc_status !== "verified") { toast.error("Complete KYC verification first"); return; }
    if (!profile.pin_hash) { toast.error("Set up your transaction PIN in settings first"); return; }
    if (pin.length !== 4) { toast.error("Enter your 4-digit PIN"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (wallet && amt > wallet.available_balance) { toast.error("Insufficient balance"); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "withdrawal" as const,
        amount: amt,
        currency: profile.primary_currency,
        description: `Withdrawal to ${bankName} - ${accountNumber}`,
        status: "pending" as const,
        metadata: { bank_name: bankName, account_number: accountNumber, account_name: accountName },
      });
      if (error) throw error;
      toast.success("Withdrawal request submitted! Awaiting approval.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Withdraw</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet?.available_balance ?? 0, profile.primary_currency)}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Amount ({profile.primary_currency})</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" required />
          </div>
          <div>
            <Label>Bank Name</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. First Bank" required />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" required />
          </div>
          <div>
            <Label>Account Name</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="John Doe" required />
          </div>
          <div>
            <Label>Transaction PIN</Label>
            <Input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : "Submit Withdrawal"}
          </Button>
        </form>
      </div>
    </div>
  );
}
