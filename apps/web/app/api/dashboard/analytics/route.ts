import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, gte, sum, desc } from "drizzle-orm";
import { getDb, creditLedgerEntries, creditWallets } from "@walletkit/db";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";

type SessionUser = {
  id: string;
  workspaceId: string | null;
};

function startOfWeek(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const workspaceId = user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }

  const db = getDb(env.DATABASE_URL);
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  // Credits granted this week
  const weekGranted = await db
    .select({ total: sum(creditLedgerEntries.amount) })
    .from(creditLedgerEntries)
    .where(
      and(
        eq(creditLedgerEntries.workspaceId, workspaceId),
        eq(creditLedgerEntries.type, "grant"),
        gte(creditLedgerEntries.createdAt, weekStart),
      ),
    )
    .then((r) => Number(r[0]?.total ?? 0));

  // Credits spent this week
  const weekSpent = await db
    .select({ total: sum(creditLedgerEntries.amount) })
    .from(creditLedgerEntries)
    .where(
      and(
        eq(creditLedgerEntries.workspaceId, workspaceId),
        eq(creditLedgerEntries.type, "spend"),
        gte(creditLedgerEntries.createdAt, weekStart),
      ),
    )
    .then((r) => Number(r[0]?.total ?? 0));

  // Credits granted this month
  const monthGranted = await db
    .select({ total: sum(creditLedgerEntries.amount) })
    .from(creditLedgerEntries)
    .where(
      and(
        eq(creditLedgerEntries.workspaceId, workspaceId),
        eq(creditLedgerEntries.type, "grant"),
        gte(creditLedgerEntries.createdAt, monthStart),
      ),
    )
    .then((r) => Number(r[0]?.total ?? 0));

  // Credits spent this month
  const monthSpent = await db
    .select({ total: sum(creditLedgerEntries.amount) })
    .from(creditLedgerEntries)
    .where(
      and(
        eq(creditLedgerEntries.workspaceId, workspaceId),
        eq(creditLedgerEntries.type, "spend"),
        gte(creditLedgerEntries.createdAt, monthStart),
      ),
    )
    .then((r) => Number(r[0]?.total ?? 0));

  // Top 5 consumers
  const top5 = await db
    .select({
      userId: creditWallets.externalUserId,
      totalSpent: creditWallets.totalSpent,
      balance: creditWallets.balance,
    })
    .from(creditWallets)
    .where(eq(creditWallets.workspaceId, workspaceId))
    .orderBy(desc(creditWallets.totalSpent))
    .limit(5);

  return NextResponse.json({
    week: { granted: weekGranted, spent: weekSpent },
    month: { granted: monthGranted, spent: monthSpent },
    topConsumers: top5,
  });
}
