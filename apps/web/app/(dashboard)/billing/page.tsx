export const dynamic = "force-dynamic";

import { Activity, CreditCard } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  features: string[];
  highlight: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0/mo",
    features: ["1,000 credits/month", "1 workspace", "Community support"],
    highlight: false,
  },
  {
    name: "Indie",
    price: "$9/mo",
    features: ["Unlimited credits", "3 workspaces", "Email support", "Webhooks"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "$29/mo",
    features: [
      "Everything in Indie",
      "Unlimited workspaces",
      "Priority support",
      "Custom reset schedules",
      "SLA guarantee",
    ],
    highlight: false,
  },
];

export default function BillingPage(): React.JSX.Element {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your plan and payment method</p>
      </div>

      {/* Plans */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-6 ${
              plan.highlight
                ? "border-violet-500/60"
                : "border-slate-700/60"
            }`}
            style={{ backgroundColor: "#1e293b" }}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
                Current Plan
              </div>
            )}
            <h2 className="mb-1 text-sm font-semibold text-white">{plan.name}</h2>
            <p className="mb-4 text-3xl font-bold text-white">{plan.price}</p>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Activity className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-medium ${
                plan.highlight
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "border border-slate-600 text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              {plan.highlight ? "Manage subscription" : `Switch to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Payment method */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "#1e293b" }}>
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Payment Method</h2>
        </div>
        <p className="text-sm text-slate-500">No payment method on file.</p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Add Card
        </button>
      </div>
    </div>
  );
}
