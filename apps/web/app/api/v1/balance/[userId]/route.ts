import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { withCors, optionsResponse } from "@/lib/cors";
import { resolveWorkspaceFromApiKey } from "@/lib/resolve-api-key";

interface RouteContext {
  params: { userId: string };
}

export function OPTIONS(): NextResponse {
  return optionsResponse();
}

export async function GET(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
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

  const { userId } = context.params;
  if (!userId) {
    return withCors(NextResponse.json({ error: "userId is required" }, { status: 400 }));
  }

  // TODO: fetch wallet by externalUserId — scoped to workspace.id (IDOR guard)
  void userId;
  void workspace;

  return withCors(
    NextResponse.json(
      {
        balance: 0,
        totalGranted: 0,
        totalSpent: 0,
        lastReset: null,
      },
      { status: 200 },
    ),
  );
}
