import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { withCors, optionsResponse } from "@/lib/cors";
import { resolveWorkspaceFromApiKey } from "@/lib/resolve-api-key";

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

  // TODO: upsert wallet, add balance, write ledger entry — wallet must belong to workspace.id (IDOR guard)
  const { userId, amount } = parsed.data;
  void userId;
  void amount;
  void workspace;

  return withCors(
    NextResponse.json(
      {
        balance: amount,
        transactionId: "stub",
      },
      { status: 200 },
    ),
  );
}
