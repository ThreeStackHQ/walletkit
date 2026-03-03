import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { getDb, workspaces } from "@walletkit/db";
import { env } from "./env";

export async function resolveWorkspace(apiKey: string | null) {
  if (!apiKey) return null;
  const hash = createHash("sha256").update(apiKey).digest("hex");
  const db = getDb(env.DATABASE_URL);
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.apiKeyHash, hash),
  });
  return ws ?? null;
}

export function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    return authHeader.replace(/^Bearer\s+/i, "");
  }
  return req.headers.get("x-api-key");
}
