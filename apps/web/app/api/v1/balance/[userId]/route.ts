import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb, creditWallets } from "@walletkit/db";
import { resolveWorkspace, extractApiKey } from "@/lib/apikey";
import { env } from "@/lib/env";

interface RouteContext {
  params: { userId: string };
}

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const apiKey = extractApiKey(req);
  const workspace = await resolveWorkspace(apiKey);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = context.params;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const db = getDb(env.DATABASE_URL);
  const wallet = await db.query.creditWallets.findFirst({
    where: and(
      eq(creditWallets.workspaceId, workspace.id),
      eq(creditWallets.externalUserId, userId),
    ),
  });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json({
    balance: wallet.balance,
    totalGranted: wallet.totalGranted,
    totalSpent: wallet.totalSpent,
    lastReset: wallet.lastResetAt?.toISOString() ?? null,
  });
}
