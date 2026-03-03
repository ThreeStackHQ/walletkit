import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ledgerTypeEnum = pgEnum("ledger_type", ["grant", "spend", "reset", "expire"]);
export const planEnum = pgEnum("plan", ["free", "indie", "pro"]);

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  apiKeyHash: text("api_key_hash"),
  apiKeyHint: text("api_key_hint"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Credit Wallets ───────────────────────────────────────────────────────────

export const creditWallets = pgTable(
  "credit_wallets",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    balance: integer("balance").notNull().default(0),
    totalGranted: integer("total_granted").notNull().default(0),
    totalSpent: integer("total_spent").notNull().default(0),
    lastResetAt: timestamp("last_reset_at"),
    lowBalanceThreshold: integer("low_balance_threshold").notNull().default(10),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueUserPerWorkspace: uniqueIndex("unique_user_per_workspace").on(
      t.workspaceId,
      t.externalUserId,
    ),
  }),
);

// ─── Credit Ledger Entries ────────────────────────────────────────────────────

export const creditLedgerEntries = pgTable(
  "credit_ledger_entries",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    walletId: text("wallet_id")
      .notNull()
      .references(() => creditWallets.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    type: ledgerTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueIdempotency: uniqueIndex("unique_idempotency").on(
      t.workspaceId,
      t.idempotencyKey,
    ),
  }),
);

// ─── Credit Packs ─────────────────────────────────────────────────────────────

export const creditPacks = pgTable("credit_packs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  stripePriceId: text("stripe_price_id"),
  /** Price in cents (USD) */
  priceUsd: integer("price_usd").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Webhook Endpoints ────────────────────────────────────────────────────────

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  events: text("events").array().notNull().default([]),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Webhook Deliveries ───────────────────────────────────────────────────────

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  endpointId: text("endpoint_id")
    .notNull()
    .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  /** pending | delivered | failed */
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" })
    .unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  plan: planEnum("plan").notNull(),
  /** Day of month for credit resets (1–28) */
  resetDay: integer("reset_day").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── NextAuth Tables ──────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (t) => ({
    compositePk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (t) => ({
    compositePk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);
