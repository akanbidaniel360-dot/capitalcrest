import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Receipt, CheckCircle2, XCircle, Clock, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

const FILING_STATUSES = [
  "Single",
  "Married Filing Jointly",
  "Married Filing Separately",
  "Head of Household",
  "Qualifying Widow(er)",
];

const REFUND_REASONS = [
  "Overpaid income tax",
  "Excess withholding",
  "Tax credit adjustment",
  "Deduction correction",
  "Amended return",
  "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const TAX_YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3, CURRENT_YEAR - 4];

export const Route = createFileRoute("/tax-refund")({
  component: TaxRefundPage,
});

function TaxRefundPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [taxYear, setTaxYear] = useState(String(CURRENT_YEAR - 1));
  const [filingStatus, setFilingStatus] = useState(FILING_STATUSES[0]);
  const [tin, setTin] = useState("");
  const [employer, setEmployer] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [taxPaid, setTaxPaid] = useState("");
  const [reasonType, setReasonType] = useState(REFUND_REASONS[0]);
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.from("tax_refunds").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => {
    reload();
    if (!user) return;
    const ch = supabase.channel(`tax-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tax_refunds", filter: `user_id=eq.${user.id}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!profile) return null;

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!tin.trim() || tin.replace(/\D/g, "").length < 9) { toast.error("Enter a valid Tax ID / SSN (9 digits)"); return; }
    if (!employer.trim()) { toast.error("Employer / income source is required"); return; }
    const income = parseFloat(annualIncome);
    if (!income || income <= 0) { toast.error("Enter your annual income"); return; }
    const paid = parseFloat(taxPaid);
    if (!paid || paid <= 0) { toast.error("Enter total tax paid"); return; }
    if (amt > paid) { toast.error("Refund amount cannot exceed tax paid"); return; }
    if (!reason.trim() || reason.length < 10) { toast.error("Provide at least 10 characters of detail"); return; }
    if (!consent) { toast.error("You must certify the information is accurate"); return; }
    setSubmitting(true);
    try {
      const fullReason = `[${reasonType} · TY ${taxYear} · ${filingStatus}] ${reason.trim()}\nEmployer: ${employer} · Income: ${income} · Tax Paid: ${paid} · TIN: ***-**-${tin.replace(/\D/g, "").slice(-4)}`;
      const { error } = await supabase.from("tax_refunds").insert({
        user_id: user!.id,
        amount: amt,
        reason: fullReason,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Tax refund filed — your request will be verified shortly.");
      setAmount(""); setReason(""); setTin(""); setEmployer("");
      setAnnualIncome(""); setTaxPaid(""); setConsent(false);
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-chart-4/10 text-chart-4",
      approved: "bg-emerald/10 text-emerald",
      rejected: "bg-destructive/10 text-destructive",
    };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[s] || "bg-muted text-muted-foreground"}`}>{s}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Tax Refund</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">File a Tax Refund Request</h2>
              <p className="text-xs text-muted-foreground">All information is encrypted and reviewed by our tax team.</p>
            </div>
          </div>

          <form onSubmit={apply} className="space-y-4">
            {/* Section: Taxpayer info */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">1. Taxpayer Information</p>
              <div>
                <Label>Full Legal Name</Label>
                <Input value={profile.full_name} readOnly className="bg-muted/40" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tax Year</Label>
                  <Select value={taxYear} onValueChange={setTaxYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TAX_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filing Status</Label>
                  <Select value={filingStatus} onValueChange={setFilingStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Tax ID / SSN <span className="text-muted-foreground text-xs">(9 digits)</span></Label>
                <Input
                  value={tin}
                  onChange={(e) => setTin(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="123-45-6789"
                  inputMode="numeric"
                  required
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Stored masked; only last 4 digits are visible to admins.</p>
              </div>
            </div>

            {/* Section: Income */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">2. Income & Tax Paid</p>
              <div>
                <Label>Employer / Income Source</Label>
                <Input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="e.g. Acme Corp" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Annual Income ({profile.primary_currency})</Label>
                  <Input type="number" value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)} placeholder="0.00" min="0" step="0.01" required />
                </div>
                <div>
                  <Label>Total Tax Paid</Label>
                  <Input type="number" value={taxPaid} onChange={(e) => setTaxPaid(e.target.value)} placeholder="0.00" min="0" step="0.01" required />
                </div>
              </div>
            </div>

            {/* Section: Refund details */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">3. Refund Details</p>
              <div>
                <Label>Refund Amount Claimed ({profile.primary_currency})</Label>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" required />
              </div>
              <div>
                <Label>Reason for Refund</Label>
                <Select value={reasonType} onValueChange={setReasonType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REFUND_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Additional Details</Label>
                <Textarea placeholder="Provide a detailed explanation of why you're entitled to this refund..." value={reason} onChange={(e) => setReason(e.target.value)} rows={4} required />
              </div>
            </div>

            {/* Certification */}
            <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
              <span>
                I declare under penalty of perjury that the information provided is true, correct, and complete to the best of my knowledge.
              </span>
            </label>

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              <ShieldCheck className="h-4 w-4" />
              {submitting ? "Submitting..." : "File Refund Request"}
            </Button>
          </form>
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-foreground">Your Requests</h2>
          {items.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No tax refund requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((g) => (
                <div key={g.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{formatCurrency(g.amount, profile.primary_currency)}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{g.reason}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(g.created_at).toLocaleString()}</p>
                    </div>
                    {statusBadge(g.status)}
                  </div>
                  {g.admin_notes && (
                    <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-foreground"><strong>Admin:</strong> {g.admin_notes}</p>
                  )}
                  {g.status === "approved" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Refund credited to your account
                    </div>
                  )}
                  {g.status === "rejected" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Request declined
                    </div>
                  )}
                  {g.status === "pending" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-chart-4">
                      <Clock className="h-3.5 w-3.5" /> Will be verified shortly
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
