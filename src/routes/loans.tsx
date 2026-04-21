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
  ArrowLeft, Landmark, ChevronRight, ChevronLeft, ShieldCheck,
  Briefcase, Home, User, FileText, Calculator, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import {
  LOAN_PURPOSES, EMPLOYMENT_STATUS, MARITAL_STATUS, HOUSING_STATUS, ID_TYPES,
} from "@/lib/banking-data";

export const Route = createFileRoute("/loans")({
  component: LoansPage,
});

const STEPS = ["Loan Details", "Personal Info", "Employment", "Review"] as const;

function LoansPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [step, setStep] = useState(0);

  // Step 1 — loan details
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("12");
  const [purpose, setPurpose] = useState(LOAN_PURPOSES[0]);
  const [purposeNote, setPurposeNote] = useState("");

  // Step 2 — personal
  const [dob, setDob] = useState("");
  const [marital, setMarital] = useState(MARITAL_STATUS[0]);
  const [dependents, setDependents] = useState("0");
  const [housing, setHousing] = useState(HOUSING_STATUS[0]);
  const [address, setAddress] = useState("");
  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState("");

  // Step 3 — employment
  const [empStatus, setEmpStatus] = useState(EMPLOYMENT_STATUS[0]);
  const [employer, setEmployer] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [yearsEmployed, setYearsEmployed] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [otherDebt, setOtherDebt] = useState("0");

  // Step 4 — consent
  const [agree, setAgree] = useState(false);
  const [creditConsent, setCreditConsent] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.from("loans").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setLoans(data ?? []);
  };

  useEffect(() => { reload(); }, [user]);

  if (!profile) return null;

  const interestRate = profile.credit_score >= 700 ? 3.5 : profile.credit_score >= 500 ? 5.0 : 8.0;
  const amt = parseFloat(amount) || 0;
  const months = parseInt(duration) || 12;
  const totalRepayment = amt * (1 + (interestRate / 100) * (months / 12));
  const monthlyPayment = totalRepayment / months;
  const income = parseFloat(monthlyIncome) || 0;
  const debt = parseFloat(otherDebt) || 0;
  const dti = income > 0 ? ((debt + monthlyPayment) / income) * 100 : 0;

  const reset = () => {
    setStep(0); setAmount(""); setDuration("12");
    setPurpose(LOAN_PURPOSES[0]); setPurposeNote("");
    setDob(""); setMarital(MARITAL_STATUS[0]); setDependents("0");
    setHousing(HOUSING_STATUS[0]); setAddress("");
    setIdType(ID_TYPES[0]); setIdNumber("");
    setEmpStatus(EMPLOYMENT_STATUS[0]); setEmployer(""); setJobTitle("");
    setYearsEmployed(""); setMonthlyIncome(""); setOtherDebt("0");
    setAgree(false); setCreditConsent(false);
  };

  const validateStep = () => {
    if (step === 0) {
      if (amt <= 0) { toast.error("Enter loan amount"); return false; }
      if (months < 3 || months > 60) { toast.error("Duration must be 3–60 months"); return false; }
    }
    if (step === 1) {
      if (!dob) { toast.error("Date of birth is required"); return false; }
      if (!address.trim()) { toast.error("Residential address is required"); return false; }
      if (!idNumber.trim()) { toast.error("ID number is required"); return false; }
    }
    if (step === 2) {
      if (!employer.trim()) { toast.error("Employer is required"); return false; }
      if (income <= 0) { toast.error("Enter monthly income"); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(Math.min(step + 1, STEPS.length - 1)); };
  const back = () => setStep(Math.max(step - 1, 0));

  const submit = async () => {
    if (profile.kyc_status !== "verified") { toast.error("Complete KYC verification first"); return; }
    if (!agree || !creditConsent) { toast.error("You must accept all terms to continue"); return; }
    setLoading(true);
    try {
      const nextPayment = new Date();
      nextPayment.setMonth(nextPayment.getMonth() + 1);
      const { error } = await supabase.from("loans").insert({
        user_id: user!.id,
        amount: amt,
        duration_months: months,
        interest_rate: interestRate,
        monthly_payment: Math.round(monthlyPayment * 100) / 100,
        total_repayment: Math.round(totalRepayment * 100) / 100,
        status: "pending" as const,
        next_payment_date: nextPayment.toISOString().split("T")[0],
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: user!.id,
        type: "loan" as any,
        title: "Loan application received",
        message: `We received your ${formatCurrency(amt, profile.primary_currency)} loan application — it will be verified shortly.`,
      });
      toast.success("Application submitted — it will be verified shortly.");
      setShowApply(false); reset(); reload();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally { setLoading(false); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { c: string; I: any; t: string }> = {
      pending: { c: "bg-chart-4/10 text-chart-4", I: Clock, t: "Pending" },
      approved: { c: "bg-emerald/10 text-emerald", I: CheckCircle2, t: "Approved" },
      active: { c: "bg-primary/10 text-primary", I: CheckCircle2, t: "Active" },
      paid: { c: "bg-emerald/10 text-emerald", I: CheckCircle2, t: "Paid Off" },
      rejected: { c: "bg-destructive/10 text-destructive", I: XCircle, t: "Rejected" },
      defaulted: { c: "bg-destructive/10 text-destructive", I: XCircle, t: "Defaulted" },
    };
    const m = map[s] || map.pending;
    const I = m.I;
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${m.c}`}><I className="h-3 w-3" />{m.t}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-lg font-semibold text-foreground">Loans</h1>
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

            {/* Step content */}
            <div className="rounded-xl border border-border bg-card p-5">
              {step === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Loan Details</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">Interest rate based on your credit score ({profile.credit_score}): <span className="font-semibold text-foreground">{interestRate}% APR</span></p>
                  <div>
                    <Label>Amount Requested ({profile.primary_currency})</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="100" />
                  </div>
                  <div>
                    <Label>Duration (months)</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[6, 12, 18, 24, 36, 48, 60].map((m) => <SelectItem key={m} value={String(m)}>{m} months</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Loan Purpose</Label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LOAN_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Brief Description (optional)</Label>
                    <Textarea rows={2} value={purposeNote} onChange={(e) => setPurposeNote(e.target.value)} placeholder="Explain how you'll use the funds…" />
                  </div>
                  {amt > 0 && (
                    <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Monthly Payment</span><span className="font-semibold text-foreground">{formatCurrency(monthlyPayment, profile.primary_currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Repayment</span><span className="font-semibold text-foreground">{formatCurrency(totalRepayment, profile.primary_currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Interest</span><span className="font-semibold text-foreground">{formatCurrency(totalRepayment - amt, profile.primary_currency)}</span></div>
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Personal Information</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                    </div>
                    <div>
                      <Label>Marital Status</Label>
                      <Select value={marital} onValueChange={setMarital}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MARITAL_STATUS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Dependents</Label>
                      <Input type="number" min="0" value={dependents} onChange={(e) => setDependents(e.target.value)} />
                    </div>
                    <div>
                      <Label>Housing</Label>
                      <Select value={housing} onValueChange={setHousing}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {HOUSING_STATUS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Residential Address</Label>
                    <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State/Region, ZIP" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>ID Type</Label>
                      <Select value={idType} onValueChange={setIdType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ID_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>ID Number</Label>
                      <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="ID / passport #" />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Employment & Income</h2>
                  </div>
                  <div>
                    <Label>Employment Status</Label>
                    <Select value={empStatus} onValueChange={setEmpStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_STATUS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Employer / Business Name</Label>
                    <Input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Company name" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Job Title</Label>
                      <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Engineer" />
                    </div>
                    <div>
                      <Label>Years Employed</Label>
                      <Input type="number" min="0" step="0.1" value={yearsEmployed} onChange={(e) => setYearsEmployed(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Monthly Income</Label>
                      <Input type="number" min="0" step="0.01" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Other Monthly Debt</Label>
                      <Input type="number" min="0" step="0.01" value={otherDebt} onChange={(e) => setOtherDebt(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  {income > 0 && (
                    <div className={`rounded-lg p-3 text-xs ${dti > 43 ? "bg-destructive/10 text-destructive" : dti > 30 ? "bg-chart-4/10 text-chart-4" : "bg-emerald/10 text-emerald"}`}>
                      <p className="font-semibold">Debt-to-Income Ratio: {dti.toFixed(1)}%</p>
                      <p className="mt-0.5 opacity-80">{dti > 43 ? "High DTI may affect approval." : dti > 30 ? "Moderate DTI — likely approval." : "Excellent — strong approval likelihood."}</p>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Review & Submit</h2>
                  </div>
                  <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-xs">
                    <Row label="Amount" value={formatCurrency(amt, profile.primary_currency)} />
                    <Row label="Duration" value={`${months} months`} />
                    <Row label="Interest Rate" value={`${interestRate}% APR`} />
                    <Row label="Monthly Payment" value={formatCurrency(monthlyPayment, profile.primary_currency)} />
                    <Row label="Total Repayment" value={formatCurrency(totalRepayment, profile.primary_currency)} />
                    <Row label="Purpose" value={purpose} />
                    <Row label="Applicant" value={profile.full_name} />
                    <Row label="Employer" value={employer} />
                    <Row label="Monthly Income" value={formatCurrency(income, profile.primary_currency)} />
                    <Row label="DTI" value={`${dti.toFixed(1)}%`} />
                  </div>
                  <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                    <span>I confirm the information provided is true and accurate. I understand that providing false information is a federal offence.</span>
                  </label>
                  <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground">
                    <input type="checkbox" checked={creditConsent} onChange={(e) => setCreditConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                    <span>I authorize Capital Crest to perform a credit check and verify my income and employment information.</span>
                  </label>
                  <div className="flex gap-2 rounded-lg bg-primary/5 p-2 text-[11px] text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>Decision typically within 24 hours. Funds disbursed to your account upon approval.</span>
                  </div>
                </div>
              )}

              {/* Navigation */}
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
                  <Button type="button" onClick={submit} className="flex-1" disabled={loading || !agree || !creditConsent}>
                    {loading ? "Submitting…" : "Submit Application"}
                  </Button>
                )}
              </div>
              <button type="button" onClick={() => { setShowApply(false); reset(); }} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground">
                Cancel application
              </button>
            </div>
          </div>
        ) : loans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Landmark className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No loans yet</p>
            <Button className="mt-4" onClick={() => setShowApply(true)}>Apply for a Loan</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <div key={loan.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(loan.amount, profile.primary_currency)}</p>
                    <p className="text-xs text-muted-foreground">{loan.duration_months} months · {loan.interest_rate}% APR</p>
                  </div>
                  {statusBadge(loan.status)}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Monthly: <span className="font-semibold text-foreground">{formatCurrency(loan.monthly_payment ?? 0, profile.primary_currency)}</span></span>
                  <span>Total: <span className="font-semibold text-foreground">{formatCurrency(loan.total_repayment ?? 0, profile.primary_currency)}</span></span>
                  <span>Paid: <span className="font-semibold text-foreground">{formatCurrency(loan.amount_paid, profile.primary_currency)}</span></span>
                  {loan.next_payment_date && <span>Next: <span className="font-semibold text-foreground">{loan.next_payment_date}</span></span>}
                </div>
                {(loan.status === "active" || loan.status === "approved") && loan.total_repayment > 0 && (
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${Math.min(100, (loan.amount_paid / loan.total_repayment) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{Math.round((loan.amount_paid / loan.total_repayment) * 100)}% repaid</p>
                  </div>
                )}
              </div>
            ))}
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
