import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, creditWallets } from "@walletkit/db";
import { getRequiredSession } from "@/lib/session";
import { env } from "@/lib/env";

/**
 * GET /api/dashboard/wallets — list wallets scoped to session workspace.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb(env.DATABASE_URL);

  const wallets = await db
    .select()
    .from(creditWallets)
    .where(eq(creditWallets.workspaceId, session.user.workspaceId))
    .limit(100);

  return NextResponse.json({ wallets });
}
