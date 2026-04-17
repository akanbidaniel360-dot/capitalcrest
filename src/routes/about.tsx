import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Shield, ArrowRight, Globe, Zap, Lock, Heart, Mail, Phone,
  MessageCircle, CheckCircle2, Award, Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Capital Crest — Banking Reimagined" },
      { name: "description", content: "Learn about Capital Crest's mission to make modern banking simple, secure, and accessible to everyone, everywhere." },
      { property: "og:title", content: "About Capital Crest — Banking Reimagined" },
      { property: "og:description", content: "Learn about Capital Crest's mission to make modern banking simple, secure, and accessible to everyone, everywhere." },
    ],
  }),
  component: AboutPage,
});

const FAQS = [
  { q: "Is Capital Crest a real bank?", a: "Capital Crest is a digital banking platform offering modern financial services including multi-currency wallets, instant transfers, virtual cards, savings, and loans." },
  { q: "How do I open an account?", a: "Sign up in under 2 minutes with just your email. Complete KYC verification to unlock the full feature set including withdrawals, loans, and virtual cards." },
  { q: "Which currencies are supported?", a: "We support USD, NGN, GBP, EUR, CAD, ZAR, GHS, KES and more. Convert between currencies instantly at competitive rates." },
  { q: "How safe is my money?", a: "We use bank-grade encryption, transaction PIN protection, KYC verification, two-factor authentication, and real-time fraud detection to keep your funds and data secure." },
  { q: "Are there hidden fees?", a: "No hidden fees. Account opening is free. Currency conversions carry a small transparent spread (0.5%). All other fees are disclosed before you confirm any action." },
  { q: "How long do deposits take?", a: "Bank transfers and crypto deposits are typically credited within minutes after admin verification. You can track status in real-time on your dashboard." },
  { q: "Can I get a virtual card?", a: "Yes. Once KYC verified, apply for a virtual debit card from the Cards section. Approved cards work for online and international payments worldwide." },
  { q: "What if I need help?", a: "Our support team is available 24/7 via email at support@capitalcrest.app, by phone, or via live chat from your dashboard." },
];

function AboutPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Capital Crest</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald/5" />
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto max-w-4xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Heart className="h-3.5 w-3.5 text-emerald" /> Our Story
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            Banking reimagined for the{" "}
            <span className="bg-gradient-to-r from-primary to-emerald bg-clip-text text-transparent">modern world</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            We're building the bank we always wished we had — borderless, instant, secure, and built for how people actually live and earn today.
          </p>
        </motion.div>
      </section>

      {/* Mission */}
      <section className="border-t border-border/50 px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
            <p className="mt-3 text-muted-foreground">
              To give every person — regardless of where they live or how much they earn — access to a powerful, fair, and beautifully simple banking experience.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald/10">
              <Globe className="h-5 w-5 text-emerald" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Our Vision</h2>
            <p className="mt-3 text-muted-foreground">
              A world where money moves at the speed of thought, where currencies don't matter, and where your bank treats you like a person — not a number.
            </p>
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="border-t border-border/50 bg-muted/20 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-foreground">What we offer</h2>
            <p className="mt-2 text-muted-foreground">A complete financial toolkit, in one app.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Globe, title: "Multi-currency wallets", desc: "Hold and spend USD, NGN, GBP, EUR and more — convert instantly at fair rates." },
              { icon: Zap, title: "Instant transfers", desc: "Send money to anyone in seconds, by email or account number, free between users." },
              { icon: Shield, title: "Virtual debit cards", desc: "Generate cards instantly for online and international payments, with full controls." },
              { icon: Lock, title: "Bank-grade security", desc: "Encryption, transaction PINs, KYC, fraud detection — your money is locked down." },
              { icon: Heart, title: "Smart savings", desc: "Lock funds for a goal and earn competitive interest on every dollar set aside." },
              { icon: Users, title: "Quick loans", desc: "Apply for a loan based on your credit score, get funded fast after approval." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-border/50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { icon: Lock, label: "256-bit encryption" },
                { icon: Shield, label: "KYC & fraud detection" },
                { icon: CheckCircle2, label: "Audit-grade ledgers" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/10">
                    <t.icon className="h-5 w-5 text-emerald" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Customer service */}
      <section className="border-t border-border/50 bg-muted/20 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-foreground">We're here, around the clock</h2>
            <p className="mt-2 text-muted-foreground">Real people, real help — whenever you need it.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <a href="mailto:support@capitalcrest.app" className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30">
              <Mail className="h-6 w-6 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">Email</p>
              <p className="mt-1 text-xs text-muted-foreground break-all">support@capitalcrest.app</p>
              <p className="mt-2 text-xs text-emerald">Replies within 1 hour</p>
            </a>
            <a href="tel:+18005551234" className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30">
              <Phone className="h-6 w-6 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">Phone</p>
              <p className="mt-1 text-xs text-muted-foreground">+1 (800) 555-1234</p>
              <p className="mt-2 text-xs text-emerald">24/7 support</p>
            </a>
            <div className="rounded-2xl border border-border bg-card p-6">
              <MessageCircle className="h-6 w-6 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">Live chat</p>
              <p className="mt-1 text-xs text-muted-foreground">In-app chat</p>
              <p className="mt-2 text-xs text-emerald">Available 24/7</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-foreground">Frequently asked questions</h2>
          <div className="mt-8 space-y-2">
            {FAQS.map((f, i) => (
              <div key={f.q} className="rounded-xl border border-border bg-card">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">{f.q}</span>
                  <span className={`text-xl text-muted-foreground transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {open === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-gradient-to-br from-primary/10 via-background to-emerald/10 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">Ready to bank smarter?</h2>
          <p className="mt-3 text-muted-foreground">Join Capital Crest today and take control of your money.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup"><Button size="lg" className="w-full gap-2 sm:w-auto">Open Free Account <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/login"><Button size="lg" variant="outline" className="w-full sm:w-auto">Sign In</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Capital Crest</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground">Sign up</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Capital Crest</p>
        </div>
      </footer>
    </div>
  );
}
