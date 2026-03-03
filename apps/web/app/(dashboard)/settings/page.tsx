"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Globe,
  Webhook,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
}

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  status: "active" | "failing";
  lastTriggered: string | null;
}

// ─── Mock data ────────────────────────────────────────────────────────

const INITIAL_KEYS: ApiKeyRow[] = [
  {
    id: "1",
    name: "Production",
    prefix: "wk_live_xK3m9…",
    createdAt: "2026-02-01",
    lastUsed: "2026-03-02",
  },
];

const INITIAL_WEBHOOKS: WebhookRow[] = [
  {
    id: "1",
    url: "https://example.com/hooks/walletkit",
    events: ["balance.low", "credits.granted"],
    status: "active",
    lastTriggered: "2026-03-02T14:23:00Z",
  },
];

const WEBHOOK_EVENTS = [
  "balance.low",
  "credits.granted",
  "credits.spent",
  "wallet.reset",
];

// ─── Helper ──────────────────────────────────────────────────────────

function generateFakeKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "wk_live_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// ─── Copy button ─────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── New Key Modal ────────────────────────────────────────────────────

interface NewKeyModalProps {
  onClose: (key?: string) => void;
}

function NewKeyModal({ onClose }: NewKeyModalProps) {
  const [name, setName] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);

  const handleGenerate = () => {
    const key = generateFakeKey();
    setGenerated(key);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onClose(generated ?? undefined)}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: "#1e293b" }}>
        <h2 className="mb-4 text-base font-semibold text-white">
          {generated ? "Save Your API Key" : "Generate New API Key"}
        </h2>

        {!generated ? (
          <>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Key name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production"
              className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="flex-1 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!name.trim()}
                className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Generate
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
              ⚠️ Copy this key now — it won&apos;t be shown again.
            </div>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">
              <code className="flex-1 truncate text-xs text-emerald-400">{generated}</code>
              <CopyButton text={generated} />
            </div>
            <button
              type="button"
              onClick={() => onClose(generated)}
              className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Add Webhook Modal ────────────────────────────────────────────────

interface AddWebhookModalProps {
  onClose: () => void;
  onAdd: (url: string, events: string[]) => void;
}

function AddWebhookModal({ onClose, onAdd }: AddWebhookModalProps) {
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (ev: string) =>
    setSelected((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: "#1e293b" }}>
        <h2 className="mb-4 text-base font-semibold text-white">Add Webhook</h2>

        <label className="mb-1.5 block text-xs font-medium text-slate-300">Endpoint URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/hooks/walletkit"
          className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
        />

        <label className="mb-2 block text-xs font-medium text-slate-300">Events</label>
        <div className="mb-4 space-y-2">
          {WEBHOOK_EVENTS.map((ev) => (
            <label key={ev} className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(ev)}
                onChange={() => toggle(ev)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 accent-violet-500"
              />
              <span className="font-mono text-sm text-slate-300">{ev}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onAdd(url, selected); onClose(); }}
            disabled={!url.trim() || selected.length === 0}
            className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Add Webhook
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>(INITIAL_KEYS);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>(INITIAL_WEBHOOKS);
  const [showNewKey, setShowNewKey] = useState(false);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [workspaceSlug, setWorkspaceSlug] = useState("my-workspace");
  const [showNewKeyCopied, setShowNewKeyCopied] = useState(false);
  const [keyRevealed, setKeyRevealed] = useState<Record<string, boolean>>({});

  const handleNewKey = useCallback((generatedKey?: string) => {
    setShowNewKey(false);
    if (generatedKey) {
      const newKey: ApiKeyRow = {
        id: String(Date.now()),
        name: "New Key",
        prefix: generatedKey.slice(0, 18) + "…",
        createdAt: new Date().toISOString().slice(0, 10),
        lastUsed: null,
      };
      setApiKeys((prev) => [...prev, newKey]);
      setShowNewKeyCopied(true);
      setTimeout(() => setShowNewKeyCopied(false), 3000);
    }
  }, []);

  const revokeKey = (id: string) =>
    setApiKeys((prev) => prev.filter((k) => k.id !== id));

  const addWebhook = (url: string, events: string[]) => {
    const newHook: WebhookRow = {
      id: String(Date.now()),
      url,
      events,
      status: "active",
      lastTriggered: null,
    };
    setWebhooks((prev) => [...prev, newHook]);
  };

  const removeWebhook = (id: string) =>
    setWebhooks((prev) => prev.filter((w) => w.id !== id));

  const toggleReveal = (id: string) =>
    setKeyRevealed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your API keys, webhooks, and workspace</p>
      </div>

      {showNewKeyCopied && (
        <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          ✅ New API key created. Make sure you saved it!
        </div>
      )}

      {/* API Keys */}
      <section className="rounded-xl p-6" style={{ backgroundColor: "#1e293b" }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">API Keys</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowNewKey(true)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Generate New Key
          </button>
        </div>

        {apiKeys.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No API keys yet</p>
        ) : (
          <div className="divide-y divide-slate-700/60 rounded-lg border border-slate-700/60">
            {/* Header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_40px] gap-2 px-4 py-2 text-xs font-medium text-slate-500">
              <span>Name</span>
              <span>Key</span>
              <span>Created</span>
              <span>Last Used</span>
              <span />
            </div>
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="grid grid-cols-[2fr_2fr_1fr_1fr_40px] items-center gap-2 px-4 py-3"
              >
                <span className="text-sm text-white">{key.name}</span>
                <div className="flex items-center gap-2">
                  <code className="truncate font-mono text-xs text-slate-400">
                    {keyRevealed[key.id] ? key.prefix : key.prefix.slice(0, 12) + "••••••••"}
                  </code>
                  <button
                    type="button"
                    onClick={() => toggleReveal(key.id)}
                    className="shrink-0 text-slate-500 hover:text-slate-300"
                  >
                    {keyRevealed[key.id] ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <span className="text-xs text-slate-500">{key.createdAt}</span>
                <span className="text-xs text-slate-500">{key.lastUsed ?? "Never"}</span>
                <button
                  type="button"
                  onClick={() => revokeKey(key.id)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Webhooks */}
      <section className="rounded-xl p-6" style={{ backgroundColor: "#1e293b" }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Webhooks</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAddWebhook(true)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Webhook
          </button>
        </div>

        {webhooks.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No webhooks configured</p>
        ) : (
          <div className="space-y-3">
            {webhooks.map((hook) => (
              <div
                key={hook.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-700/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                    <p className="truncate font-mono text-xs text-slate-300">{hook.url}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hook.events.map((ev) => (
                      <span
                        key={ev}
                        className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Last triggered:{" "}
                    {hook.lastTriggered
                      ? new Date(hook.lastTriggered).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      hook.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {hook.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeWebhook(hook.id)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Workspace */}
      <section className="rounded-xl p-6" style={{ backgroundColor: "#1e293b" }}>
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Workspace</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Name</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">Slug</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2">
              <span className="text-xs text-slate-500">walletkit.io/</span>
              <input
                type="text"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                className="flex-1 bg-transparent font-mono text-sm text-white focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Save Changes
          </button>
        </div>
      </section>

      {/* Modals */}
      {showNewKey && <NewKeyModal onClose={handleNewKey} />}
      {showAddWebhook && (
        <AddWebhookModal
          onClose={() => setShowAddWebhook(false)}
          onAdd={addWebhook}
        />
      )}
    </div>
  );
}
