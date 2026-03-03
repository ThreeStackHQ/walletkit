import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { getDb, workspaces } from "@walletkit/db";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

type SessionUser = {
  id: string;
  workspaceId: string | null;
};

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (!user.workspaceId) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }

  const db = getDb(env.DATABASE_URL);
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, user.workspaceId),
  });

  if (!workspace?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${env.BASE_URL}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
