"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Coins, RefreshCw, ChevronLeft, ChevronRight, Download } from "lucide-react";
import GrantModal from "./GrantModal";

interface LedgerEntry {
  id: string;
  createdAt: string;
  type: "GRANT" | "SPEND" | "RESET";
  amount: number;
  balanceAfter: number;
  note: string | null;
}

interface UserLedger {
  userId: string;
  balance: number;
  totalGranted: number;
  totalSpent: number;
  entries: LedgerEntry[];
  total: number;
}

interface UserDrawerProps {
  userId: string;
  onClose: () => void;
  onRefresh: () => void;
}

const PAGE_SIZE = 25;

function typeBadge(type: LedgerEntry["type"]) {
  const map = {
    GRANT: "bg-emerald-500/15 text-emerald-400",
    SPEND: "bg-red-500/15 text-red-400",
    RESET: "bg-slate-600/50 text-slate-400",
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[type]}`}>
      {type}
    </span>
  );
}

export default function UserDrawer({ userId, onClose, onRefresh }: UserDrawerProps) {
  const [data, setData] = useState<UserLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [showGrant, setShowGrant] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/dashboard/users/${encodeURIComponent(userId)}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch ledger");
      setData((await res.json()) as UserLedger);
    } catch {
      setError("Could not load wallet. Is your backend connected?");
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    void fetchLedger();
  }, [fetchLedger]);

  const handleReset = async () => {
    setResetting(true);
    try {
      await fetch("/api/v1/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setResetConfirm(false);
      await fetchLedger();
      onRefresh();
    } finally {
      setResetting(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = ["Date", "Type", "Amount", "Balance After", "Note"];
    const rows = data.entries.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.type,
      e.amount,
      e.balanceAfter,
      e.note ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${userId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const usedPct =
    data && data.totalGranted > 0
      ? Math.min(100, Math.round((data.totalSpent / data.totalGranted) * 100))
      : 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden shadow-2xl sm:w-[540px]"
        style={{ backgroundColor: "#0f172a" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 px-6 py-4" style={{ backgroundColor: "#1e293b" }}>
          <div>
            <p className="text-xs text-slate-400">User Wallet</p>
            <p className="font-mono text-sm font-semibold text-white">{userId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && !data && (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          )}

          {error && !data && (
            <div className="m-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-6 p-6">
              {/* Balance card */}
              <div className="rounded-xl p-5" style={{ backgroundColor: "#1e293b" }}>
                <p className="mb-1 text-xs text-slate-400">Current Balance</p>
                <p className="text-4xl font-bold text-violet-400">
                  {data.balance.toLocaleString()}
                  <span className="ml-2 text-lg text-slate-500">credits</span>
                </p>

                {/* Usage bar */}
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>Used: {data.totalSpent.toLocaleString()}</span>
                    <span>Total granted: {data.totalGranted.toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-slate-500">{usedPct}% used</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGrant(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
                >
                  <Coins className="h-4 w-4" />
                  Grant Credits
                </button>
                {resetConfirm ? (
                  <div className="flex flex-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setResetConfirm(false)}
                      className="flex-1 rounded-xl border border-slate-600 text-sm text-slate-400 hover:bg-slate-700/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={resetting}
                      className="flex-1 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {resetting ? "Resetting…" : "Confirm"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResetConfirm(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset Wallet
                  </button>
                )}
              </div>

              {/* Ledger */}
              <div className="rounded-xl" style={{ backgroundColor: "#1e293b" }}>
                <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
                  <h3 className="text-sm font-semibold text-white">Transaction History</h3>
                  <button
                    type="button"
                    onClick={exportCSV}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>
                </div>

                {data.entries.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No transactions yet
                  </p>
                ) : (
                  <div className="divide-y divide-slate-700/40">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_80px_70px_80px] gap-2 px-4 py-2 text-xs font-medium text-slate-500">
                      <span>Date</span>
                      <span>Type</span>
                      <span className="text-right">Amount</span>
                      <span className="text-right">Balance</span>
                    </div>
                    {data.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[1fr_80px_70px_80px] items-center gap-2 px-4 py-2.5"
                      >
                        <div>
                          <p className="text-xs text-slate-300">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                          {entry.note && (
                            <p className="truncate text-xs text-slate-500">{entry.note}</p>
                          )}
                        </div>
                        {typeBadge(entry.type)}
                        <p
                          className={`text-right text-xs font-medium ${
                            entry.type === "GRANT"
                              ? "text-emerald-400"
                              : entry.type === "SPEND"
                              ? "text-red-400"
                              : "text-slate-400"
                          }`}
                        >
                          {entry.type === "GRANT" ? "+" : entry.type === "SPEND" ? "-" : ""}
                          {Math.abs(entry.amount)}
                        </p>
                        <p className="text-right text-xs text-slate-400">
                          {entry.balanceAfter}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-700/60 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </button>
                    <span className="text-xs text-slate-500">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grant modal */}
      {showGrant && (
        <GrantModal
          initialUserId={userId}
          onClose={() => setShowGrant(false)}
          onSuccess={() => {
            void fetchLedger();
            onRefresh();
          }}
        />
      )}
    </>
  );
}
