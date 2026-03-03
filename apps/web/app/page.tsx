import Link from "next/link";
import { Wallet, Zap, BarChart3, CreditCard, ChevronRight, Shield, Activity } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WalletKit — Credit Wallets for AI SaaS",
  description:
    "Add atomic credit deduction to your LLM app in 2 minutes. Prevent runaway costs, monetize usage, delight users.",
  openGraph: {
    title: "WalletKit — Credit Wallets for AI SaaS",
    description:
      "Add atomic credit deduction to your LLM app in 2 minutes. Prevent runaway costs, monetize usage, delight users.",
    siteName: "WalletKit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WalletKit — Credit Wallets for AI SaaS",
    description:
      "Add atomic credit deduction to your LLM app in 2 minutes. Prevent runaway costs, monetize usage, delight users.",
  },
};

const CODE_SNIPPET = `const result = await wk.spend({
  userId: 'user_abc123',
  credits: 5,
  idempotencyKey: req.headers['x-request-id'],
})

if (!result.allowed) {
  return res.status(402).json({
    error: 'Insufficient credits'
  })
}`;

const FEATURES = [
  {
    icon: Shield,
    title: "Atomic Deduction",
    desc: "PostgreSQL row-level locking. Zero double-spend, zero race conditions. Your credits are always consistent.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: CreditCard,
    title: "Stripe-Integrated",
    desc: "Sell credit packs, auto-grant on successful payment. Full subscription and one-time purchase support.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    desc: "Charts, low-balance alerts, top consumers at a glance. Know who's spending before they churn.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For side projects and prototypes",
    features: ["1,000 API calls/mo", "1 workspace", "Community support"],
    cta: "Get started",
    href: "/login",
    highlight: false,
  },
  {
    name: "Indie",
    price: "$9",
    period: "/month",
    desc: "For solo founders shipping fast",
    features: [
      "Unlimited API calls",
      "3 workspaces",
      "Stripe integration",
      "Email support",
    ],
    cta: "Start free trial",
    href: "/login",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "For growing teams and startups",
    features: [
      "Everything in Indie",
      "Unlimited workspaces",
      "Priority support",
      "Custom webhooks",
      "SLA guarantee",
    ],
    cta: "Contact us",
    href: "/login",
    highlight: false,
  },
];

export default function LandingPage(): React.JSX.Element {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 backdrop-blur-md" style={{ backgroundColor: "rgba(15,23,42,0.85)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">WalletKit</span>
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white">
              Pricing
            </a>
            <a
              href="https://docs.walletkit.io"
              className="text-sm text-slate-400 hover:text-white"
            >
              Docs
            </a>
          </nav>
          <Link
            href="/login"
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          <Zap className="h-3 w-3" />
          Now in public beta — $9/mo
        </div>

        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-white">Credit Wallets</span>
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 50%, #6366f1 100%)",
            }}
          >
            for AI SaaS
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
          Add atomic credit deduction to your LLM app in 2 minutes. Prevent
          runaway costs, monetize usage, delight users.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-700"
          >
            Start for Free
            <ChevronRight className="h-4 w-4" />
          </Link>
          <a
            href="https://docs.walletkit.io"
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 font-medium text-slate-300 hover:bg-slate-800"
          >
            View Docs
          </a>
        </div>
      </section>

      {/* ── Code Block ── */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div
          className="overflow-hidden rounded-2xl border border-slate-700/60 shadow-2xl"
          style={{ backgroundColor: "#1e293b" }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-slate-700/60 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <div className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-slate-500">your-app.js</span>
          </div>
          <pre className="overflow-x-auto p-6 text-sm leading-relaxed">
            <code>
              {CODE_SNIPPET.split("\n").map((line, i) => {
                // Lightweight syntax colouring without a lib
                let coloured = line
                  .replace(
                    /(const|return|if|await)/g,
                    '<span style="color:#c4b5fd">$1</span>'
                  )
                  .replace(
                    /('[\w_-]+')/g,
                    '<span style="color:#86efac">$1</span>'
                  )
                  .replace(
                    /(\/\/.*)/g,
                    '<span style="color:#64748b">$1</span>'
                  )
                  .replace(
                    /(\d+)/g,
                    '<span style="color:#fbbf24">$1</span>'
                  );
                return (
                  <span key={i} dangerouslySetInnerHTML={{ __html: coloured + "\n" }} />
                );
              })}
            </code>
          </pre>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">
          Everything you need to monetize usage
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-700/60 p-6"
              style={{ backgroundColor: "#1e293b" }}
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-slate-800/60 py-12" style={{ backgroundColor: "#1e293b" }}>
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 text-center sm:grid-cols-4">
          {[
            { val: "2 min", label: "Integration time" },
            { val: "99.99%", label: "API uptime SLA" },
            { val: "<50ms", label: "P99 deduction latency" },
            { val: "$9/mo", label: "All-in price" },
          ].map(({ val, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-violet-400">{val}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-4 text-center text-3xl font-bold text-white">Simple pricing</h2>
        <p className="mb-12 text-center text-slate-400">
          No per-seat fees. No usage overages. Just one flat price.
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-violet-500/60 shadow-violet-500/20 shadow-lg"
                  : "border-slate-700/60"
              }`}
              style={{ backgroundColor: "#1e293b" }}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <p className="text-sm font-semibold text-white">{plan.name}</p>
              <p className="mt-2">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">{plan.desc}</p>

              <ul className="my-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Activity className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full rounded-xl py-2.5 text-center text-sm font-medium ${
                  plan.highlight
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "border border-slate-600 text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-violet-600">
              <Wallet className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">WalletKit</span>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ThreeStack. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <a href="/login" className="hover:text-slate-300">
              Dashboard
            </a>
            <a href="https://docs.walletkit.io" className="hover:text-slate-300">
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
