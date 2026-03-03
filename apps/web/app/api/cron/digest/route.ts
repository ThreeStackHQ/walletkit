import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { eq, and, sql, gte, lt, sum, desc } from "drizzle-orm";
import {
  getDb,
  workspaces,
  creditLedgerEntries,
  creditWallets,
  users,
  subscriptions,
} from "@walletkit/db";
import { env } from "@/lib/env";
import { DigestEmail } from "@/emails/digest";
import type { TopConsumer, LowBalanceWallet } from "@/emails/digest";

// ─── Plan credit limits ──────────────────────────────────────────────────────

const PLAN_MONTHLY_LIMITS: Record<string, number | null> = {
  free: 1_000,
  indie: 50_000,
  pro: 500_000,
};

// ─── Auth helper (timing-safe) ───────────────────────────────────────────────

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const provided = authHeader.slice(7);
  const secret = env.CRON_SECRET;
  try {
    const a = Buffer.from(provided.padEnd(secret.length, "\0"));
    const b = Buffer.from(secret.padEnd(provided.length, "\0"));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const db = getDb(env.DATABASE_URL);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodEnd = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const periodStart = weekAgo.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const allWorkspaces = await db
    .select({ id: workspaces.id, name: workspaces.name, plan: workspaces.plan })
    .from(workspaces);

  let processed = 0;
  const errors: string[] = [];

  for (const ws of allWorkspaces) {
    try {
      // Find workspace owner (first user linked to workspace)
      const ownerRows = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.workspaceId, ws.id))
        .limit(1);

      if (ownerRows.length === 0) continue;
      const owner = ownerRows[0];

      // Credits granted last 7 days
      const grantedRows = await db
        .select({ total: sum(creditLedgerEntries.amount) })
        .from(creditLedgerEntries)
        .where(
          and(
            eq(creditLedgerEntries.workspaceId, ws.id),
            eq(creditLedgerEntries.type, "grant"),
            gte(creditLedgerEntries.createdAt, weekAgo),
            lt(creditLedgerEntries.createdAt, now),
          ),
        );
      const creditsGranted = Number(grantedRows[0]?.total ?? 0);

      // Credits spent last 7 days
      const spentRows = await db
        .select({ total: sum(creditLedgerEntries.amount) })
        .from(creditLedgerEntries)
        .where(
          and(
            eq(creditLedgerEntries.workspaceId, ws.id),
            eq(creditLedgerEntries.type, "spend"),
            gte(creditLedgerEntries.createdAt, weekAgo),
            lt(creditLedgerEntries.createdAt, now),
          ),
        );
      const creditsSpent = Number(spentRows[0]?.total ?? 0);

      // Top 5 users by credits spent (last 7 days)
      const topConsumerRows = await db
        .select({
          externalUserId: creditWallets.externalUserId,
          creditsSpent: sql<number>`coalesce(sum(${creditLedgerEntries.amount}), 0)`,
        })
        .from(creditLedgerEntries)
        .innerJoin(creditWallets, eq(creditLedgerEntries.walletId, creditWallets.id))
        .where(
          and(
            eq(creditLedgerEntries.workspaceId, ws.id),
            eq(creditLedgerEntries.type, "spend"),
            gte(creditLedgerEntries.createdAt, weekAgo),
            lt(creditLedgerEntries.createdAt, now),
          ),
        )
        .groupBy(creditWallets.externalUserId)
        .orderBy(desc(sql`sum(${creditLedgerEntries.amount})`))
        .limit(5);

      const topConsumers: TopConsumer[] = topConsumerRows.map((r) => ({
        externalUserId: r.externalUserId,
        creditsSpent: Number(r.creditsSpent),
      }));

      // Wallets with balance < 100
      const lowBalanceRows = await db
        .select({
          externalUserId: creditWallets.externalUserId,
          balance: creditWallets.balance,
          threshold: creditWallets.lowBalanceThreshold,
        })
        .from(creditWallets)
        .where(
          and(
            eq(creditWallets.workspaceId, ws.id),
            sql`${creditWallets.balance} < 100`,
          ),
        );

      const lowBalanceWallets: LowBalanceWallet[] = lowBalanceRows.map((r) => ({
        externalUserId: r.externalUserId,
        balance: r.balance,
        threshold: r.threshold,
      }));

      // Monthly limit % from subscription plan
      let monthlyLimitUsedPercent: number | null = null;
      const subRows = await db
        .select({ plan: subscriptions.plan })
        .from(subscriptions)
        .where(eq(subscriptions.workspaceId, ws.id))
        .limit(1);

      const activePlan = subRows[0]?.plan ?? ws.plan;
      const monthlyLimit = PLAN_MONTHLY_LIMITS[activePlan] ?? null;

      if (monthlyLimit !== null) {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthSpentRows = await db
          .select({ total: sum(creditLedgerEntries.amount) })
          .from(creditLedgerEntries)
          .where(
            and(
              eq(creditLedgerEntries.workspaceId, ws.id),
              eq(creditLedgerEntries.type, "spend"),
              gte(creditLedgerEntries.createdAt, monthStart),
              lt(creditLedgerEntries.createdAt, now),
            ),
          );
        const monthSpent = Number(monthSpentRows[0]?.total ?? 0);
        monthlyLimitUsedPercent = (monthSpent / monthlyLimit) * 100;
      }

      // Skip if no activity and no alerts
      if (creditsGranted === 0 && creditsSpent === 0 && lowBalanceWallets.length === 0) {
        continue;
      }

      await resend.emails.send({
        from: `WalletKit <${env.FROM_EMAIL}>`,
        to: owner.email,
        subject: `Weekly Digest — ${ws.name}`,
        react: DigestEmail({
          workspaceName: ws.name,
          periodStart,
          periodEnd,
          creditsGranted,
          creditsSpent,
          topConsumers,
          lowBalanceWallets,
          monthlyLimitUsedPercent,
        }),
      });

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`workspace ${ws.id}: ${message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    total: allWorkspaces.length,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
