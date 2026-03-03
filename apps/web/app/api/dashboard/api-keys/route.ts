import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, workspaces } from "@walletkit/db";
import { generateApiKey } from "@/lib/api-key";
import { getRequiredSession } from "@/lib/session";
import { env } from "@/lib/env";

/**
 * POST /api/dashboard/api-keys — rotate API key.
 * SHA-256 hash is stored in the database; plaintext is returned once.
 */
export async function POST(): Promise<NextResponse> {
  const session = await getRequiredSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plaintext, hash, hint } = generateApiKey();
  const db = getDb(env.DATABASE_URL);

  await db
    .update(workspaces)
    .set({
      apiKeyHash: hash,
      apiKeyHint: hint,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, session.user.workspaceId));

  return NextResponse.json({ apiKey: plaintext, hint }, { status: 201 });
}
