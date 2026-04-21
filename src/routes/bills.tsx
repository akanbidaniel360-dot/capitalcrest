import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Receipt, Loader2, UserCheck, ShieldCheck, Zap, Wifi,
  Phone, Tv, Droplet, GraduationCap, Landmark, Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { TransactionReceipt, type ReceiptLine } from "@/components/transaction-receipt";
import { BILL_CATEGORIES, calcBillFee } from "@/lib/banking-data";
import { maskAccountNumber } from "@/lib/mask";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

const ICONS: Record<string, any> = {
  airtime: Phone, data: Smartphone, electricity: Zap, internet: Wifi,
  tv: Tv, water: Droplet, education: GraduationCap, tax: Landmark,
};

const FAKE_CUSTOMERS = [
  "John A. Smith", "Maria Rodriguez", "Chinedu Okafor", "Aisha Bello",
  "David Williams", "Emily Brown", "Mohammed Al-Hassan", "Sarah Johnson",
];

function deriveCustomer(acct: string) {
  if (!acct || acct.length < 6) return null;
  const sum = acct.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return FAKE_CUSTOMERS[sum % FAKE_CUSTOMERS.length];
}

function BillsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  const [categoryValue, setCategoryValue] = useState(BILL_CATEGORIES[0].value);
  const [provider, setProvider] = useState(BILL_CATEGORIES[0].providers[0]);
  const [accountNum, setAccountNum] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [receipt, setReceipt] = useState<null | {
    title: string; amount: number; reference: string; lines: ReceiptLine[]; note?: string;
  }>(null);

  const category = BILL_CATEGORIES.find((c) => c.value === categoryValue)!;
  const Icon = ICONS[categoryValue] || Receipt;

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || !profile) return;
    supabase.from("wallets").select("*").eq("user_id", user.id)
      .eq("currency", profile.primary_currency).maybeSingle()
      .then(({ data }) => setWallet(data));
  }, [user, profile]);

  useEffect(() => {
    setProvider(category.providers[0]);
    setVerified(null);
    setAccountNum("");
  }, [categoryValue]);

  useEffect(() => {
    setVerified(null);
    if (accountNum.length < 6 || !provider) return;
    setVerifying(true);
    const t = setTimeout(() => {
      setVerified(deriveCustomer(accountNum));
      setVerifying(false);
    }, 600);
    return () => clearTimeout(t);
  }, [accountNum, provider]);

  if (!profile) return null;

  const verifyPin = (p: string) => {
    if (!profile.pin_hash) { toast.error("Set up your transaction PIN in Settings first"); return false; }
    if (p.length !== 4) { toast.error("Enter your 4-digit PIN"); return false; }
    if (btoa(p) !== profile.pin_hash) { toast.error("Incorrect PIN"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPin(pin)) return;
    if (!verified) { toast.error("Customer details could not be verified"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const fee = calcBillFee(amt);
    const total = amt + fee;
    if (wallet && total > Number(wallet.available_balance)) { toast.error("Insufficient balance"); return; }

    setLoading(true);
    try {
      await supabase.from("bill_payments").insert({
        user_id: user!.id,
        category: category.value,
        provider,
        account_number: accountNum,
        amount: amt,
        status: "completed" as const,
      });
      const { data, error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "bill_payment" as const,
        amount: total,
        currency: profile.primary_currency,
        description: `${category.label} — ${provider}`,
        status: "completed" as const,
        metadata: {
          category: category.value, provider,
          customer_name: verified, customer_account: accountNum,
          fee,
        },
      }).select().single();
      if (error) throw error;

      setReceipt({
        title: `${category.label} Payment`,
        amount: total,
        reference: data?.reference || data?.id || "—",
        lines: [
          { label: "From", value: `${profile.full_name} · ${maskAccountNumber(profile.account_number)}` },
          { label: "Provider", value: provider },
          { label: "Customer", value: verified },
          { label: category.accountLabel, value: accountNum },
          { label: "Amount", value: formatCurrency(amt, profile.primary_currency) },
          { label: "Service Fee", value: formatCurrency(fee, profile.primary_currency) },
          { label: "Status", value: "Completed" },
        ],
        note: `Token / receipt for this ${category.label.toLowerCase()} will be sent via SMS / email shortly.`,
      });
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const amt = parseFloat(amount) || 0;
  const fee = calcBillFee(amt);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Pay Bills</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(wallet?.available_balance ?? 0, profile.primary_currency)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">From {maskAccountNumber(profile.account_number)}</p>
        </div>

        {/* Category grid */}
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Choose Service</p>
          <div className="grid grid-cols-4 gap-2">
            {BILL_CATEGORIES.map((c) => {
              const I = ICONS[c.value] || Receipt;
              const active = c.value === categoryValue;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategoryValue(c.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  <I className="h-4 w-4" />
                  <span className="text-[10px] font-medium leading-tight text-center">{c.label.split(" / ")[0].split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{category.label}</p>
                <p className="text-[10px] text-muted-foreground">Pay your {category.label.toLowerCase()} bill</p>
              </div>
            </div>
            <div>
              <Label>Service Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {category.providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{category.accountLabel}</Label>
              <Input value={accountNum} onChange={(e) => setAccountNum(e.target.value)} placeholder={category.accountPlaceholder} required />
              {verifying && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up customer…
                </div>
              )}
              {!verifying && verified && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald/10 px-3 py-2 text-xs text-emerald">
                  <UserCheck className="h-3.5 w-3.5" /> <span className="font-semibold">{verified}</span>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount</p>
            <div>
              <Label>Amount ({profile.primary_currency})</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" required />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {category.presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/5"
                >
                  {formatCurrency(p, profile.primary_currency)}
                </button>
              ))}
            </div>
            {amt > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Bill amount</span><span className="text-foreground">{formatCurrency(amt, profile.primary_currency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Convenience fee</span><span className="text-foreground">{formatCurrency(fee, profile.primary_currency)}</span></div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold"><span className="text-foreground">Total debit</span><span className="text-foreground">{formatCurrency(amt + fee, profile.primary_currency)}</span></div>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Authorize</p>
            <div>
              <Label>Transaction PIN</Label>
              <Input type="password" maxLength={4} value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" required />
            </div>
            <div className="flex gap-2 rounded-lg bg-primary/5 p-2 text-[11px] text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>Payment is processed instantly. A digital receipt will be issued.</span>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading || !verified}>
              <Receipt className="h-4 w-4" />
              {loading ? "Processing…" : `Pay ${amt > 0 ? formatCurrency(amt + fee, profile.primary_currency) : "Bill"}`}
            </Button>
          </section>
        </form>
      </div>

      {receipt && (
        <TransactionReceipt
          open={!!receipt}
          onClose={() => { setReceipt(null); navigate({ to: "/dashboard" }); }}
          title={receipt.title}
          amount={receipt.amount}
          currency={profile.primary_currency}
          reference={receipt.reference}
          lines={receipt.lines}
          note={receipt.note}
        />
      )}
    </div>
  );
}
