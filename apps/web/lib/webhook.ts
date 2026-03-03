import { createHmac } from "node:crypto";

/**
 * Deliver a webhook event to an endpoint with HMAC-SHA256 signature.
 */
export async function deliverWebhook(
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; ok: boolean }> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

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

  return { status: res.status, ok: res.ok };
}
