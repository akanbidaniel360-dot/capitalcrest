import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Send, Globe, Building2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { maskAccountNumber } from "@/lib/mask";

export const Route = createFileRoute("/transfer")({
  component: TransferPage,
});

const INTL_FEE_RATE = 0.01; // 1%

function TransferPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);

  // local
  const [lAcct, setLAcct] = useState("");
  const [lBank, setLBank] = useState("");
  const [lAmount, setLAmount] = useState("");
  const [lDesc, setLDesc] = useState("");
  const [lPin, setLPin] = useState("");
  const [lLoading, setLLoading] = useState(false);

  // intl
  const [iAcct, setIAcct] = useState("");
  const [iBank, setIBank] = useState("");
  const [iSwift, setISwift] = useState("");
  const [iCountry, setICountry] = useState("");
  const [iAmount, setIAmount] = useState("");
  const [iDesc, setIDesc] = useState("");
  const [iPin, setIPin] = useState("");
  const [iLoading, setILoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || !profile) return;
    supabase.from("wallets").select("*").eq("user_id", user.id).eq("currency", profile.primary_currency).maybeSingle().then(({ data }) => setWallet(data));
  }, [user, profile]);

  if (!profile) return null;

  const verifyPin = (pin: string) => {
    if (!profile.pin_hash) { toast.error("Set up your transaction PIN in Settings first"); return false; }
    if (pin.length !== 4) { toast.error("Enter your 4-digit PIN"); return false; }
    if (btoa(pin) !== profile.pin_hash) { toast.error("Incorrect PIN"); return false; }
    return true;
  };

  const handleLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPin(lPin)) return;
    if (!lAcct.trim() || !lBank.trim()) { toast.error("Account number and bank name are required"); return; }
    const amt = parseFloat(lAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!wallet || amt > Number(wallet.available_balance)) { toast.error("Insufficient balance"); return; }

    setLLoading(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "transfer_out" as const,
        amount: amt,
        currency: profile.primary_currency,
        description: lDesc || `Local transfer to ${lBank}`,
        status: "completed" as const,
        metadata: {
          transfer_type: "local",
          recipient_account: lAcct,
          recipient_bank: lBank,
        },
      });
      if (error) throw error;
      toast.success(`Sent ${formatCurrency(amt, profile.primary_currency)} to ${lBank}`);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setLLoading(false);
    }
  };

  const handleIntl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPin(iPin)) return;
    if (!iAcct.trim() || !iBank.trim() || !iCountry.trim()) { toast.error("Account, bank and country are required"); return; }
    const amt = parseFloat(iAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const fee = amt * INTL_FEE_RATE;
    const total = amt + fee;
    if (!wallet || total > Number(wallet.available_balance)) { toast.error(`Insufficient balance (need ${formatCurrency(total, profile.primary_currency)} incl. fee)`); return; }

    setILoading(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "transfer_out" as const,
        amount: total,
        currency: profile.primary_currency,
        description: iDesc || `International transfer to ${iBank} (${iCountry})`,
        status: "completed" as const,
        metadata: {
          transfer_type: "international",
          recipient_account: iAcct,
          recipient_bank: iBank,
          swift_code: iSwift || null,
          country: iCountry,
          fee,
          fee_rate: INTL_FEE_RATE,
        },
      });
      if (error) throw error;
      toast.success(`Sent ${formatCurrency(amt, profile.primary_currency)} internationally (+${formatCurrency(fee, profile.primary_currency)} fee)`);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setILoading(false);
    }
  };

  const balance = Number(wallet?.available_balance ?? 0);
  const intlAmt = parseFloat(iAmount) || 0;
  const intlFee = intlAmt * INTL_FEE_RATE;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Send Money</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(balance, profile.primary_currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">From {maskAccountNumber(profile.account_number)}</p>
        </div>

        <Tabs defaultValue="local">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local"><Building2 className="mr-2 h-4 w-4" /> Local</TabsTrigger>
            <TabsTrigger value="intl"><Globe className="mr-2 h-4 w-4" /> International</TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="mt-4">
            <form onSubmit={handleLocal} className="space-y-3">
              <div>
                <Label>Account Number</Label>
                <Input value={lAcct} onChange={(e) => setLAcct(e.target.value)} placeholder="0123456789" required />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input value={lBank} onChange={(e) => setLBank(e.target.value)} placeholder="e.g. GTBank, Chase, Barclays" required />
              </div>
              <div>
                <Label>Amount ({profile.primary_currency})</Label>
                <Input type="number" placeholder="0.00" value={lAmount} onChange={(e) => setLAmount(e.target.value)} min="0" step="0.01" required />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input value={lDesc} onChange={(e) => setLDesc(e.target.value)} placeholder="What's this for?" />
              </div>
              <div>
                <Label>Transaction PIN</Label>
                <Input type="password" maxLength={4} value={lPin} onChange={(e) => setLPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={lLoading}>
                <Send className="h-4 w-4" />
                {lLoading ? "Sending..." : "Send Local Transfer"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="intl" className="mt-4">
            <form onSubmit={handleIntl} className="space-y-3">
              <div>
                <Label>Account Number / IBAN</Label>
                <Input value={iAcct} onChange={(e) => setIAcct(e.target.value)} placeholder="GB29 NWBK 6016 1331 9268 19" required />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input value={iBank} onChange={(e) => setIBank(e.target.value)} placeholder="Recipient bank" required />
              </div>
              <div>
                <Label>SWIFT / BIC Code <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={iSwift} onChange={(e) => setISwift(e.target.value.toUpperCase())} placeholder="NWBKGB2L" maxLength={11} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={iCountry} onChange={(e) => setICountry(e.target.value)} placeholder="e.g. United Kingdom" required />
              </div>
              <div>
                <Label>Amount ({profile.primary_currency})</Label>
                <Input type="number" placeholder="0.00" value={iAmount} onChange={(e) => setIAmount(e.target.value)} min="0" step="0.01" required />
              </div>
              {intlAmt > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="text-foreground">{formatCurrency(intlAmt, profile.primary_currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">International fee (1%)</span><span className="text-foreground">{formatCurrency(intlFee, profile.primary_currency)}</span></div>
                  <div className="flex justify-between font-semibold"><span className="text-foreground">Total debit</span><span className="text-foreground">{formatCurrency(intlAmt + intlFee, profile.primary_currency)}</span></div>
                </div>
              )}
              <div>
                <Label>Description (optional)</Label>
                <Input value={iDesc} onChange={(e) => setIDesc(e.target.value)} placeholder="What's this for?" />
              </div>
              <div>
                <Label>Transaction PIN</Label>
                <Input type="password" maxLength={4} value={iPin} onChange={(e) => setIPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={iLoading}>
                <Globe className="h-4 w-4" />
                {iLoading ? "Sending..." : "Send International Transfer"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
