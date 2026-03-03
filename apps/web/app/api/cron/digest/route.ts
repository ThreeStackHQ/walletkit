import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { eq, gte, and, sum, desc } from "drizzle-orm";
import { getDb, workspaces, users, creditLedgerEntries, creditWallets } from "@walletkit/db";
import { env } from "@/lib/env";
import { escapeHtml } from "@/lib/escape";

function startOfWeek(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const provided = authHeader.slice(7);
  const secret = env.CRON_SECRET;
  try {
    const a = Buffer.from(provided.padEnd(secret.length, "\0"));
    const b = Buffer.from(secret.padEnd(provided.length, "\0"));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb(env.DATABASE_URL);
  const weekStart = startOfWeek();

  // Load all workspaces
  const allWorkspaces = await db.query.workspaces.findMany();
  let processed = 0;

  for (const ws of allWorkspaces) {
    // Find workspace owner
    const owner = await db.query.users.findFirst({
      where: eq(users.workspaceId, ws.id),
    });
    if (!owner?.email) continue;

    // Credits granted this week
    const granted = await db
      .select({ total: sum(creditLedgerEntries.amount) })
      .from(creditLedgerEntries)
      .where(
        and(
          eq(creditLedgerEntries.workspaceId, ws.id),
          eq(creditLedgerEntries.type, "grant"),
          gte(creditLedgerEntries.createdAt, weekStart),
        ),
      )
      .then((r) => Number(r[0]?.total ?? 0));

    // Credits spent this week
    const spent = await db
      .select({ total: sum(creditLedgerEntries.amount) })
      .from(creditLedgerEntries)
      .where(
        and(
          eq(creditLedgerEntries.workspaceId, ws.id),
          eq(creditLedgerEntries.type, "spend"),
          gte(creditLedgerEntries.createdAt, weekStart),
        ),
      )
      .then((r) => Number(r[0]?.total ?? 0));

    // Top 5 consumers
    const top5 = await db
      .select({
        userId: creditWallets.externalUserId,
        totalSpent: creditWallets.totalSpent,
      })
      .from(creditWallets)
      .where(eq(creditWallets.workspaceId, ws.id))
      .orderBy(desc(creditWallets.totalSpent))
      .limit(5);

    // Low-balance wallets
    const allWallets = await db.query.creditWallets.findMany({
      where: eq(creditWallets.workspaceId, ws.id),
    });
    const lowBalance = allWallets.filter((w) => w.balance < w.lowBalanceThreshold);

    const html = buildDigestEmail({
      workspaceName: ws.name,
      granted,
      spent,
      top5,
      lowBalance: lowBalance.map((w) => ({
        userId: w.externalUserId,
        balance: w.balance,
        threshold: w.lowBalanceThreshold,
      })),
    });

    try {
      await sendEmail({ to: owner.email, subject: `WalletKit Weekly Digest — ${ws.name}`, html });
      processed++;
    } catch (err) {
      console.error(`[digest] failed to send email to ${owner.email}`, err);
    }
  }

  return NextResponse.json({ ok: true, processed });
}

interface DigestData {
  workspaceName: string;
  granted: number;
  spent: number;
  top5: Array<{ userId: string; totalSpent: number }>;
  lowBalance: Array<{ userId: string; balance: number; threshold: number }>;
}

function buildDigestEmail(data: DigestData): string {
  const { workspaceName, granted, spent, top5, lowBalance } = data;

  const top5Html =
    top5.length > 0
      ? top5
          .map(
            (u, i) =>
              `<li>${i + 1}. ${escapeHtml(u.userId)} — ${u.totalSpent.toLocaleString()} credits spent</li>`,
          )
          .join("")
      : "<li>No activity this week</li>";

  const lowBalanceHtml =
    lowBalance.length > 0
      ? lowBalance
          .map(
            (u) =>
              `<li>${escapeHtml(u.userId)} — ${u.balance} credits (threshold: ${u.threshold})</li>`,
          )
          .join("")
      : "<li>No low-balance wallets 🎉</li>";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>WalletKit Weekly Digest</title>
</head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
  <h1 style="color: #4f46e5;">WalletKit Weekly Digest</h1>
  <p style="color: #555;">Workspace: <strong>${escapeHtml(workspaceName)}</strong></p>

  <h2>Credits This Week</h2>
  <table style="border-collapse: collapse; width: 100%;">
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">✅ Granted</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${granted.toLocaleString()}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">💸 Spent</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${spent.toLocaleString()}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">📦 Net</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${(granted - spent).toLocaleString()}</td>
    </tr>
  </table>

  <h2>Top 5 Consumers (All Time)</h2>
  <ol style="padding-left: 20px;">${top5Html}</ol>

  <h2>⚠️ Low Balance Wallets</h2>
  <ul style="padding-left: 20px;">${lowBalanceHtml}</ul>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">
    This email was sent by <a href="https://walletkit.threestack.io" style="color: #4f46e5;">WalletKit</a>.
    To unsubscribe, manage your settings in the dashboard.
  </p>
</body>
</html>`;
}

async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}
