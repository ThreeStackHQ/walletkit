import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, creditWallets, creditLedgerEntries } from "@walletkit/db";
import { getRequiredSession } from "@/lib/session";
import { env } from "@/lib/env";

/**
 * GET /api/dashboard/overview — workspace-scoped overview stats.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb(env.DATABASE_URL);
  const workspaceId = session.user.workspaceId;

  const [walletStats] = await db
    .select({
      totalGranted: sql<number>`coalesce(sum(${creditWallets.totalGranted}), 0)`,
      totalSpent: sql<number>`coalesce(sum(${creditWallets.totalSpent}), 0)`,
      activeWallets: sql<number>`count(*)`,
    })
    .from(creditWallets)
    .where(eq(creditWallets.workspaceId, workspaceId));

  const [lowBalance] = await db
    .select({ count: sql<number>`count(*)` })
    .from(creditWallets)
    .where(
      sql`${creditWallets.workspaceId} = ${workspaceId} AND ${creditWallets.balance} <= ${creditWallets.lowBalanceThreshold}`,
    );

  return NextResponse.json({
    totalGranted: walletStats?.totalGranted ?? 0,
    totalSpent: walletStats?.totalSpent ?? 0,
    activeWallets: walletStats?.activeWallets ?? 0,
    lowBalanceAlerts: lowBalance?.count ?? 0,
  });
}
