import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/transfer")({
  component: TransferPage,
});

function TransferPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || !profile) return;
    supabase.from("wallets").select("*").eq("user_id", user.id).eq("currency", profile.primary_currency).single().then(({ data }) => setWallet(data));
    supabase.from("beneficiaries").select("*").eq("user_id", user.id).then(({ data }) => setBeneficiaries(data ?? []));
  }, [user, profile]);

  if (!profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.pin_hash) { toast.error("Set up your transaction PIN first"); return; }
    if (pin.length !== 4) { toast.error("Enter your 4-digit PIN"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (wallet && amt > wallet.available_balance) { toast.error("Insufficient balance"); return; }

    setLoading(true);
    try {
      // Find recipient by account number or email
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("user_id, full_name, account_number")
        .or(`account_number.eq.${recipient},email.eq.${recipient}`)
        .single();

      if (!recipientProfile) { toast.error("Recipient not found"); setLoading(false); return; }
      if (recipientProfile.user_id === user!.id) { toast.error("Cannot transfer to yourself"); setLoading(false); return; }

      // Create outgoing transaction
      const { error: e1 } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "transfer_out" as const,
        amount: amt,
        currency: profile.primary_currency,
        description: description || `Transfer to ${recipientProfile.full_name}`,
        status: "completed" as const,
        recipient_id: recipientProfile.user_id,
      });
      if (e1) throw e1;

      // Create incoming transaction for recipient
      await supabase.from("transactions").insert({
        user_id: recipientProfile.user_id,
        type: "transfer_in" as const,
        amount: amt,
        currency: profile.primary_currency,
        description: `Transfer from ${profile.full_name}`,
        status: "completed" as const,
        recipient_id: user!.id,
      });

      toast.success(`Sent ${formatCurrency(amt, profile.primary_currency)} to ${recipientProfile.full_name}`);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Transfer</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet?.available_balance ?? 0, profile.primary_currency)}</p>
        </div>

        {beneficiaries.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">Saved Beneficiaries</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {beneficiaries.map((b) => (
                <button key={b.id} onClick={() => setRecipient(b.account_number || b.email || "")} className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/30">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Recipient (Account Number or Email)</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Account number or email" required />
          </div>
          <div>
            <Label>Amount ({profile.primary_currency})</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" required />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this for?" />
          </div>
          <div>
            <Label>Transaction PIN</Label>
            <Input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" required />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <Send className="h-4 w-4" />
            {loading ? "Sending..." : "Send Money"}
          </Button>
        </form>
      </div>
    </div>
  );
}
