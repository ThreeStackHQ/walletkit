import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, workspaces } from "@walletkit/db";
import { getRequiredSession } from "@/lib/session";
import { env } from "@/lib/env";

/**
 * GET /api/dashboard/settings — workspace settings scoped to session.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb(env.DATABASE_URL);

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
      apiKeyHint: workspaces.apiKeyHint,
    })
    .from(workspaces)
    .where(eq(workspaces.id, session.user.workspaceId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({ workspace: rows[0] });
}
