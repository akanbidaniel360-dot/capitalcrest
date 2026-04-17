import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowDownUp, Repeat } from "lucide-react";
import { toast } from "sonner";
import { CURRENCIES, formatCurrency, CONVERSION_FEE_RATE } from "@/lib/currency";

export const Route = createFileRoute("/convert")({
  component: ConvertPage,
});

function ConvertPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: w }, { data: r }] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id),
        supabase.from("exchange_rates").select("*"),
      ]);
      setWallets(w ?? []);
      setRates(r ?? []);
      if (w && w.length > 0) setFrom(w[0].currency);
      setTo(profile?.primary_currency === (w?.[0]?.currency ?? "USD") ? "EUR" : (profile?.primary_currency ?? "USD"));
    })();
  }, [user, profile]);

  const fromWallet = useMemo(() => wallets.find((w) => w.currency === from), [wallets, from]);

  const rate = useMemo(() => {
    if (!from || !to || from === to) return 1;
    const r = rates.find((x) => x.from_currency === from && x.to_currency === to);
    if (r) return Number(r.rate);
    // try inverse
    const inv = rates.find((x) => x.from_currency === to && x.to_currency === from);
    if (inv) return 1 / Number(inv.rate);
    return 0;
  }, [rates, from, to]);

  const amt = parseFloat(amount) || 0;
  const fee = amt * rate * CONVERSION_FEE_RATE;
  const received = amt * rate - fee;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleConvert = async () => {
    if (!user || !fromWallet) return;
    if (from === to) { toast.error("Pick two different currencies"); return; }
    if (rate <= 0) { toast.error("No exchange rate available for this pair"); return; }
    if (amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > Number(fromWallet.available_balance)) { toast.error("Insufficient balance"); return; }

    setBusy(true);
    try {
      // Debit source wallet
      const { error: e1 } = await supabase.from("wallets")
        .update({ available_balance: Number(fromWallet.available_balance) - amt })
        .eq("id", fromWallet.id);
      if (e1) throw e1;

      // Credit destination wallet (create if missing)
      let toWallet = wallets.find((w) => w.currency === to);
      if (!toWallet) {
        const { data: created, error: e2 } = await supabase.from("wallets")
          .insert({ user_id: user.id, currency: to, available_balance: received, pending_balance: 0 })
          .select().single();
        if (e2) throw e2;
        toWallet = created;
      } else {
        const { error: e3 } = await supabase.from("wallets")
          .update({ available_balance: Number(toWallet.available_balance) + received })
          .eq("id", toWallet.id);
        if (e3) throw e3;
      }

      // Audit transactions
      await supabase.from("transactions").insert([
        {
          user_id: user.id,
          type: "currency_conversion" as any,
          amount: amt,
          currency: from,
          description: `Convert ${from} → ${to} @ ${rate.toFixed(4)}`,
          status: "completed" as any,
          metadata: { from, to, rate, fee, received },
        },
      ]);

      toast.success(`Converted ${formatCurrency(amt, from)} → ${formatCurrency(received, to)}`);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Convert Currency</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-4">
          <Repeat className="h-7 w-7 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Swap between currencies</p>
            <p className="text-xs text-muted-foreground">Live rates • {(CONVERSION_FEE_RATE * 100).toFixed(1)}% conversion fee</p>
          </div>
        </div>

        {/* From */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <Label className="text-xs text-muted-foreground">From</Label>
          <div className="mt-2 flex gap-2">
            <Input
              type="number" inputMode="decimal" placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="text-xl font-semibold"
            />
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.currency} value={w.currency}>{w.currency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Available: {fromWallet ? formatCurrency(Number(fromWallet.available_balance), fromWallet.currency) : "—"}
          </p>
        </div>

        <div className="flex justify-center">
          <Button variant="outline" size="icon" onClick={swap} className="rounded-full">
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        {/* To */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <Label className="text-xs text-muted-foreground">To</Label>
          <div className="mt-2 flex gap-2">
            <div className="flex h-10 flex-1 items-center rounded-md border border-input bg-background px-3 text-xl font-semibold text-foreground">
              {received > 0 ? received.toFixed(2) : "0.00"}
            </div>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Rate: 1 {from || "—"} = {rate ? rate.toFixed(4) : "—"} {to || "—"}
          </p>
        </div>

        {amt > 0 && rate > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>Amount</span><span>{formatCurrency(amt, from)}</span></div>
            <div className="flex justify-between"><span>Fee ({(CONVERSION_FEE_RATE * 100).toFixed(1)}%)</span><span>−{fee.toFixed(2)} {to}</span></div>
            <div className="flex justify-between font-semibold text-foreground"><span>You receive</span><span>{formatCurrency(received, to)}</span></div>
          </div>
        )}

        <Button className="w-full" onClick={handleConvert} disabled={busy || amt <= 0 || from === to || rate <= 0}>
          {busy ? "Converting..." : "Swap now"}
        </Button>
      </div>
    </div>
  );
}
