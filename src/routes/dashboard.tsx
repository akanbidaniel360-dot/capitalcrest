import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Shield, ArrowUpRight, ArrowDownLeft, Send, Receipt, Landmark,
  CreditCard, Bell, LogOut, User, ChevronRight, Copy, Eye, EyeOff,
  Settings, TrendingUp, PiggyBank, Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile, isAdmin, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<number>(0);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: w } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .eq("currency", profile?.primary_currency ?? "USD")
        .maybeSingle();
      setWallet(w);

      const { data: t } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setTransactions(t ?? []);

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setNotifications(count ?? 0);
    };
    fetchData();

    // Realtime: refresh on wallet, transaction, notification changes
    const channel = supabase
      .channel(`dash-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => fetchData()
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        () => fetchData()
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchData()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, profile]);

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const currency = profile.primary_currency;
  const balance = wallet?.available_balance ?? 0;
  const pending = wallet?.pending_balance ?? 0;

  const quickActions = [
    { icon: ArrowDownLeft, label: "Deposit", to: "/deposit", color: "bg-emerald/10 text-emerald" },
    { icon: ArrowUpRight, label: "Withdraw", to: "/withdraw", color: "bg-destructive/10 text-destructive" },
    { icon: Send, label: "Transfer", to: "/transfer", color: "bg-primary/10 text-primary" },
    { icon: Repeat, label: "Convert", to: "/convert", color: "bg-chart-2/10 text-chart-2" },
    { icon: Receipt, label: "Pay Bills", to: "/bills", color: "bg-chart-4/10 text-chart-4" },
    { icon: Landmark, label: "Loan", to: "/loans", color: "bg-chart-3/10 text-chart-3" },
    { icon: CreditCard, label: "Cards", to: "/cards", color: "bg-chart-5/10 text-chart-5" },
    { icon: Receipt, label: "History", to: "/transactions", color: "bg-muted text-foreground" },
  ];

  const copyAccount = () => {
    navigator.clipboard.writeText(profile.account_number);
    toast.success("Account number copied!");
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit": return <ArrowDownLeft className="h-4 w-4 text-emerald" />;
      case "withdrawal": return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case "transfer_out": return <Send className="h-4 w-4 text-primary" />;
      case "transfer_in": return <ArrowDownLeft className="h-4 w-4 text-emerald" />;
      default: return <Receipt className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">Capital Crest</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link to="/notifications">
              <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {notifications}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Greeting */}
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">{getGreeting()},</p>
          <h1 className="text-xl font-bold text-foreground">{profile.full_name}</h1>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm opacity-80">Available Balance</p>
            <button onClick={() => setShowBalance(!showBalance)} className="opacity-70 hover:opacity-100">
              {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-3xl font-bold">
            {showBalance ? formatCurrency(balance, currency) : `${getCurrencySymbol(currency)}••••••`}
          </p>
          {pending > 0 && (
            <p className="mt-1 text-xs opacity-70">
              Pending: {formatCurrency(pending, currency)}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-sm backdrop-blur-sm">
            <div>
              <p className="text-xs opacity-70">Account Number</p>
              <p className="font-mono font-semibold">{profile.account_number}</p>
            </div>
            <button onClick={copyAccount} className="opacity-70 hover:opacity-100">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs opacity-50">Capital Crest • {currency}</p>
        </motion.div>

        {/* KYC Banner */}
        {profile.kyc_status !== "verified" && (
          <Link to="/settings" className="mt-3 block">
            <div className="flex items-center gap-3 rounded-xl border border-chart-4/30 bg-chart-4/5 px-4 py-3">
              <Shield className="h-5 w-5 text-chart-4" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Complete KYC Verification</p>
                <p className="text-xs text-muted-foreground">Unlock full banking features</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        )}

        {/* Quick Actions */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((a) => (
              <Link key={a.label} to={a.to as any}>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${a.color}`}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium text-foreground text-center">{a.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* More Actions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link to="/savings">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
              <PiggyBank className="h-5 w-5 text-emerald" />
              <span className="text-sm font-medium text-foreground">Savings</span>
            </div>
          </Link>
          <Link to="/analytics">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Analytics</span>
            </div>
          </Link>
        </div>

        {/* Credit Score */}
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-muted" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-emerald" strokeWidth="3" strokeDasharray={`${(profile.credit_score / 850) * 94} 94`} strokeLinecap="round" />
            </svg>
            <span className="absolute text-xs font-bold text-foreground">{profile.credit_score}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Credit Score</p>
            <p className="text-xs text-muted-foreground">
              {profile.credit_score >= 700 ? "Excellent" : profile.credit_score >= 500 ? "Good" : "Fair"}
            </p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs font-medium text-primary hover:underline">
              View All
            </Link>
          </div>
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    {getTypeIcon(t.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{t.description || t.type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${t.type.includes("in") || t.type === "deposit" || t.type === "loan_credit" ? "text-emerald" : "text-foreground"}`}>
                      {t.type.includes("in") || t.type === "deposit" || t.type === "loan_credit" ? "+" : "-"}
                      {formatCurrency(t.amount, t.currency)}
                    </p>
                    <p className={`text-xs ${t.status === "completed" || t.status === "approved" ? "text-emerald" : t.status === "pending" ? "text-chart-4" : "text-destructive"}`}>
                      {t.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Link */}
        {isAdmin && (
          <Link to="/admin" className="mt-4 block">
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Admin Panel</span>
              <ChevronRight className="ml-auto h-4 w-4 text-primary" />
            </div>
          </Link>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-around py-2">
          {[
            { icon: Shield, label: "Home", to: "/dashboard" },
            { icon: Send, label: "Transfer", to: "/transfer" },
            { icon: Receipt, label: "History", to: "/transactions" },
            { icon: User, label: "Account", to: "/settings" },
          ].map((item) => (
            <Link key={item.label} to={item.to as any} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
