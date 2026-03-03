import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getDb, creditWallets, creditLedgerEntries } from "@walletkit/db";
import { rateLimit } from "@/lib/rate-limit";
import { withCors, optionsResponse } from "@/lib/cors";
import { resolveWorkspaceFromApiKey } from "@/lib/resolve-api-key";
import { env } from "@/lib/env";

const grantSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive().max(1_000_000, "amount must not exceed 1,000,000"),
  idempotencyKey: z.string().optional(),
  reason: z.string().optional(),
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

  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 422 },
      ),
    );
  }

  const { userId, amount, idempotencyKey, reason } = parsed.data;
  const db = getDb(env.DATABASE_URL);

  // Idempotency check
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
          balance: existing[0].balanceAfter,
          transactionId: existing[0].id,
        }),
      );
    }
  }

  // Upsert wallet and grant credits atomically
  const result = await db.execute<{
    balance: number;
    transaction_id: string;
  }>(sql`
    WITH upserted_wallet AS (
      INSERT INTO credit_wallets (id, workspace_id, external_user_id, balance, total_granted, total_spent)
      VALUES (gen_random_uuid()::text, ${workspace.id}, ${userId}, ${amount}, ${amount}, 0)
      ON CONFLICT (workspace_id, external_user_id)
      DO UPDATE SET
        balance = credit_wallets.balance + ${amount},
        total_granted = credit_wallets.total_granted + ${amount},
        updated_at = now()
      RETURNING id, balance
    ),
    ledger AS (
      INSERT INTO credit_ledger_entries (id, wallet_id, workspace_id, type, amount, balance_before, balance_after, idempotency_key, metadata)
      SELECT
        gen_random_uuid()::text,
        uw.id,
        ${workspace.id},
        'grant',
        ${amount},
        uw.balance - ${amount},
        uw.balance,
        ${idempotencyKey ?? null},
        ${reason ? JSON.stringify({ reason }) : null}::jsonb
      FROM upserted_wallet uw
      RETURNING id, balance_after
    )
    SELECT l.balance_after as balance, l.id as transaction_id
    FROM ledger l
  `);

  const row = result.rows[0];
  if (!row) {
    return withCors(
      NextResponse.json({ error: "Failed to grant credits" }, { status: 500 }),
    );
  }

  return withCors(
    NextResponse.json({
      balance: row.balance,
      transactionId: row.transaction_id,
    }),
  );
}
