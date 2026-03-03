import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function LoginPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">WalletKit</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to your dashboard
          </p>
        </div>

        {/* Magic link sign-in form */}
        <form action="/api/auth/signin/email" method="POST">
          <input
            type="hidden"
            name="callbackUrl"
            value="/"
          />
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Send magic link
          </button>
        </form>
      </div>
    </main>
  );
}
