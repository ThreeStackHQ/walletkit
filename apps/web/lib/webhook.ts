import { createHmac } from "node:crypto";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1_000;

/**
 * Deliver a webhook event to an endpoint with HMAC-SHA256 signature.
 * Retries with exponential backoff on failure (up to 5 attempts).
 */
export async function deliverWebhook(
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; ok: boolean; attempts: number }> {
  const body = JSON.stringify(payload);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WalletKit-Event": event,
          "X-WalletKit-Timestamp": timestamp,
          "X-WalletKit-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        return { status: res.status, ok: true, attempts: attempt };
      }

      // Non-retryable client errors (4xx except 429)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { status: res.status, ok: false, attempts: attempt };
      }

      // Retryable: 5xx or 429
      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        return { status: res.status, ok: false, attempts: attempt };
      }
    } catch {
      // Network error or timeout — retryable
      if (attempt >= MAX_ATTEMPTS) {
        return { status: 0, ok: false, attempts: attempt };
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { status: 0, ok: false, attempts: MAX_ATTEMPTS };
}
