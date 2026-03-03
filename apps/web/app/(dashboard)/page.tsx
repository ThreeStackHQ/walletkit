export const dynamic = "force-dynamic";

interface StatCard {
  label: string;
  value: string;
  change: string;
}

const stats: StatCard[] = [
  { label: "Total Credits Granted", value: "—", change: "+0 this month" },
  { label: "Total Credits Spent", value: "—", change: "+0 this month" },
  { label: "Active Wallets", value: "—", change: "+0 this week" },
  { label: "Low Balance Alerts", value: "—", change: "0 pending" },
];

export default function OverviewPage(): React.JSX.Element {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Overview</h1>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-400">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Placeholder activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Recent Activity
        </h2>
        <p className="text-sm text-gray-400">
          No transactions yet. Grant credits via the API to get started.
        </p>
      </div>
    </div>
  );
}
