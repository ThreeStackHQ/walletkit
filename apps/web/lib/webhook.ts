import { createHmac } from "crypto";
import { and, eq } from "drizzle-orm";
import { getDb, webhookEndpoints, webhookDeliveries } from "@walletkit/db";
import { env } from "./env";

export async function deliverWebhook(
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getDb(env.DATABASE_URL);
  const endpoints = await db.query.webhookEndpoints.findMany({
    where: and(
      eq(webhookEndpoints.workspaceId, workspaceId),
      eq(webhookEndpoints.isActive, true),
    ),
  });

  for (const endpoint of endpoints) {
    const evts = endpoint.events as string[];
    if (!evts.includes(event) && !evts.includes("*")) continue;

    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        endpointId: endpoint.id,
        event,
        payload,
        status: "pending",
        attempts: 0,
      })
      .returning();

    if (!delivery) continue;

    // fire-and-forget: attempt delivery without blocking
    void attemptDelivery(delivery.id, endpoint.url, endpoint.secret, event, payload);
  }
}

async function attemptDelivery(
  deliveryId: string,
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
  attempt = 1,
): Promise<void> {
  const db = getDb(env.DATABASE_URL);
  const body = JSON.stringify({
    event,
    data: payload,
    timestamp: new Date().toISOString(),
  });
  const sig = createHmac("sha256", secret).update(body).digest("hex");

  let success = false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WalletKit-Signature": `sha256=${sig}`,
        "X-WalletKit-Event": event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    success = res.ok;
  } catch {
    success = false;
  }

  if (success) {
    await db
      .update(webhookDeliveries)
      .set({ status: "delivered", attempts: attempt, lastAttemptAt: new Date() })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }

  const maxAttempts = 3;
  if (attempt >= maxAttempts) {
    await db
      .update(webhookDeliveries)
      .set({ status: "failed", attempts: attempt, lastAttemptAt: new Date() })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }

  // Exponential backoff: 1min, 5min, 30min
  const delays = [60_000, 300_000, 1_800_000];
  const delayMs = delays[attempt - 1] ?? 60_000;
  const nextRetryAt = new Date(Date.now() + delayMs);

  await db
    .update(webhookDeliveries)
    .set({ attempts: attempt, lastAttemptAt: new Date(), nextRetryAt, status: "pending" })
    .where(eq(webhookDeliveries.id, deliveryId));

  setTimeout(() => {
    void attemptDelivery(deliveryId, url, secret, event, payload, attempt + 1);
  }, delayMs);
}
