import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: { userId: string };
}

export async function GET(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = context.params;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // TODO: resolve workspace from apiKey, fetch wallet by externalUserId
  void userId;

  return NextResponse.json(
    {
      balance: 0,
      totalGranted: 0,
      totalSpent: 0,
      lastReset: null,
    },
    { status: 200 },
  );
}
