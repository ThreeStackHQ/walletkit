export interface SpendOptions {
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface SpendResult {
  allowed: boolean;
  remaining: number;
  transactionId?: string;
  error?: string;
}

export interface GrantOptions {
  idempotencyKey?: string;
  reason?: string;
}

export interface GrantResult {
  balance: number;
  transactionId: string;
}

export interface BalanceResult {
  balance: number;
  totalGranted: number;
  totalSpent: number;
  lastReset: string | null;
}

export interface ResetResult {
  reset: number;
}

export interface WalletKitConfig {
  apiKey: string;
  baseUrl?: string;
}

export class WalletKit {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: WalletKitConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://walletkit.threestack.io";
  }

  private get authHeader(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Deduct credits from a user's wallet.
   * Returns `allowed: false` if the balance is insufficient.
   */
  async spend(
    userId: string,
    amount: number,
    opts?: SpendOptions,
  ): Promise<SpendResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/spend`, {
      method: "POST",
      headers: this.authHeader,
      body: JSON.stringify({
        userId,
        amount,
        idempotencyKey: opts?.idempotencyKey,
        metadata: opts?.metadata,
      }),
    });
    return res.json() as Promise<SpendResult>;
  }

  /**
   * Add credits to a user's wallet.
   */
  async grant(
    userId: string,
    amount: number,
    opts?: GrantOptions,
  ): Promise<GrantResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/grant`, {
      method: "POST",
      headers: this.authHeader,
      body: JSON.stringify({
        userId,
        amount,
        idempotencyKey: opts?.idempotencyKey,
        reason: opts?.reason,
      }),
    });
    return res.json() as Promise<GrantResult>;
  }

  /**
   * Get current balance and stats for a user.
   */
  async balance(userId: string): Promise<BalanceResult> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/balance/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
    return res.json() as Promise<BalanceResult>;
  }

  /**
   * Reset credits for a specific user, or all users in the workspace.
   */
  async reset(userId?: string): Promise<ResetResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/reset`, {
      method: "POST",
      headers: this.authHeader,
      body: JSON.stringify({ userId }),
    });
    return res.json() as Promise<ResetResult>;
  }
}

export default WalletKit;
