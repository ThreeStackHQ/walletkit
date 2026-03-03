import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const spendSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) {
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

  // TODO: resolve workspace from apiKey, deduct balance, write ledger entry
  const { userId, amount } = parsed.data;
  void userId;
  void amount;

  return NextResponse.json(
    {
      allowed: true,
      remaining: 0,
      transactionId: "stub",
    },
    { status: 200 },
  );
}
