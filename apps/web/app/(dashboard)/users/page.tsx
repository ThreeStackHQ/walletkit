export const dynamic = "force-dynamic";

export default function UsersPage(): React.JSX.Element {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <p className="text-sm font-medium text-gray-700">Credit Wallets</p>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-gray-400">
            No wallets yet. Use the{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              /api/v1/grant
            </code>{" "}
            endpoint to create a wallet for a user.
          </p>
        </div>
      </div>
    </div>
  );
}
