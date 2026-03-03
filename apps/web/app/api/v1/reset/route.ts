import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const resetSchema = z.object({
  userId: z.string().optional(),
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

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  // TODO: resolve workspace from apiKey, reset balance(s), write ledger entries
  const { userId } = parsed.data;
  void userId;

  return NextResponse.json({ reset: 0 }, { status: 200 });
}
