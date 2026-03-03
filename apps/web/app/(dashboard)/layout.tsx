import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/users", label: "Users" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-200 bg-white px-4 py-6">
        <div className="mb-8 px-2">
          <span className="text-lg font-bold text-indigo-600">WalletKit</span>
        </div>
        <nav className="space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto pt-8 border-t border-gray-200">
          <p className="px-2 text-xs text-gray-500 truncate">
            {session.user?.email}
          </p>
          <a
            href="/api/auth/signout"
            className="mt-2 block rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Sign out
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
