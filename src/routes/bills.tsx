import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

const BILL_CATEGORIES = [
  { value: "airtime", label: "Airtime" },
  { value: "electricity", label: "Electricity" },
  { value: "internet", label: "Internet" },
];

function BillsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("airtime");
  const [provider, setProvider] = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [amount, setAmount] = useState("");
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
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (wallet && amt > wallet.available_balance) { toast.error("Insufficient balance"); return; }

    setLoading(true);
    try {
      await supabase.from("bill_payments").insert({
        user_id: user!.id,
        category,
        provider,
        account_number: accountNum,
        amount: amt,
        status: "completed" as const,
      });
      await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "bill_payment" as const,
        amount: amt,
        currency: profile.primary_currency,
        description: `${category} - ${provider}`,
        status: "completed" as const,
      });
      toast.success("Bill paid successfully!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Pay Bills</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet?.available_balance ?? 0, profile.primary_currency)}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BILL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Provider</Label>
            <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. MTN, DSTV" required />
          </div>
          <div>
            <Label>Account / Phone Number</Label>
            <Input value={accountNum} onChange={(e) => setAccountNum(e.target.value)} placeholder="Enter number" required />
          </div>
          <div>
            <Label>Amount ({profile.primary_currency})</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" required />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <Receipt className="h-4 w-4" />
            {loading ? "Processing..." : "Pay Bill"}
          </Button>
        </form>
      </div>
    </div>
  );
}
