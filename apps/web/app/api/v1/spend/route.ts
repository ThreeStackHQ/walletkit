import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getDb, creditWallets, creditLedgerEntries } from "@walletkit/db";
import { rateLimit } from "@/lib/rate-limit";
import { withCors, optionsResponse } from "@/lib/cors";
import { resolveWorkspaceFromApiKey } from "@/lib/resolve-api-key";
import { env } from "@/lib/env";

const spendSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive().max(1_000_000, "amount must not exceed 1,000,000"),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function OPTIONS(): NextResponse {
  return optionsResponse();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(apiKey, ip);
  if (!rl.allowed) {
    return withCors(
      NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.resetMs },
        { status: 429, headers: { "Retry-After": Math.ceil(rl.resetMs / 1000).toString() } },
      ),
    );
  }

  const workspace = await resolveWorkspaceFromApiKey(apiKey);
  if (!workspace) {
    return withCors(NextResponse.json({ error: "Invalid API key" }, { status: 401 }));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const parsed = spendSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 422 },
      ),
    );
  }

  const { userId, amount, idempotencyKey, metadata } = parsed.data;
  const db = getDb(env.DATABASE_URL);

  // Idempotency check: if this key was already used, return the previous result
  if (idempotencyKey) {
    const existing = await db
      .select()
      .from(creditLedgerEntries)
      .where(
        and(
          eq(creditLedgerEntries.workspaceId, workspace.id),
          eq(creditLedgerEntries.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return withCors(
        NextResponse.json({
          allowed: true,
          remaining: existing[0].balanceAfter,
          transactionId: existing[0].id,
        }),
      );
    }
  }

  // Atomic spend with FOR UPDATE row lock to prevent double-spend
  const result = await db.execute<{
    allowed: boolean;
    remaining: number;
    transaction_id: string | null;
  }>(sql`
    WITH wallet AS (
      SELECT id, balance
      FROM credit_wallets
      WHERE workspace_id = ${workspace.id}
        AND external_user_id = ${userId}
      FOR UPDATE
    ),
    spend AS (
      INSERT INTO credit_ledger_entries (id, wallet_id, workspace_id, type, amount, balance_before, balance_after, idempotency_key, metadata)
      SELECT
        gen_random_uuid()::text,
        w.id,
        ${workspace.id},
        'spend',
        ${amount},
        w.balance,
        w.balance - ${amount},
        ${idempotencyKey ?? null},
        ${metadata ? JSON.stringify(metadata) : null}::jsonb
      FROM wallet w
      WHERE w.balance >= ${amount}
      RETURNING id, balance_after
    ),
    updated AS (
      UPDATE credit_wallets
      SET balance = balance - ${amount},
          total_spent = total_spent + ${amount},
          updated_at = now()
      WHERE id = (SELECT id FROM wallet)
        AND EXISTS (SELECT 1 FROM spend)
      RETURNING balance
    )
    SELECT
      CASE WHEN (SELECT count(*) FROM spend) > 0 THEN true ELSE false END as allowed,
      COALESCE((SELECT balance FROM updated), (SELECT balance FROM wallet), 0) as remaining,
      (SELECT id FROM spend) as transaction_id
  `);

  const row = result.rows[0];
  if (!row) {
    return withCors(
      NextResponse.json({ allowed: false, remaining: 0, error: "Wallet not found" }),
    );
  }

  return withCors(
    NextResponse.json({
      allowed: row.allowed,
      remaining: row.remaining,
      transactionId: row.transaction_id,
    }),
  );
}
