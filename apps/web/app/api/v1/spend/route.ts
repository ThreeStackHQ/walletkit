import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { getDb, creditWallets, creditLedgerEntries } from "@walletkit/db";
import { resolveWorkspace, extractApiKey } from "@/lib/apikey";
import { deliverWebhook } from "@/lib/webhook";
import { env } from "@/lib/env";

const spendSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
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

  const parsed = spendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { userId, amount, idempotencyKey, metadata } = parsed.data;
  const db = getDb(env.DATABASE_URL);

  try {
    const result = await db.transaction(async (tx) => {
      // Idempotency check BEFORE locking
      if (idempotencyKey) {
        const existing = await tx.query.creditLedgerEntries.findFirst({
          where: and(
            eq(creditLedgerEntries.workspaceId, workspace.id),
            eq(creditLedgerEntries.idempotencyKey, idempotencyKey),
          ),
        });
        if (existing) {
          return {
            allowed: true,
            remaining: existing.balanceAfter,
            transactionId: existing.id,
            idempotent: true,
          };
        }
      }

      // SELECT FOR UPDATE to prevent concurrent double-spend
      const rows = await tx.execute(
        sql`SELECT * FROM credit_wallets WHERE workspace_id = ${workspace.id} AND external_user_id = ${userId} FOR UPDATE`,
      );

      type WalletRow = {
        id: string;
        workspace_id: string;
        external_user_id: string;
        balance: number;
        total_granted: number;
        total_spent: number;
        low_balance_threshold: number;
        last_reset_at: Date | null;
        created_at: Date;
        updated_at: Date;
      };

      const wallet = (rows.rows[0] as WalletRow | undefined);
      if (!wallet) {
        return { allowed: false, remaining: 0, transactionId: null };
      }

      if (wallet.balance < amount) {
        return { allowed: false, remaining: wallet.balance, transactionId: null };
      }

      const newBalance = wallet.balance - amount;
      const newTotalSpent = wallet.total_spent + amount;

      await tx
        .update(creditWallets)
        .set({ balance: newBalance, totalSpent: newTotalSpent, updatedAt: new Date() })
        .where(eq(creditWallets.id, wallet.id));

      const [entry] = await tx
        .insert(creditLedgerEntries)
        .values({
          walletId: wallet.id,
          workspaceId: workspace.id,
          type: "spend",
          amount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          idempotencyKey: idempotencyKey ?? null,
          metadata: metadata ?? null,
        })
        .returning();

      return {
        allowed: true,
        remaining: newBalance,
        transactionId: entry?.id ?? null,
        wallet,
        newBalance,
      };
    });

    // Fire webhooks outside transaction
    if (result.allowed && result.wallet) {
      const w = result.wallet as { low_balance_threshold: number };
      if (result.newBalance !== undefined && result.newBalance < w.low_balance_threshold) {
        void deliverWebhook(workspace.id, "balance.low", {
          userId,
          balance: result.newBalance,
          threshold: w.low_balance_threshold,
        });
      }
    }

    return NextResponse.json(
      {
        allowed: result.allowed,
        remaining: result.remaining,
        transactionId: result.transactionId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[spend]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
