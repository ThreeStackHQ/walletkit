import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, workspaces, creditWallets, creditLedgerEntries, subscriptions, users } from "@walletkit/db";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import type Stripe from "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb(env.DATABASE_URL);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata;
        if (meta.type !== "pack" || !meta.workspaceId || !meta.credits) break;

        const credits = parseInt(meta.credits, 10);
        const workspaceId = meta.workspaceId;
        if (isNaN(credits) || credits <= 0) break;

        // Find workspace owner
        const owner = await db.query.users.findFirst({
          where: eq(users.workspaceId, workspaceId),
        });
        if (!owner) break;

        // UPSERT wallet for workspace owner
        await db.execute(
          sql`INSERT INTO credit_wallets (id, workspace_id, external_user_id, balance, total_granted, total_spent, low_balance_threshold, created_at, updated_at)
              VALUES (gen_random_uuid(), ${workspaceId}, ${owner.id}, 0, 0, 0, 10, NOW(), NOW())
              ON CONFLICT (workspace_id, external_user_id) DO NOTHING`,
        );

        await db.transaction(async (tx) => {
          const rows = await tx.execute(
            sql`SELECT * FROM credit_wallets WHERE workspace_id = ${workspaceId} AND external_user_id = ${owner.id} FOR UPDATE`,
          );
          type WRow = { id: string; balance: number; total_granted: number };
          const wallet = rows.rows[0] as WRow;
          const newBalance = wallet.balance + credits;
          const newTotalGranted = wallet.total_granted + credits;

          await tx
            .update(creditWallets)
            .set({ balance: newBalance, totalGranted: newTotalGranted, updatedAt: new Date() })
            .where(eq(creditWallets.id, wallet.id));

          await tx.insert(creditLedgerEntries).values({
            walletId: wallet.id,
            workspaceId,
            type: "grant",
            amount: credits,
            balanceBefore: wallet.balance,
            balanceAfter: newBalance,
            idempotencyKey: `pi_${pi.id}`,
            metadata: { source: "stripe_pack_purchase" },
          });
        });
        break;
      }

      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        if (cs.mode !== "subscription") break;

        const workspaceId = cs.metadata?.workspaceId;
        if (!workspaceId) break;

        const priceId = cs.line_items?.data[0]?.price?.id;
        let plan: "indie" | "pro" = "indie";
        if (priceId === env.STRIPE_PRICE_PRO) plan = "pro";

        const subscriptionId = cs.subscription as string;
        const stripeCustomerId = cs.customer as string;

        await db
          .update(workspaces)
          .set({ plan, stripeCustomerId, stripeSubscriptionId: subscriptionId, updatedAt: new Date() })
          .where(eq(workspaces.id, workspaceId));

        // Upsert subscription record
        const existing = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.workspaceId, workspaceId),
        });
        if (existing) {
          await db
            .update(subscriptions)
            .set({ stripeSubscriptionId: subscriptionId, plan, updatedAt: new Date() })
            .where(eq(subscriptions.workspaceId, workspaceId));
        } else {
          await db.insert(subscriptions).values({
            workspaceId,
            stripeSubscriptionId: subscriptionId,
            plan,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const ws = await db.query.workspaces.findFirst({
          where: eq(workspaces.stripeSubscriptionId, sub.id),
        });
        if (!ws) break;
        await db
          .update(workspaces)
          .set({ plan: "free", stripeSubscriptionId: null, updatedAt: new Date() })
          .where(eq(workspaces.id, ws.id));
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
