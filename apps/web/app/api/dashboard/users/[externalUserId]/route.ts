import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, desc } from "drizzle-orm";
import { getDb, creditWallets, creditLedgerEntries } from "@walletkit/db";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";

type SessionUser = {
  id: string;
  workspaceId: string | null;
};

interface RouteContext {
  params: { externalUserId: string };
}

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const workspaceId = user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }

  const { externalUserId } = context.params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const db = getDb(env.DATABASE_URL);

  const wallet = await db.query.creditWallets.findFirst({
    where: and(
      eq(creditWallets.workspaceId, workspaceId),
      eq(creditWallets.externalUserId, externalUserId),
    ),
  });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const entries = await db
    .select()
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.walletId, wallet.id))
    .orderBy(desc(creditLedgerEntries.createdAt))
    .limit(limit)
    .offset(offset);

  const allEntries = await db
    .select({ id: creditLedgerEntries.id })
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.walletId, wallet.id));

  return NextResponse.json({
    wallet: {
      userId: wallet.externalUserId,
      balance: wallet.balance,
      totalGranted: wallet.totalGranted,
      totalSpent: wallet.totalSpent,
      lastReset: wallet.lastResetAt?.toISOString() ?? null,
    },
    ledger: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      balanceBefore: e.balanceBefore,
      balanceAfter: e.balanceAfter,
      idempotencyKey: e.idempotencyKey,
      createdAt: e.createdAt.toISOString(),
    })),
    total: allEntries.length,
    page,
    limit,
  });
}
