import { createHash, randomBytes } from "node:crypto";

/**
 * Generate a new API key. Returns the plaintext (shown once) and the SHA-256 hash (stored).
 */
export function generateApiKey(): { plaintext: string; hash: string; hint: string } {
  const raw = randomBytes(32).toString("hex");
  const plaintext = `wk_${raw}`;
  const hash = createHash("sha256").update(plaintext).digest("hex");
  const hint = `wk_...${raw.slice(-6)}`;
  return { plaintext, hash, hint };
}

/**
 * Hash an API key for lookup/comparison.
 */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
