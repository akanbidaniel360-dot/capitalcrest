import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Send, Globe, Building2, ShieldCheck, UserCheck,
  Loader2, Info, BookmarkPlus, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, convertWithRates } from "@/lib/currency";
import { maskAccountNumber } from "@/lib/mask";
import { TransactionReceipt, type ReceiptLine } from "@/components/transaction-receipt";
import { LOCAL_BANKS, COUNTRIES_INTL, TRANSFER_PURPOSES } from "@/lib/banking-data";

export const Route = createFileRoute("/transfer")({
  component: TransferPage,
});

const INTL_FEE_RATE = 0.01; // 1%
const LOCAL_FEE_FLAT = 0.5;

const FAKE_NAMES = [
  "John A. Smith", "Maria Rodriguez", "Chinedu Okafor", "Aisha Bello",
  "David Williams", "Emily Brown", "Mohammed Al-Hassan", "Sarah Johnson",
  "Oluwaseun Adebayo", "Priya Patel", "James O'Connor", "Fatima Yusuf",
];

function deriveRecipientName(acct: string) {
  if (!acct || acct.replace(/\D/g, "").length < 6) return null;
  const digits = acct.replace(/\D/g, "");
  const sum = digits.split("").reduce((s, d) => s + parseInt(d), 0);
  return FAKE_NAMES[sum % FAKE_NAMES.length];
}

function TransferPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [receipt, setReceipt] = useState<null | {
    title: string; amount: number; reference: string; lines: ReceiptLine[]; note?: string;
  }>(null);

  // Local
  const [lAcct, setLAcct] = useState("");
  const [lBank, setLBank] = useState("");
  const [lAmount, setLAmount] = useState("");
  const [lPurpose, setLPurpose] = useState(TRANSFER_PURPOSES[0]);
  const [lDesc, setLDesc] = useState("");
  const [lPin, setLPin] = useState("");
  const [lSaveBen, setLSaveBen] = useState(false);
  const [lLoading, setLLoading] = useState(false);
  const [lVerifying, setLVerifying] = useState(false);
  const [lVerified, setLVerified] = useState<string | null>(null);

  // Intl
  const [iAcct, setIAcct] = useState("");
  const [iBank, setIBank] = useState("");
  const [iSwift, setISwift] = useState("");
  const [iCountry, setICountry] = useState(COUNTRIES_INTL[0].code);
  const [iRecipientName, setIRecipientName] = useState("");
  const [iRecipientAddr, setIRecipientAddr] = useState("");
  const [iAmount, setIAmount] = useState("");
  const [iPurpose, setIPurpose] = useState(TRANSFER_PURPOSES[0]);
  const [iDesc, setIDesc] = useState("");
  const [iPin, setIPin] = useState("");
  const [iLoading, setILoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || !profile) return;
    supabase.from("wallets").select("*").eq("user_id", user.id)
      .then(({ data }) => setWallets(data ?? []));
    supabase.from("exchange_rates").select("*")
      .then(({ data }) => setRates(data ?? []));
  }, [user, profile]);

  // auto verify local recipient
  useEffect(() => {
    setLVerified(null);
    if (lAcct.replace(/\D/g, "").length < 10 || !lBank) return;
    setLVerifying(true);
    const t = setTimeout(() => {
      const name = deriveRecipientName(lAcct);
      setLVerified(name);
      setLVerifying(false);
    }, 700);
    return () => clearTimeout(t);
  }, [lAcct, lBank]);

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
    if (!lAcct.trim() || !lBank.trim()) { toast.error("Account number and bank are required"); return; }
    if (!lVerified) { toast.error("Recipient could not be verified — check the account details"); return; }
    const amt = parseFloat(lAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const total = amt + LOCAL_FEE_FLAT;
    if (total > balance) {
      toast.error(`Insufficient balance (need ${formatCurrency(total, profile.primary_currency)} incl. fee)`);
      return;
    }

    setLLoading(true);
    try {
      const { data, error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "transfer_out" as const,
        amount: total,
        currency: profile.primary_currency,
        description: lDesc || `${lPurpose} — ${lVerified}`,
        status: "completed" as const,
        metadata: {
          transfer_type: "local",
          recipient_name: lVerified,
          recipient_account: lAcct,
          recipient_bank: lBank,
          purpose: lPurpose,
          fee: LOCAL_FEE_FLAT,
        },
      }).select().single();
      if (error) throw error;

      if (lSaveBen) {
        await supabase.from("beneficiaries").insert({
          user_id: user!.id,
          name: lVerified,
          account_number: lAcct,
          bank_name: lBank,
        });
      }

      setReceipt({
        title: "Local Transfer Sent",
        amount: total,
        reference: data?.reference || data?.id || "—",
        lines: [
          { label: "From", value: `${profile.full_name} · ${maskAccountNumber(profile.account_number)}` },
          { label: "Recipient", value: lVerified },
          { label: "Account", value: lAcct },
          { label: "Bank", value: lBank },
          { label: "Purpose", value: lPurpose },
          { label: "Amount", value: formatCurrency(amt, profile.primary_currency) },
          { label: "Transfer Fee", value: formatCurrency(LOCAL_FEE_FLAT, profile.primary_currency) },
          { label: "Status", value: "Completed" },
        ],
        note: "Funds have been credited to the recipient account.",
      });
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setLLoading(false);
    }
  };

  const handleIntl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPin(iPin)) return;
    if (!iAcct.trim() || !iBank.trim() || !iSwift.trim()) {
      toast.error("Account, bank and SWIFT/BIC are required"); return;
    }
    if (!iRecipientName.trim() || !iRecipientAddr.trim()) {
      toast.error("Recipient name and address are required"); return;
    }
    const amt = parseFloat(iAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const fee = amt * INTL_FEE_RATE;
    const total = amt + fee;
    if (total > balance) {
      toast.error(`Insufficient balance (need ${formatCurrency(total, profile.primary_currency)} incl. fee)`);
      return;
    }

    setILoading(true);
    try {
      const country = COUNTRIES_INTL.find((c) => c.code === iCountry);
      const { data, error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "transfer_out" as const,
        amount: total,
        currency: profile.primary_currency,
        description: iDesc || `Intl transfer to ${iRecipientName} (${country?.name})`,
        status: "completed" as const,
        metadata: {
          transfer_type: "international",
          recipient_name: iRecipientName,
          recipient_address: iRecipientAddr,
          recipient_account: iAcct,
          recipient_bank: iBank,
          swift_code: iSwift,
          country: country?.name,
          country_code: country?.code,
          purpose: iPurpose,
          fee, fee_rate: INTL_FEE_RATE,
        },
      }).select().single();
      if (error) throw error;

      setReceipt({
        title: "International Transfer Sent",
        amount: total,
        reference: data?.reference || data?.id || "—",
        lines: [
          { label: "From", value: `${profile.full_name} · ${maskAccountNumber(profile.account_number)}` },
          { label: "Recipient", value: iRecipientName },
          { label: "Address", value: iRecipientAddr },
          { label: "Account / IBAN", value: iAcct },
          { label: "Bank", value: iBank },
          { label: "SWIFT / BIC", value: iSwift },
          { label: "Country", value: country?.name || iCountry },
          { label: "Purpose", value: iPurpose },
          { label: "Amount", value: formatCurrency(amt, profile.primary_currency) },
          { label: "Fee (1%)", value: formatCurrency(fee, profile.primary_currency) },
          { label: "Status", value: "Completed" },
        ],
        note: "International transfers settle in 1–3 business days.",
      });
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setILoading(false);
    }
  };

  // Aggregate every wallet, converted into the user's primary currency,
  // so the displayed available balance matches the Dashboard total.
  const balance = wallets.reduce(
    (sum, w) => sum + convertWithRates(Number(w.available_balance) || 0, w.currency, profile.primary_currency, rates),
    0,
  );
  const lAmt = parseFloat(lAmount) || 0;
  const intlAmt = parseFloat(iAmount) || 0;
  const intlFee = intlAmt * INTL_FEE_RATE;

  const dailyLimit = useMemo(() => 50000, []);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Send Money</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        {/* Source account summary */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs opacity-80">Sending from</p>
            <button onClick={() => setShowBalance(!showBalance)} className="opacity-70 hover:opacity-100">
              {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="mt-1 text-sm font-semibold">{profile.full_name}</p>
          <p className="font-mono text-xs opacity-90">{maskAccountNumber(profile.account_number)}</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] opacity-70">Available Balance</p>
              <p className="text-xl font-bold">
                {showBalance ? formatCurrency(balance, profile.primary_currency) : "•••••"}
              </p>
            </div>
            <p className="text-[10px] opacity-70">Daily limit: {formatCurrency(dailyLimit, profile.primary_currency)}</p>
          </div>
        </div>

        <Tabs defaultValue="local">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local"><Building2 className="mr-2 h-4 w-4" /> Local</TabsTrigger>
            <TabsTrigger value="intl"><Globe className="mr-2 h-4 w-4" /> International</TabsTrigger>
          </TabsList>

          {/* LOCAL */}
          <TabsContent value="local" className="mt-4">
            <form onSubmit={handleLocal} className="space-y-4">
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">1. Recipient Bank</p>
                <div>
                  <Label>Bank Name</Label>
                  <Select value={lBank} onValueChange={setLBank}>
                    <SelectTrigger><SelectValue placeholder="Select recipient bank" /></SelectTrigger>
                    <SelectContent>
                      {LOCAL_BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={lAcct}
                    onChange={(e) => setLAcct(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="0123456789"
                    inputMode="numeric"
                    required
                  />
                  {/* Verification banner */}
                  {lVerifying && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying account…
                    </div>
                  )}
                  {!lVerifying && lVerified && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald/10 px-3 py-2 text-xs text-emerald">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span className="font-semibold">{lVerified}</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">2. Amount & Purpose</p>
                <div>
                  <Label>Amount ({profile.primary_currency})</Label>
                  <Input type="number" placeholder="0.00" value={lAmount}
                    onChange={(e) => setLAmount(e.target.value)} min="0" step="0.01" required />
                </div>
                <div>
                  <Label>Purpose of Transfer</Label>
                  <Select value={lPurpose} onValueChange={setLPurpose}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSFER_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Narration (optional)</Label>
                  <Input value={lDesc} onChange={(e) => setLDesc(e.target.value)} placeholder="Note appearing on statement" maxLength={80} />
                </div>
                {lAmt > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="text-foreground">{formatCurrency(lAmt, profile.primary_currency)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Transfer fee</span><span className="text-foreground">{formatCurrency(LOCAL_FEE_FLAT, profile.primary_currency)}</span></div>
                    <div className="flex justify-between border-t border-border pt-1 font-semibold"><span className="text-foreground">Total debit</span><span className="text-foreground">{formatCurrency(lAmt + LOCAL_FEE_FLAT, profile.primary_currency)}</span></div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" checked={lSaveBen} onChange={(e) => setLSaveBen(e.target.checked)} className="h-4 w-4 accent-primary" />
                  <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground" /> Save as beneficiary
                </label>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">3. Authorize</p>
                <div>
                  <Label>Transaction PIN</Label>
                  <Input type="password" maxLength={4} value={lPin}
                    onChange={(e) => setLPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" required />
                </div>
                <div className="flex gap-2 rounded-lg bg-primary/5 p-2 text-[11px] text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Your transaction is encrypted end-to-end and protected by bank-grade security.</span>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={lLoading || !lVerified}>
                  <Send className="h-4 w-4" />
                  {lLoading ? "Sending…" : `Send ${lAmt > 0 ? formatCurrency(lAmt, profile.primary_currency) : "Money"}`}
                </Button>
              </section>
            </form>
          </TabsContent>

          {/* INTL */}
          <TabsContent value="intl" className="mt-4">
            <form onSubmit={handleIntl} className="space-y-4">
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">1. Recipient Details</p>
                <div>
                  <Label>Recipient Full Name</Label>
                  <Input value={iRecipientName} onChange={(e) => setIRecipientName(e.target.value)} placeholder="As on bank account" required />
                </div>
                <div>
                  <Label>Recipient Address</Label>
                  <Textarea value={iRecipientAddr} onChange={(e) => setIRecipientAddr(e.target.value)} placeholder="Street, City, ZIP" rows={2} required />
                </div>
                <div>
                  <Label>Country</Label>
                  <Select value={iCountry} onValueChange={setICountry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES_INTL.map((c) => <SelectItem key={c.code} value={c.code}>{c.name} ({c.currency})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">2. Bank Details</p>
                <div>
                  <Label>Bank Name</Label>
                  <Input value={iBank} onChange={(e) => setIBank(e.target.value)} placeholder="Recipient bank" required />
                </div>
                <div>
                  <Label>Account Number / IBAN</Label>
                  <Input value={iAcct} onChange={(e) => setIAcct(e.target.value.toUpperCase())} placeholder="GB29 NWBK 6016 1331 9268 19" required />
                </div>
                <div>
                  <Label>SWIFT / BIC Code</Label>
                  <Input value={iSwift} onChange={(e) => setISwift(e.target.value.toUpperCase())} placeholder="NWBKGB2L" maxLength={11} required />
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">3. Amount & Purpose</p>
                <div>
                  <Label>Amount ({profile.primary_currency})</Label>
                  <Input type="number" placeholder="0.00" value={iAmount} onChange={(e) => setIAmount(e.target.value)} min="0" step="0.01" required />
                </div>
                <div>
                  <Label>Purpose of Transfer</Label>
                  <Select value={iPurpose} onValueChange={setIPurpose}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSFER_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reference / Note (optional)</Label>
                  <Input value={iDesc} onChange={(e) => setIDesc(e.target.value)} placeholder="Invoice #, message, etc." maxLength={80} />
                </div>
                {intlAmt > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="text-foreground">{formatCurrency(intlAmt, profile.primary_currency)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">International fee (1%)</span><span className="text-foreground">{formatCurrency(intlFee, profile.primary_currency)}</span></div>
                    <div className="flex justify-between border-t border-border pt-1 font-semibold"><span className="text-foreground">Total debit</span><span className="text-foreground">{formatCurrency(intlAmt + intlFee, profile.primary_currency)}</span></div>
                  </div>
                )}
                <div className="flex gap-2 rounded-lg border border-chart-4/30 bg-chart-4/5 p-2 text-[11px] text-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0 text-chart-4" />
                  <span>International transfers typically settle in 1–3 business days. Recipient bank may apply local charges.</span>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">4. Authorize</p>
                <div>
                  <Label>Transaction PIN</Label>
                  <Input type="password" maxLength={4} value={iPin}
                    onChange={(e) => setIPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" required />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={iLoading}>
                  <Globe className="h-4 w-4" />
                  {iLoading ? "Sending…" : `Send ${intlAmt > 0 ? formatCurrency(intlAmt, profile.primary_currency) : "Money"}`}
                </Button>
              </section>
            </form>
          </TabsContent>
        </Tabs>
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
