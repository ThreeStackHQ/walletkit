import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getDb, webhookEndpoints } from "@walletkit/db";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";

type SessionUser = { id: string; workspaceId: string | null };

function getWorkspaceId(session: { user?: unknown } | null): string | null {
  return (session?.user as SessionUser)?.workspaceId ?? null;
}

// GET: list endpoints
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const workspaceId = getWorkspaceId(session);
  if (!session?.user || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb(env.DATABASE_URL);
  const endpoints = await db.query.webhookEndpoints.findMany({
    where: eq(webhookEndpoints.workspaceId, workspaceId),
  });

  return NextResponse.json({
    endpoints: endpoints.map((e) => ({
      id: e.id,
      url: e.url,
      events: e.events,
      isActive: e.isActive,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

// POST: create endpoint
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const workspaceId = getWorkspaceId(session);
  if (!session?.user || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { url, events } = parsed.data;
  const secret = `whsec_${randomBytes(24).toString("hex")}`;

  const db = getDb(env.DATABASE_URL);
  const [endpoint] = await db
    .insert(webhookEndpoints)
    .values({ workspaceId, url, events, secret, isActive: true })
    .returning();

  return NextResponse.json({
    id: endpoint?.id,
    url: endpoint?.url,
    events: endpoint?.events,
    secret, // only returned on creation
    isActive: endpoint?.isActive,
    createdAt: endpoint?.createdAt.toISOString(),
  }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// PATCH: update endpoint
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const workspaceId = getWorkspaceId(session);
  if (!session?.user || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { id, url, events, isActive } = parsed.data;
  const db = getDb(env.DATABASE_URL);

  const updates: Partial<{ url: string; events: string[]; isActive: boolean }> = {};
  if (url !== undefined) updates.url = url;
  if (events !== undefined) updates.events = events;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db
    .update(webhookEndpoints)
    .set(updates)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.workspaceId, workspaceId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  return NextResponse.json({ id: updated.id, url: updated.url, events: updated.events, isActive: updated.isActive });
}

const deleteSchema = z.object({ id: z.string().min(1) });

// DELETE: remove endpoint
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const workspaceId = getWorkspaceId(session);
  if (!session?.user || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { id } = parsed.data;
  const db = getDb(env.DATABASE_URL);

  const [deleted] = await db
    .delete(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.workspaceId, workspaceId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
