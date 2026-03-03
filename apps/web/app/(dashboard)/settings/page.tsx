export const dynamic = "force-dynamic";

export default function SettingsPage(): React.JSX.Element {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        {/* API Key section */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">API Key</h2>
          <p className="mb-4 text-xs text-gray-400">
            Use this key to authenticate requests from your backend.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="password"
              readOnly
              value="wk_••••••••••••••••"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-500"
            />
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reveal
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Rotate
            </button>
          </div>
        </section>

        {/* Workspace section */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Workspace
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Name
              </label>
              <input
                type="text"
                placeholder="My Workspace"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Slug
              </label>
              <input
                type="text"
                placeholder="my-workspace"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Save changes
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
