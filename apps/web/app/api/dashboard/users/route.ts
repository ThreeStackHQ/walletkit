import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, desc } from "drizzle-orm";
import { getDb, creditWallets } from "@walletkit/db";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";

type SessionUser = {
  id: string;
  workspaceId: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const workspaceId = user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const db = getDb(env.DATABASE_URL);

  const wallets = await db
    .select()
    .from(creditWallets)
    .where(eq(creditWallets.workspaceId, workspaceId))
    .orderBy(desc(creditWallets.totalSpent))
    .limit(limit)
    .offset(offset);

  // total count
  const all = await db
    .select({ id: creditWallets.id })
    .from(creditWallets)
    .where(eq(creditWallets.workspaceId, workspaceId));

  return NextResponse.json({
    users: wallets.map((w) => ({
      userId: w.externalUserId,
      balance: w.balance,
      totalGranted: w.totalGranted,
      totalSpent: w.totalSpent,
      lastReset: w.lastResetAt?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
    })),
    total: all.length,
    page,
    limit,
  });
}
