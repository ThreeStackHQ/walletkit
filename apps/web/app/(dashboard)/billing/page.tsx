export const dynamic = "force-dynamic";

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
    price: "$19/mo",
    features: ["50,000 credits/month", "3 workspaces", "Email support", "Webhooks"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "$79/mo",
    features: [
      "Unlimited credits",
      "10 workspaces",
      "Priority support",
      "Webhooks",
      "Custom reset schedules",
    ],
    highlight: false,
  },
];

export default function BillingPage(): React.JSX.Element {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Billing</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border p-6 shadow-sm ${
              plan.highlight
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <h2 className="mb-1 text-sm font-semibold text-gray-800">
              {plan.name}
            </h2>
            <p className="mb-4 text-2xl font-bold text-gray-900">{plan.price}</p>
            <ul className="space-y-2 text-sm text-gray-600">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium ${
                plan.highlight
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {plan.highlight ? "Current plan" : `Switch to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Payment Method
        </h2>
        <p className="text-sm text-gray-400">No payment method on file.</p>
      </div>
    </div>
  );
}
