import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: send daily digest emails to workspace owners with:
  // - total credits granted/spent
  // - wallets below low-balance threshold
  // - failed webhook deliveries

  return NextResponse.json({ ok: true, processed: 0 });
}
