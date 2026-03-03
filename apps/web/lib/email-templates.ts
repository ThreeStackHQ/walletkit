import { escapeHtml } from "./escape";

/**
 * Generate the daily digest email HTML.
 * All user-supplied values are escaped to prevent XSS.
 */
export function digestEmailHtml(params: {
  workspaceName: string;
  totalGranted: number;
  totalSpent: number;
  lowBalanceCount: number;
  failedWebhooks: number;
}): string {
  const name = escapeHtml(params.workspaceName);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #333;">
  <h2>Daily Digest for ${name}</h2>
  <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Credits Granted</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${params.totalGranted}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Credits Spent</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${params.totalSpent}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Low Balance Wallets</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${params.lowBalanceCount}</td></tr>
    <tr><td style="padding: 8px;">Failed Webhooks</td><td style="padding: 8px; text-align: right;">${params.failedWebhooks}</td></tr>
  </table>
</body>
</html>`;
}

/**
 * Generate a low-balance alert email.
 */
export function lowBalanceEmailHtml(params: {
  workspaceName: string;
  externalUserId: string;
  balance: number;
  threshold: number;
}): string {
  const name = escapeHtml(params.workspaceName);
  const userId = escapeHtml(params.externalUserId);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #333;">
  <h2>Low Balance Alert — ${name}</h2>
  <p>User <strong>${userId}</strong> has a balance of <strong>${params.balance}</strong> credits, which is below the threshold of ${params.threshold}.</p>
</body>
</html>`;
}

/**
 * Generate a grant notification email.
 */
export function grantNotificationEmailHtml(params: {
  workspaceName: string;
  externalUserId: string;
  amount: number;
  note?: string;
}): string {
  const name = escapeHtml(params.workspaceName);
  const userId = escapeHtml(params.externalUserId);
  const noteHtml = params.note ? `<p>Note: ${escapeHtml(params.note)}</p>` : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #333;">
  <h2>Credits Granted — ${name}</h2>
  <p><strong>${params.amount}</strong> credits have been granted to user <strong>${userId}</strong>.</p>
  ${noteHtml}
</body>
</html>`;
}
