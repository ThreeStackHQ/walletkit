"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import UserDrawer from "@/components/UserDrawer";
import GrantModal from "@/components/GrantModal";

interface Wallet {
  userId: string;
  balance: number;
  totalSpent7d: number;
  totalGranted: number;
  lastActive: string | null;
  status: "active" | "low";
}

function StatusBadge({ status }: { status: Wallet["status"] }) {
  if (status === "low") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400">
        <AlertTriangle className="h-3 w-3" />
        Low
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
      <CheckCircle className="h-3 w-3" />
      Active
    </span>
  );
}

export default function UsersPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/users");
      if (!res.ok) throw new Error("API error");
      const data = (await res.json()) as Wallet[];
      setWallets(data);
    } catch {
      setError("Connect your backend to see user wallets.");
      // Show mock data for UI preview
      setWallets([
        {
          userId: "user_demo123",
          balance: 250,
          totalSpent7d: 120,
          totalGranted: 500,
          lastActive: new Date().toISOString(),
          status: "active",
        },
        {
          userId: "user_abc456",
          balance: 8,
          totalSpent7d: 340,
          totalGranted: 1000,
          lastActive: new Date(Date.now() - 86400000).toISOString(),
          status: "low",
        },
        {
          userId: "user_xyz789",
          balance: 0,
          totalSpent7d: 0,
          totalGranted: 0,
          lastActive: null,
          status: "active",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWallets();
  }, [fetchWallets]);

  const filtered = wallets.filter((w) =>
    w.userId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            {error
              ? "Showing demo data — connect your backend for live wallets"
              : `${wallets.length} wallets`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGrantModal(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Grant Credits
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-xl bg-orange-500/10 px-4 py-3 text-sm text-orange-400">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2.5">
        <Search className="h-4 w-4 flex-shrink-0 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user ID…"
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "#1e293b" }}>
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_90px] border-b border-slate-700/60 px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
          <span>User ID</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Spent (7d)</span>
          <span className="text-right">Total Granted</span>
          <span className="text-right">Last Active</span>
          <span className="text-right">Status</span>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No wallets found
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {filtered.map((wallet) => (
              <div
                key={wallet.userId}
                onClick={() => setSelectedUserId(wallet.userId)}
                className="grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_1fr_90px] items-center gap-2 px-4 py-3.5 transition-colors hover:bg-slate-700/30"
              >
                <span className="truncate font-mono text-sm font-medium text-white">
                  {wallet.userId}
                </span>
                <span className="text-right text-sm font-semibold text-violet-400">
                  {wallet.balance.toLocaleString()}
                </span>
                <span className="text-right text-sm text-slate-300">
                  {wallet.totalSpent7d.toLocaleString()}
                </span>
                <span className="text-right text-sm text-slate-300">
                  {wallet.totalGranted.toLocaleString()}
                </span>
                <span className="text-right text-xs text-slate-500">
                  {wallet.lastActive
                    ? new Date(wallet.lastActive).toLocaleDateString()
                    : "Never"}
                </span>
                <div className="flex justify-end">
                  <StatusBadge status={wallet.balance < 10 ? "low" : "active"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Drawer */}
      {selectedUserId && (
        <UserDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={fetchWallets}
        />
      )}

      {/* Grant Modal */}
      {showGrantModal && (
        <GrantModal
          onClose={() => setShowGrantModal(false)}
          onSuccess={fetchWallets}
        />
      )}
    </div>
  );
}
