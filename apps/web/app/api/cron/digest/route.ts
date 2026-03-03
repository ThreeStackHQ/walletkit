import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

function verifySecret(header: string | null): boolean {
  if (!header) return false;
  const token = header.replace("Bearer ", "");
  if (token.length !== env.CRON_SECRET.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(env.CRON_SECRET));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifySecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: send daily digest emails to workspace owners with:
  // - total credits granted/spent
  // - wallets below low-balance threshold
  // - failed webhook deliveries

  return NextResponse.json({ ok: true, processed: 0 });
}
