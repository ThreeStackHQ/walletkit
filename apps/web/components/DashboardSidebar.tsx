"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Settings,
  CreditCard,
  Wallet,
  Menu,
  X,
  LogOut,
  Zap,
} from "lucide-react";

const navLinks = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

interface DashboardSidebarProps {
  userEmail: string | null | undefined;
}

export default function DashboardSidebar({ userEmail }: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Wallet className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-white">WalletKit</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(href)
                ? "bg-violet-600/20 text-violet-400"
                : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Plan badge */}
      <div className="mx-3 mb-4 rounded-lg border border-violet-500/30 bg-violet-600/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-semibold text-violet-300">Pro Plan</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">Unlimited API calls</p>
      </div>

      {/* User */}
      <div className="border-t border-slate-700/60 px-3 py-4">
        <p className="mb-2 truncate px-2 text-xs text-slate-500">{userEmail ?? "—"}</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 lg:flex lg:flex-col" style={{ backgroundColor: "#1e293b" }}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex-col shadow-xl"
            style={{ backgroundColor: "#1e293b" }}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
