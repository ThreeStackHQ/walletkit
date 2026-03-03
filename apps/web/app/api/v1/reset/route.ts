import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb, creditWallets, creditLedgerEntries } from "@walletkit/db";
import { resolveWorkspace, extractApiKey } from "@/lib/apikey";
import { deliverWebhook } from "@/lib/webhook";
import { env } from "@/lib/env";

const resetSchema = z.object({
  userId: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = extractApiKey(req);
  const workspace = await resolveWorkspace(apiKey);
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (workspace.plan !== "pro") {
    return NextResponse.json(
      { error: "Wallet reset is only available on the Pro plan" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { userId } = parsed.data;
  const db = getDb(env.DATABASE_URL);

  try {
    const walletsToReset = userId
      ? await db.query.creditWallets.findMany({
          where: and(
            eq(creditWallets.workspaceId, workspace.id),
            eq(creditWallets.externalUserId, userId),
          ),
        })
      : await db.query.creditWallets.findMany({
          where: eq(creditWallets.workspaceId, workspace.id),
        });

    let resetCount = 0;
    for (const wallet of walletsToReset) {
      await db.transaction(async (tx) => {
        await tx
          .update(creditWallets)
          .set({ balance: 0, lastResetAt: new Date(), updatedAt: new Date() })
          .where(eq(creditWallets.id, wallet.id));

        await tx.insert(creditLedgerEntries).values({
          walletId: wallet.id,
          workspaceId: workspace.id,
          type: "reset",
          amount: wallet.balance,
          balanceBefore: wallet.balance,
          balanceAfter: 0,
          idempotencyKey: null,
          metadata: null,
        });
      });

      void deliverWebhook(workspace.id, "wallet.reset", {
        userId: wallet.externalUserId,
        previousBalance: wallet.balance,
      });

      resetCount++;
    }

    return NextResponse.json({ reset: resetCount });
  } catch (err) {
    console.error("[reset]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
