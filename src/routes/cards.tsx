import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, CreditCard, Snowflake, Globe, ShoppingCart, ChevronRight, ChevronLeft,
  ShieldCheck, Truck, Wifi, CheckCircle2, Eye, EyeOff, Copy,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { CARD_TIERS, CARD_TYPES } from "@/lib/banking-data";

export const Route = createFileRoute("/cards")({
  component: CardsPage,
});

const STEPS = ["Card Type", "Personal", "Delivery", "Review"] as const;

function CardsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // Step 1
  const [tier, setTier] = useState<typeof CARD_TIERS[number]["value"]>("standard");
  const [cardType, setCardType] = useState<typeof CARD_TYPES[number]["value"]>("virtual");
  const [pinMode, setPinMode] = useState("");

  // Step 2
  const [holderName, setHolderName] = useState(profile?.full_name || "");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3 — delivery
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // Step 4
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (profile) setHolderName(profile.full_name);
  }, [profile]);

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.from("cards").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setCards(data ?? []);
  };

  useEffect(() => { reload(); }, [user]);

  if (!profile) return null;

  const tierData = CARD_TIERS.find((t) => t.value === tier)!;

  const reset = () => {
    setStep(0); setTier("standard"); setCardType("virtual"); setPinMode("");
    setDob(""); setPhone("");
    setAddrLine1(""); setAddrLine2(""); setCity(""); setState(""); setZip("");
    setAgree(false);
  };

  const validateStep = () => {
    if (step === 0) {
      if (!pinMode || pinMode.length !== 4) { toast.error("Set a 4-digit card PIN"); return false; }
    }
    if (step === 1) {
      if (!holderName.trim()) { toast.error("Card holder name is required"); return false; }
      if (!dob) { toast.error("Date of birth is required"); return false; }
      if (!phone.trim()) { toast.error("Phone number is required"); return false; }
    }
    if (step === 2 && cardType === "physical") {
      if (!addrLine1.trim() || !city.trim() || !zip.trim()) {
        toast.error("Complete delivery address"); return false;
      }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(Math.min(step + 1, STEPS.length - 1)); };
  const back = () => setStep(Math.max(step - 1, 0));

  const submit = async () => {
    if (profile.kyc_status !== "verified") { toast.error("Complete KYC verification first"); return; }
    if (!agree) { toast.error("You must accept the cardholder agreement"); return; }
    setLoading(true);
    try {
      const cardNum = "4" + Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join("");
      const cvv = String(Math.floor(Math.random() * 900) + 100);
      const expMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
      const expYear = String(new Date().getFullYear() + 4).slice(-2);

      const { error } = await supabase.from("cards").insert({
        user_id: user!.id,
        card_number: cardNum,
        card_holder: holderName,
        expiry_date: `${expMonth}/${expYear}`,
        cvv,
        spending_limit: tierData.spendingLimit,
        status: "pending" as const,
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: user!.id,
        type: "card" as any,
        title: "Card application received",
        message: `Your ${tierData.label} ${cardType === "virtual" ? "virtual" : "physical"} card application — it will be verified shortly.`,
      });
      toast.success("Application submitted — it will be verified shortly.");
      setShowApply(false); reset(); reload();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally { setLoading(false); }
  };

  const toggleFreeze = async (card: any) => {
    const newStatus = card.status === "frozen" ? "active" : "frozen";
    await supabase.from("cards").update({ status: newStatus as any }).eq("id", card.id);
    setCards(cards.map((c) => c.id === card.id ? { ...c, status: newStatus } : c));
    toast.success(newStatus === "frozen" ? "Card frozen" : "Card unfrozen");
  };

  const toggleSetting = async (card: any, field: "online_payments" | "international_payments") => {
    const val = !card[field];
    const updateData = field === "online_payments" ? { online_payments: val } : { international_payments: val };
    await supabase.from("cards").update(updateData).eq("id", card.id);
    setCards(cards.map((c) => c.id === card.id ? { ...c, [field]: val } : c));
  };

  const copyNumber = (n: string) => {
    navigator.clipboard.writeText(n);
    toast.success("Card number copied");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-lg font-semibold text-foreground">Cards</h1>
          </div>
          {!showApply && <Button size="sm" onClick={() => setShowApply(true)}>Apply</Button>}
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        {showApply ? (
          <div className="space-y-4">
            {/* Stepper */}
            <div className="flex items-center justify-between gap-1 rounded-xl border border-border bg-card p-3">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                    i < step ? "bg-emerald text-emerald-foreground"
                    : i === step ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-[9px] leading-tight text-center ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="font-semibold text-foreground">Choose Your Card</h2>

                  {/* Tier picker */}
                  <div className="space-y-2">
                    {CARD_TIERS.map((t) => {
                      const active = t.value === tier;
                      return (
                        <button key={t.value} type="button" onClick={() => setTier(t.value)}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-14 shrink-0 rounded-md bg-gradient-to-br ${t.color}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                                <p className="text-xs text-muted-foreground">{t.annualFee === 0 ? "Free" : `${formatCurrency(t.annualFee, profile.primary_currency)}/yr`}</p>
                              </div>
                              <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{t.benefits.join(" · ")}</p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">Limit: {formatCurrency(t.spendingLimit, profile.primary_currency)}</p>
                            </div>
                            {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Type picker */}
                  <div>
                    <Label>Card Type</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {CARD_TYPES.map((t) => {
                        const active = t.value === cardType;
                        const I = t.value === "virtual" ? Wifi : Truck;
                        return (
                          <button key={t.value} type="button" onClick={() => setCardType(t.value)}
                            className={`rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                            <I className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            <p className="mt-1 text-xs font-semibold text-foreground">{t.label}</p>
                            <p className="text-[10px] text-muted-foreground">{t.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Set 4-digit Card PIN</Label>
                    <Input type="password" maxLength={4} inputMode="numeric"
                      value={pinMode} onChange={(e) => setPinMode(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••" />
                    <p className="mt-1 text-[10px] text-muted-foreground">Used for ATM and POS transactions.</p>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-semibold text-foreground">Personal Information</h2>
                  <div>
                    <Label>Name on Card</Label>
                    <Input value={holderName} onChange={(e) => setHolderName(e.target.value.toUpperCase())} maxLength={26} />
                    <p className="mt-1 text-[10px] text-muted-foreground">As it will appear on your card (max 26 chars).</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-semibold text-foreground">{cardType === "virtual" ? "Billing Address" : "Delivery Address"}</h2>
                  <p className="text-xs text-muted-foreground">
                    {cardType === "virtual"
                      ? "Used for verification with merchants."
                      : "Your physical card will arrive in 3–7 business days."}
                  </p>
                  <div>
                    <Label>Address Line 1</Label>
                    <Input value={addrLine1} onChange={(e) => setAddrLine1(e.target.value)} placeholder="Street address" />
                  </div>
                  <div>
                    <Label>Address Line 2 (optional)</Label>
                    <Input value={addrLine2} onChange={(e) => setAddrLine2(e.target.value)} placeholder="Apt, Suite, etc." />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>City</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div>
                      <Label>State / Region</Label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>ZIP / Postal Code</Label>
                    <Input value={zip} onChange={(e) => setZip(e.target.value)} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-semibold text-foreground">Review & Confirm</h2>

                  {/* Card preview */}
                  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tierData.color} p-5 text-white shadow-lg`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] opacity-70">CAPITAL CREST</p>
                        <p className="text-xs font-semibold uppercase">{tierData.label}</p>
                      </div>
                      <Wifi className="h-5 w-5 opacity-80" />
                    </div>
                    <p className="mt-8 font-mono text-base tracking-[0.2em]">•••• •••• •••• ••••</p>
                    <div className="mt-3 flex justify-between text-[10px]">
                      <div>
                        <p className="opacity-60">CARD HOLDER</p>
                        <p className="text-sm font-semibold">{holderName.toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="opacity-60">VALID THRU</p>
                        <p className="text-sm font-semibold">••/••</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-xs">
                    <Row label="Card Tier" value={tierData.label} />
                    <Row label="Type" value={cardType === "virtual" ? "Virtual" : "Physical"} />
                    <Row label="Annual Fee" value={tierData.annualFee === 0 ? "Free" : formatCurrency(tierData.annualFee, profile.primary_currency)} />
                    <Row label="Spending Limit" value={formatCurrency(tierData.spendingLimit, profile.primary_currency)} />
                    <Row label="Card Holder" value={holderName} />
                    {cardType === "physical" && <Row label="Ships to" value={`${addrLine1}, ${city} ${zip}`} />}
                  </div>

                  <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                    <span>I have read and agree to the Cardholder Agreement, Fee Schedule, and Privacy Policy.</span>
                  </label>

                  <div className="flex gap-2 rounded-lg bg-primary/5 p-2 text-[11px] text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>Your card details will appear in this app once activated by our team.</span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-2">
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={back} className="flex-1 gap-1">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={next} className="flex-1 gap-1">
                    Continue <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={submit} className="flex-1" disabled={loading || !agree}>
                    {loading ? "Submitting…" : "Submit Application"}
                  </Button>
                )}
              </div>
              <button type="button" onClick={() => { setShowApply(false); reset(); }} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground">
                Cancel application
              </button>
            </div>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No cards yet</p>
            <Button className="mt-4" onClick={() => setShowApply(true)}>Apply for a Card</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {cards.map((card) => {
              const isRevealed = revealed[card.id];
              const isFrozen = card.status === "frozen";
              const isPending = card.status === "pending";
              return (
                <div key={card.id}>
                  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-emerald p-5 text-white shadow-lg ${isFrozen ? "opacity-70" : ""}`}>
                    {isFrozen && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                        <Snowflake className="h-12 w-12 opacity-70" />
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] opacity-70">CAPITAL CREST</p>
                        <p className="text-xs font-semibold uppercase">{isPending ? "Pending Activation" : "Active"}</p>
                      </div>
                      <Wifi className="h-5 w-5 opacity-80" />
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                      <p className="font-mono text-base tracking-[0.2em]">
                        {isPending ? "•••• •••• •••• ••••"
                          : isRevealed ? card.card_number.replace(/(.{4})/g, "$1 ").trim()
                          : "•••• •••• •••• " + card.card_number.slice(-4)}
                      </p>
                      {!isPending && (
                        <button onClick={() => copyNumber(card.card_number)} className="opacity-70 hover:opacity-100">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex items-end justify-between text-[10px]">
                      <div>
                        <p className="opacity-60">CARD HOLDER</p>
                        <p className="text-sm font-semibold">{card.card_holder.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="opacity-60">EXPIRES</p>
                        <p className="text-sm font-semibold">{isPending ? "••/••" : card.expiry_date}</p>
                      </div>
                      <div>
                        <p className="opacity-60">CVV</p>
                        <p className="text-sm font-semibold">{!isPending && isRevealed ? card.cvv : "•••"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  {!isPending && (
                    <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
                      <button
                        onClick={() => setRevealed((r) => ({ ...r, [card.id]: !r[card.id] }))}
                        className="flex w-full items-center justify-between text-sm text-foreground"
                      >
                        <span className="flex items-center gap-2">
                          {isRevealed ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          {isRevealed ? "Hide card details" : "Show card details"}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Snowflake className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Freeze Card</span>
                        </div>
                        <Switch checked={isFrozen} onCheckedChange={() => toggleFreeze(card)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Online Payments</span>
                        </div>
                        <Switch checked={card.online_payments} onCheckedChange={() => toggleSetting(card, "online_payments")} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">International</span>
                        </div>
                        <Switch checked={card.international_payments} onCheckedChange={() => toggleSetting(card, "international_payments")} />
                      </div>
                      <div className="border-t border-border pt-2">
                        <p className="text-xs text-muted-foreground">Spending Limit: <span className="font-semibold text-foreground">{formatCurrency(card.spending_limit ?? 0, profile.primary_currency)}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
