import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowDownLeft, Copy, AlertTriangle, Bitcoin, Building2 } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/deposit")({
  component: DepositPage,
});

const USDT_WALLET = "0x56eeb7f7bfab320389b5a1a2666dd290e7cbc645";

function DepositPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  // Bank tab
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  // Crypto tab
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [cryptoLoading, setCryptoLoading] = useState(false);

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
      toast.success("Deposit submitted — your transaction will be verified shortly.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit deposit");
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(cryptoAmount);
    if (!amt || amt <= 0) { toast.error("Enter the USDT amount you sent"); return; }
    if (amt < 100) { toast.error("Minimum crypto deposit is $100 USDT"); return; }
    if (!txHash || txHash.length < 10) { toast.error("Enter a valid transaction hash"); return; }
    setCryptoLoading(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "crypto_deposit" as any,
        amount: amt,
        currency: profile.primary_currency,
        description: "Crypto deposit (USDT-ERC20)",
        status: "pending" as const,
        reference: txHash,
        metadata: { method: "crypto", network: "ERC20", asset: "USDT", wallet: USDT_WALLET, tx_hash: txHash },
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: user!.id,
        type: "deposit" as any,
        title: "Crypto deposit submitted",
        message: `Your USDT deposit of ${amt.toFixed(2)} will be verified shortly.`,
      });
      toast.success("Crypto deposit submitted — it will be verified shortly.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit crypto deposit");
    } finally {
      setCryptoLoading(false);
    }
  };

  const copyWallet = () => {
    navigator.clipboard.writeText(USDT_WALLET);
    toast.success("Wallet address copied");
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
            <p className="text-sm text-muted-foreground">Funds available after admin verification</p>
          </div>
        </div>

        <Tabs defaultValue="bank">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank"><Building2 className="mr-2 h-4 w-4" /> Bank / Card</TabsTrigger>
            <TabsTrigger value="crypto"><Bitcoin className="mr-2 h-4 w-4" /> Crypto</TabsTrigger>
          </TabsList>

          <TabsContent value="bank" className="mt-4">
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
          </TabsContent>

          <TabsContent value="crypto" className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">USDT • Ethereum (ERC-20)</p>
                  <p className="text-xs text-muted-foreground">Send only USDT on the Ethereum network</p>
                </div>
                <div className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald">USDT</div>
              </div>

              <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
                <QRCodeSVG value={USDT_WALLET} size={180} level="M" />
              </div>

              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Wallet Address</Label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
                  <code className="flex-1 break-all text-xs text-foreground">{USDT_WALLET}</code>
                  <Button type="button" size="icon" variant="ghost" onClick={copyWallet} className="h-7 w-7">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 rounded-lg border border-chart-4/30 bg-chart-4/5 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-chart-4" />
                <p className="text-[11px] leading-relaxed text-foreground">
                  <strong>Important:</strong> Only send USDT on the <strong>Ethereum (ERC-20)</strong> network. Minimum deposit: <strong>$100</strong>. Funds are credited automatically — no admin approval required.
                </p>
              </div>
            </div>

            <form onSubmit={handleCryptoSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">Confirm your transfer</p>
              <div>
                <Label>Amount sent (USDT) — min $100</Label>
                <Input type="number" placeholder="100.00" value={cryptoAmount} onChange={(e) => setCryptoAmount(e.target.value)} min="100" step="0.01" required />
              </div>
              <div>
                <Label>Transaction Hash</Label>
                <Input placeholder="0x..." value={txHash} onChange={(e) => setTxHash(e.target.value)} required />
                <p className="mt-1 text-[10px] text-muted-foreground">Find this on Etherscan after sending</p>
              </div>
              <Button type="submit" className="w-full" disabled={cryptoLoading}>
                {cryptoLoading ? "Submitting..." : "I have sent the USDT"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
