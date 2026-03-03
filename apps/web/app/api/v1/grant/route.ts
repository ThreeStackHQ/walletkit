import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { getDb, creditWallets, creditLedgerEntries } from "@walletkit/db";
import { resolveWorkspace, extractApiKey } from "@/lib/apikey";
import { deliverWebhook } from "@/lib/webhook";
import { env } from "@/lib/env";

const grantSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  idempotencyKey: z.string().optional(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = extractApiKey(req);
  const workspace = await resolveWorkspace(apiKey);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { userId, amount, idempotencyKey, reason } = parsed.data;
  const db = getDb(env.DATABASE_URL);

  try {
    const result = await db.transaction(async (tx) => {
      // Idempotency check
      if (idempotencyKey) {
        const existing = await tx.query.creditLedgerEntries.findFirst({
          where: and(
            eq(creditLedgerEntries.workspaceId, workspace.id),
            eq(creditLedgerEntries.idempotencyKey, idempotencyKey),
          ),
        });
        if (existing) {
          const wallet = await tx.query.creditWallets.findFirst({
            where: eq(creditWallets.id, existing.walletId),
          });
          return {
            balance: wallet?.balance ?? existing.balanceAfter,
            transactionId: existing.id,
            idempotent: true,
          };
        }
      }

      // UPSERT wallet
      await tx.execute(
        sql`INSERT INTO credit_wallets (id, workspace_id, external_user_id, balance, total_granted, total_spent, low_balance_threshold, created_at, updated_at)
            VALUES (${sql`gen_random_uuid()`}, ${workspace.id}, ${userId}, 0, 0, 0, 10, NOW(), NOW())
            ON CONFLICT (workspace_id, external_user_id) DO NOTHING`,
      );

      // Now SELECT FOR UPDATE
      const rows = await tx.execute(
        sql`SELECT * FROM credit_wallets WHERE workspace_id = ${workspace.id} AND external_user_id = ${userId} FOR UPDATE`,
      );

      type WalletRow = {
        id: string;
        balance: number;
        total_granted: number;
        total_spent: number;
        low_balance_threshold: number;
      };

      const wallet = rows.rows[0] as WalletRow;
      const newBalance = wallet.balance + amount;
      const newTotalGranted = wallet.total_granted + amount;

      await tx
        .update(creditWallets)
        .set({ balance: newBalance, totalGranted: newTotalGranted, updatedAt: new Date() })
        .where(eq(creditWallets.id, wallet.id));

      const [entry] = await tx
        .insert(creditLedgerEntries)
        .values({
          walletId: wallet.id,
          workspaceId: workspace.id,
          type: "grant",
          amount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          idempotencyKey: idempotencyKey ?? null,
          metadata: reason ? { reason } : null,
        })
        .returning();

      return {
        balance: newBalance,
        transactionId: entry?.id ?? null,
      };
    });

    // Fire webhook outside transaction
    void deliverWebhook(workspace.id, "credits.granted", {
      userId,
      amount,
      balance: result.balance,
    });

    return NextResponse.json({ balance: result.balance, transactionId: result.transactionId }, { status: 200 });
  } catch (err) {
    console.error("[grant]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
