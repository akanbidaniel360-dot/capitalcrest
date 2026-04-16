import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Shield, LogOut, Upload, Key, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, signOut, refreshProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [settingPin, setSettingPin] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  if (!profile) return null;

  const handleSetPin = async () => {
    if (pin.length !== 4 || pin !== confirmPin) { toast.error("PINs must match and be 4 digits"); return; }
    setSettingPin(true);
    try {
      // Store PIN hash (in production, hash on server side)
      await supabase.from("profiles").update({ pin_hash: btoa(pin) }).eq("user_id", user!.id);
      toast.success("Transaction PIN set!");
      setPin(""); setConfirmPin("");
      await refreshProfile();
    } catch (err: any) {
      toast.error("Failed to set PIN");
    } finally {
      setSettingPin(false);
    }
  };

  const handleKycUpload = async (type: "document" | "selfie", file: File) => {
    try {
      const path = `${user!.id}/${type}_${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("kyc-documents").upload(path, file);
      if (uploadErr) throw uploadErr;

      const url = `kyc-documents/${path}`;

      if (type === "document") {
        await supabase.from("kyc_documents").insert({
          user_id: user!.id,
          document_type: "id_document",
          document_url: url,
          status: "pending" as const,
        });
      } else {
        // Update existing KYC document with selfie
        const { data: existing } = await supabase.from("kyc_documents").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).single();
        if (existing) {
          await supabase.from("kyc_documents").update({ selfie_url: url }).eq("id", existing.id);
        }
      }
      await supabase.from("profiles").update({ kyc_status: "pending" as const }).eq("user_id", user!.id);
      toast.success(`${type === "document" ? "ID Document" : "Selfie"} uploaded! Verification pending.`);
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Profile Info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile.full_name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Account Number</span><div className="flex items-center gap-1"><span className="font-mono font-medium text-foreground">{profile.account_number}</span><button onClick={() => { navigator.clipboard.writeText(profile.account_number); toast.success("Copied!"); }}><Copy className="h-3 w-3 text-muted-foreground" /></button></div></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span className="text-foreground">{profile.country}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="text-foreground">{profile.primary_currency}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Referral Code</span><span className="font-mono text-foreground">{profile.referral_code}</span></div>
          </div>
        </div>

        {/* KYC Verification */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <Shield className="h-5 w-5" /> KYC Verification
          </h2>
          <div className="mb-3 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              profile.kyc_status === "verified" ? "bg-emerald/10 text-emerald" :
              profile.kyc_status === "pending" ? "bg-chart-4/10 text-chart-4" :
              profile.kyc_status === "rejected" ? "bg-destructive/10 text-destructive" :
              "bg-muted text-muted-foreground"
            }`}>
              {profile.kyc_status === "none" ? "Not Started" : profile.kyc_status}
            </span>
          </div>
          {profile.kyc_status !== "verified" && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Upload ID Document</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleKycUpload("document", f); }} />
              </div>
              <div>
                <Label className="text-sm">Upload Selfie</Label>
                <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleKycUpload("selfie", f); }} />
              </div>
            </div>
          )}
        </div>

        {/* Transaction PIN */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <Key className="h-5 w-5" /> Transaction PIN
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {profile.pin_hash ? "PIN is set. Enter new PIN to change it." : "Set a 4-digit PIN for transactions."}
          </p>
          <div className="space-y-3">
            <Input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Enter 4-digit PIN" />
            <Input type="password" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} placeholder="Confirm PIN" />
            <Button onClick={handleSetPin} disabled={settingPin} size="sm">{settingPin ? "Setting..." : "Set PIN"}</Button>
          </div>
        </div>

        {/* Logout */}
        <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
