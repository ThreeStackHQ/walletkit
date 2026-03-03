export const dynamic = "force-dynamic";

import { Coins, TrendingUp, Users, AlertTriangle } from "lucide-react";
import OverviewChart from "@/components/OverviewChart";

interface DashboardStats {
  creditsGranted: number;
  creditsSpent: number;
  activeUsers: number;
  lowBalanceAlerts: number;
}

async function fetchStats(): Promise<DashboardStats | null> {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/dashboard/stats`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return (await res.json()) as DashboardStats;
  } catch {
    return null;
  }
}

const iconMap = [
  { icon: Coins, color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10" },
];

export default async function OverviewPage(): Promise<React.JSX.Element> {
  const stats = await fetchStats();

  const statCards = [
    {
      label: "Credits Granted",
      value: stats ? stats.creditsGranted.toLocaleString() : "—",
      sub: "all time",
    },
    {
      label: "Credits Spent",
      value: stats ? stats.creditsSpent.toLocaleString() : "—",
      sub: "all time",
    },
    {
      label: "Active Users",
      value: stats ? stats.activeUsers.toLocaleString() : "—",
      sub: "with wallets",
    },
    {
      label: "Low Balance Alerts",
      value: stats ? stats.lowBalanceAlerts.toLocaleString() : "—",
      sub: "balance < 10",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          {stats
            ? "Live data from your WalletKit workspace"
            : "Connect your backend to see live data"}
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => {
          const { icon: Icon, color, bg } = iconMap[i];
          return (
            <div
              key={card.label}
              className="rounded-xl p-5"
              style={{ backgroundColor: "#1e293b" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {card.label}
                </p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "#1e293b" }}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Credits (Last 7 Days)</h2>
            <p className="mt-0.5 text-xs text-slate-500">Granted vs spent per day</p>
          </div>
          <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-400">
            Mock data
          </span>
        </div>
        <OverviewChart />
      </div>
    </div>
  );
}
