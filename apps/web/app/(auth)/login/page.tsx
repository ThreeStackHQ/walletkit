import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Wallet } from "lucide-react";

export default async function LoginPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "#0f172a" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700/60 p-8 shadow-2xl"
        style={{ backgroundColor: "#1e293b" }}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">WalletKit</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to your dashboard
          </p>
        </div>

        {/* Magic link sign-in form */}
        <form action="/api/auth/signin/email" method="POST">
          <input type="hidden" name="callbackUrl" value="/" />
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            Send magic link
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          We&apos;ll email you a secure link — no password needed.
        </p>
      </div>
    </main>
  );
}
