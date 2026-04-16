import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Snowflake, Globe, ShoppingCart, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/cards")({
  component: CardsPage,
});

function CardsPage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from("cards").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setCards(data ?? []));
  }, [user]);

  if (!profile) return null;

  const applyForCard = async () => {
    if (profile.kyc_status !== "verified") { toast.error("Complete KYC verification first"); return; }
    setLoading(true);
    try {
      const cardNum = "4" + Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join("");
      const cvv = String(Math.floor(Math.random() * 900) + 100);
      const expMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
      const expYear = String(new Date().getFullYear() + 3).slice(-2);

      const { error } = await supabase.from("cards").insert({
        user_id: user!.id,
        card_number: cardNum,
        card_holder: profile.full_name,
        expiry_date: `${expMonth}/${expYear}`,
        cvv,
        status: "pending" as const,
      });
      if (error) throw error;
      toast.success("Card application submitted!");
      setShowApply(false);
      const { data } = await supabase.from("cards").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      setCards(data ?? []);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleFreeze = async (card: any) => {
    const newStatus = card.status === "frozen" ? "active" : "frozen";
    await supabase.from("cards").update({ status: newStatus as any }).eq("id", card.id);
    setCards(cards.map((c) => c.id === card.id ? { ...c, status: newStatus } : c));
    toast.success(newStatus === "frozen" ? "Card frozen" : "Card unfrozen");
  };

  const toggleSetting = async (card: any, field: "online_payments" | "international_payments") => {
    const val = !card[field];
    await supabase.from("cards").update({ [field]: val }).eq("id", card.id);
    setCards(cards.map((c) => c.id === card.id ? { ...c, [field]: val } : c));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-lg font-semibold text-foreground">Virtual Cards</h1>
          </div>
          <Button size="sm" onClick={() => setShowApply(true)}>Apply</Button>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        {showApply && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 font-semibold text-foreground">Apply for Virtual Card</h2>
            <p className="mb-4 text-sm text-muted-foreground">Get a virtual debit card for online payments. Subject to admin approval.</p>
            <Button onClick={applyForCard} disabled={loading} className="w-full">{loading ? "Applying..." : "Apply Now"}</Button>
          </div>
        )}

        {cards.length === 0 && !showApply ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No cards yet</p>
            <Button className="mt-4" onClick={() => setShowApply(true)}>Apply for Card</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <div key={card.id}>
                {/* Virtual Card Display */}
                <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${card.status === "frozen" ? "bg-gradient-to-br from-gray-500 to-gray-700" : "bg-gradient-to-br from-primary to-emerald"}`}>
                  {card.status === "frozen" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                      <Snowflake className="h-12 w-12 opacity-60" />
                    </div>
                  )}
                  <div className="flex justify-between">
                    <p className="text-xs opacity-70">Capital Crest</p>
                    <p className="text-xs font-semibold capitalize">{card.status}</p>
                  </div>
                  <p className="mt-6 font-mono text-lg tracking-wider">
                    {card.status === "active" ? card.card_number.replace(/(.{4})/g, "$1 ").trim() : "•••• •••• •••• " + card.card_number.slice(-4)}
                  </p>
                  <div className="mt-4 flex justify-between">
                    <div>
                      <p className="text-[10px] opacity-70">CARD HOLDER</p>
                      <p className="text-sm font-semibold">{card.card_holder}</p>
                    </div>
                    <div>
                      <p className="text-[10px] opacity-70">EXPIRES</p>
                      <p className="text-sm font-semibold">{card.expiry_date}</p>
                    </div>
                    <div>
                      <p className="text-[10px] opacity-70">CVV</p>
                      <p className="text-sm font-semibold">{card.status === "active" ? card.cvv : "•••"}</p>
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                {(card.status === "active" || card.status === "frozen") && (
                  <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Snowflake className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Freeze Card</span>
                      </div>
                      <Switch checked={card.status === "frozen"} onCheckedChange={() => toggleFreeze(card)} />
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
                    <div>
                      <p className="text-xs text-muted-foreground">Spending Limit: ${card.spending_limit?.toLocaleString()}</p>
                    </div>
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
