import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { withCors, optionsResponse } from "@/lib/cors";
import { resolveWorkspaceFromApiKey } from "@/lib/resolve-api-key";

const resetSchema = z.object({
  userId: z.string().optional(),
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

  if (workspace.plan !== "pro") {
    return withCors(
      NextResponse.json(
        { error: "Reset is only available on the Pro plan" },
        { status: 403 },
      ),
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 422 },
      ),
    );
  }

  // TODO: reset balance(s), write ledger entries — scoped to workspace.id
  const { userId } = parsed.data;
  void userId;
  void workspace;

  return withCors(NextResponse.json({ reset: 0 }, { status: 200 }));
}
