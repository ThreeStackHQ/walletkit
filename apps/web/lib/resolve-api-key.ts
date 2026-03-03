import { eq } from "drizzle-orm";
import { getDb, workspaces } from "@walletkit/db";
import { hashApiKey } from "./api-key";
import { env } from "./env";

export interface ResolvedWorkspace {
  id: string;
  plan: "free" | "indie" | "pro";
}

/**
 * Resolve a workspace from an API key by hashing and looking up.
 * Returns null if no matching workspace found.
 */
export async function resolveWorkspaceFromApiKey(
  apiKey: string,
): Promise<ResolvedWorkspace | null> {
  const hash = hashApiKey(apiKey);
  const db = getDb(env.DATABASE_URL);

  const rows = await db
    .select({ id: workspaces.id, plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.apiKeyHash, hash))
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0];
}
