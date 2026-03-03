export default function VerifyPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-4 text-4xl">📬</div>
        <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
        <p className="mt-3 text-sm text-gray-500">
          We sent you a magic link. Click it to sign in — no password needed.
        </p>
        <p className="mt-6 text-xs text-gray-400">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <a href="/login" className="text-indigo-600 underline">
            try again
          </a>
          .
        </p>
      </div>
    </main>
  );
}
