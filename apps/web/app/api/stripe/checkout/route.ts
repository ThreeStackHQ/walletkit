import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, workspaces } from "@walletkit/db";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

type SessionUser = {
  id: string;
  workspaceId: string | null;
  email?: string | null;
};

const checkoutSchema = z.object({
  priceId: z.string().min(1),
  type: z.enum(["pack", "subscription"]),
});

// Map price IDs to credit amounts
const PACK_CREDITS: Record<string, number> = {
  [env.STRIPE_PRICE_PACK_500]: 500,
  [env.STRIPE_PRICE_PACK_1200]: 1200,
  [env.STRIPE_PRICE_PACK_6000]: 6000,
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (!user.workspaceId) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { priceId, type } = parsed.data;
  const db = getDb(env.DATABASE_URL);
  const stripe = getStripe();

  // Get or create Stripe customer
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, user.workspaceId),
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  let customerId = workspace.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { workspaceId: workspace.id },
    });
    customerId = customer.id;
    await db
      .update(workspaces)
      .set({ stripeCustomerId: customerId })
      .where(eq(workspaces.id, workspace.id));
  }

  const credits = PACK_CREDITS[priceId];

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: type === "subscription" ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.BASE_URL}/billing?success=true`,
    cancel_url: `${env.BASE_URL}/billing?canceled=true`,
    metadata: {
      workspaceId: workspace.id,
      type,
      ...(credits ? { credits: String(credits) } : {}),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
