import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Gift, CheckCircle2, XCircle, Clock, KeyRound, ShieldCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const GRANT_CATEGORIES = [
  { id: "education", label: "Education & Tuition", max: 15000 },
  { id: "small_business", label: "Small Business Support", max: 25000 },
  { id: "housing", label: "Housing Assistance", max: 12000 },
  { id: "medical", label: "Medical Hardship", max: 20000 },
  { id: "agriculture", label: "Agriculture & Farming", max: 18000 },
  { id: "disability", label: "Disability Support", max: 10000 },
  { id: "disaster", label: "Disaster Relief", max: 30000 },
  { id: "research", label: "Research & Innovation", max: 50000 },
] as const;

const EMPLOYMENT = ["Employed", "Self-employed", "Unemployed", "Student", "Retired"];
const HOUSEHOLDS = ["1", "2", "3", "4", "5", "6+"];

export const Route = createFileRoute("/grants")({
  component: GrantsPage,
});

function GrantsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [grants, setGrants] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [claimGrant, setClaimGrant] = useState<any>(null);
  const [claimCode, setClaimCode] = useState("");

  // Application form state
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [employment, setEmployment] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [household, setHousehold] = useState("");
  const [govId, setGovId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [certify, setCertify] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.from("grants").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setGrants(data ?? []);
  };

  useEffect(() => {
    reload();
    if (!user) return;
    const ch = supabase.channel(`grants-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "grants", filter: `user_id=eq.${user.id}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!profile) return null;

  const selectedCat = GRANT_CATEGORIES.find((c) => c.id === category);
  const amt = parseFloat(amount) || 0;

  const resetForm = () => {
    setCategory(""); setAmount(""); setPurpose(""); setEmployment("");
    setAnnualIncome(""); setHousehold(""); setGovId(""); setAddress("");
    setPhone(""); setCertify(false);
  };

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) { toast.error("Select a grant category"); return; }
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > selectedCat.max) { toast.error(`Maximum for this category is ${formatCurrency(selectedCat.max, profile.primary_currency)}`); return; }
    if (!purpose.trim() || purpose.length < 20) { toast.error("Purpose must be at least 20 characters"); return; }
    if (!employment) { toast.error("Select your employment status"); return; }
    if (!annualIncome || parseFloat(annualIncome) < 0) { toast.error("Enter your annual income"); return; }
    if (!household) { toast.error("Select household size"); return; }
    if (govId.replace(/\D/g, "").length < 6) { toast.error("Enter a valid government ID number"); return; }
    if (!address.trim() || address.length < 8) { toast.error("Enter your full residential address"); return; }
    if (phone.replace(/\D/g, "").length < 7) { toast.error("Enter a valid phone number"); return; }
    if (!certify) { toast.error("You must certify the information is accurate"); return; }

    setSubmitting(true);
    try {
      const reason =
        `[${selectedCat.label}] ${purpose.trim()} ` +
        `| Employment: ${employment} | Annual Income: ${annualIncome} ${profile.primary_currency} ` +
        `| Household: ${household} | Gov ID: ****${govId.slice(-4)} ` +
        `| Address: ${address} | Phone: ${phone}`;
      const { error } = await supabase.from("grants").insert({
        user_id: user!.id, amount: amt, reason, status: "pending",
      });
      if (error) throw error;
      toast.success("Application submitted. We'll review your details shortly.");
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Application failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaim = async () => {
    if (!claimGrant) return;
    if (!claimCode.trim()) { toast.error("Enter the clearance code"); return; }
    if (claimCode.trim().toUpperCase() !== (claimGrant.clearance_code || "").toUpperCase()) {
      toast.error("Incorrect clearance code");
      return;
    }
    try {
      // Mark grant claimed first
      const { error: e1 } = await supabase.from("grants").update({
        status: "claimed", claimed_at: new Date().toISOString(),
      }).eq("id", claimGrant.id);
      if (e1) throw e1;

      // Insert completed transaction → trigger credits wallet automatically
      const { error: e2 } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "grant" as any,
        amount: claimGrant.amount,
        currency: profile.primary_currency,
        description: `Grant: ${claimGrant.reason.slice(0, 60)}`,
        status: "completed" as const,
        metadata: { grant_id: claimGrant.id, clearance_code: claimGrant.clearance_code },
      });
      if (e2) throw e2;

      toast.success(`${formatCurrency(claimGrant.amount, profile.primary_currency)} credited to your account!`);
      setClaimGrant(null);
      setClaimCode("");
    } catch (err: any) {
      toast.error(err.message || "Claim failed");
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-chart-4/10 text-chart-4",
      approved: "bg-emerald/10 text-emerald",
      rejected: "bg-destructive/10 text-destructive",
      claimed: "bg-primary/10 text-primary",
    };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[s] || "bg-muted text-muted-foreground"}`}>{s}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <Gift className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Grants</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 p-5 text-primary-foreground shadow-lg">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/15 p-2 backdrop-blur">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Capital Crest Grants</p>
              <h2 className="text-xl font-bold leading-tight">Funding for what matters</h2>
              <p className="mt-1 text-xs opacity-80">Subject to eligibility review and verification of submitted documents.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Grant Application</h2>
          </div>

          <form onSubmit={apply} className="space-y-4">
            {/* Category */}
            <div>
              <Label>Grant Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {GRANT_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label} <span className="text-muted-foreground">· up to {formatCurrency(c.max, profile.primary_currency)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCat && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Maximum allowed: <span className="font-semibold text-foreground">{formatCurrency(selectedCat.max, profile.primary_currency)}</span>
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label>Requested Amount ({profile.primary_currency})</Label>
              <Input
                type="number" inputMode="decimal" placeholder="0.00"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                min="0" step="0.01" required
                className="text-lg font-semibold"
              />
            </div>

            {/* Purpose */}
            <div>
              <Label>Purpose & Justification</Label>
              <Textarea
                placeholder="Describe how the funds will be used and why you qualify (min. 20 characters)…"
                value={purpose} onChange={(e) => setPurpose(e.target.value)}
                rows={4} required
              />
              <p className="mt-1 text-[10px] text-muted-foreground">{purpose.length}/600</p>
            </div>

            <div className="border-t border-border/50 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Details</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Employment Status</Label>
                  <Select value={employment} onValueChange={setEmployment}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Household Size</Label>
                  <Select value={household} onValueChange={setHousehold}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {HOUSEHOLDS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3">
                <Label>Annual Household Income ({profile.primary_currency})</Label>
                <Input type="number" inputMode="decimal" placeholder="0.00"
                  value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)}
                  min="0" step="0.01" required />
              </div>

              <div className="mt-3">
                <Label>Government-Issued ID Number</Label>
                <Input placeholder="SSN / NIN / Passport No."
                  value={govId} onChange={(e) => setGovId(e.target.value)}
                  className="font-mono tracking-wider" required />
                <p className="mt-1 text-[10px] text-muted-foreground">Used for identity verification only.</p>
              </div>

              <div className="mt-3">
                <Label>Residential Address</Label>
                <Textarea placeholder="Street, City, State / Province, Postal Code"
                  value={address} onChange={(e) => setAddress(e.target.value)}
                  rows={2} required />
              </div>

              <div className="mt-3">
                <Label>Phone Number</Label>
                <Input type="tel" placeholder="+1 555 000 0000"
                  value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
            </div>

            {/* Certification */}
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
              <Checkbox checked={certify} onCheckedChange={(v) => setCertify(!!v)} className="mt-0.5" />
              <span className="text-xs text-muted-foreground">
                I certify under penalty of perjury that the information provided is true and accurate, and I authorize Capital Crest to verify the details.
              </span>
            </label>

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              <ShieldCheck className="h-4 w-4" />
              {submitting ? "Submitting…" : "Submit Application"}
            </Button>
          </form>
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-foreground">Your Applications</h2>
          {grants.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Gift className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No grant applications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {grants.map((g) => (
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
                    <Button size="sm" className="mt-3 w-full gap-2" onClick={() => setClaimGrant(g)}>
                      <KeyRound className="h-3.5 w-3.5" /> Enter Clearance Code to Claim
                    </Button>
                  )}
                  {g.status === "claimed" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Funds credited
                    </div>
                  )}
                  {g.status === "rejected" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Application declined
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

      <Dialog open={!!claimGrant} onOpenChange={(o) => { if (!o) { setClaimGrant(null); setClaimCode(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Claim your grant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter the clearance code provided by your account administrator to unlock {claimGrant && formatCurrency(claimGrant.amount, profile.primary_currency)}.
            </p>
            <div>
              <Label>Clearance Code</Label>
              <Input
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className="font-mono uppercase tracking-widest"
                maxLength={12}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setClaimGrant(null); setClaimCode(""); }}>Cancel</Button>
            <Button onClick={handleClaim}>Unlock Funds</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
