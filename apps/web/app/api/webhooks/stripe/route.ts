import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { getDb, workspaces, users, creditWallets, creditLedgerEntries } from "@walletkit/db";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    event = stripe.webhooks.constructEvent(buf, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe signature verification failed:", message);
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const db = getDb(env.DATABASE_URL);

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const customerId = paymentIntent.customer as string | null;
    const credits = paymentIntent.metadata?.credits
      ? parseInt(paymentIntent.metadata.credits, 10)
      : null;

    if (customerId && credits && credits > 0) {
      // Find workspace by Stripe customer ID
      const wsRows = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.stripeCustomerId, customerId))
        .limit(1);

      if (wsRows.length > 0) {
        const workspaceId = wsRows[0].id;

        // Find workspace owner (first user linked to this workspace)
        const userRows = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.workspaceId, workspaceId))
          .limit(1);

        if (userRows.length > 0) {
          const ownerId = userRows[0].id;

          // Grant credits to workspace owner wallet
          await db.execute(sql`
            WITH upserted_wallet AS (
              INSERT INTO credit_wallets (id, workspace_id, external_user_id, balance, total_granted, total_spent)
              VALUES (gen_random_uuid()::text, ${workspaceId}, ${ownerId}, ${credits}, ${credits}, 0)
              ON CONFLICT (workspace_id, external_user_id)
              DO UPDATE SET
                balance = credit_wallets.balance + ${credits},
                total_granted = credit_wallets.total_granted + ${credits},
                updated_at = now()
              RETURNING id, balance
            )
            INSERT INTO credit_ledger_entries (id, wallet_id, workspace_id, type, amount, balance_before, balance_after, metadata)
            SELECT
              gen_random_uuid()::text,
              uw.id,
              ${workspaceId},
              'grant',
              ${credits},
              uw.balance - ${credits},
              uw.balance,
              ${JSON.stringify({ source: "stripe", paymentIntentId: paymentIntent.id })}::jsonb
            FROM upserted_wallet uw
          `);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
