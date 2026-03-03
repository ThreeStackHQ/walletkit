import { randomBytes, createHash } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";
import { and, eq } from "drizzle-orm";
import {
  getDb,
  users,
  accounts,
  sessions,
  verificationTokens,
  workspaces,
} from "@walletkit/db";
import { env } from "@/lib/env";

function buildAdapter(): Adapter {
  const db = getDb(env.DATABASE_URL);

  return {
    async createUser(data: Omit<AdapterUser, "id">) {
      const [row] = await db
        .insert(users)
        .values({
          email: data.email,
          name: data.name ?? null,
          emailVerified: data.emailVerified ?? null,
          image: data.image ?? null,
        })
        .returning();
      return toAdapterUser(row);
    },

    async getUser(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id));
      return row ? toAdapterUser(row) : null;
    },

    async getUserByEmail(email) {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return row ? toAdapterUser(row) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const result = await db
        .select({ user: users })
        .from(accounts)
        .innerJoin(users, eq(accounts.userId, users.id))
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId),
          ),
        );
      const row = result[0];
      return row ? toAdapterUser(row.user) : null;
    },

    async updateUser(data) {
      if (!data.id) throw new Error("User id required");
      const [row] = await db
        .update(users)
        .set({
          name: data.name ?? undefined,
          email: data.email ?? undefined,
          emailVerified: data.emailVerified ?? undefined,
          image: data.image ?? undefined,
        })
        .where(eq(users.id, data.id))
        .returning();
      return toAdapterUser(row);
    },

    async deleteUser(id) {
      await db.delete(users).where(eq(users.id, id));
    },

    async linkAccount(account: AdapterAccount) {
      await db.insert(accounts).values({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token ?? null,
        accessToken: account.access_token ?? null,
        expiresAt: account.expires_at ?? null,
        tokenType: account.token_type ?? null,
        scope: account.scope ?? null,
        idToken: account.id_token ?? null,
        sessionState: account.session_state ?? null,
      });
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId),
          ),
        );
    },

    async createSession(data) {
      const [row] = await db
        .insert(sessions)
        .values({
          sessionToken: data.sessionToken,
          userId: data.userId,
          expires: data.expires,
        })
        .returning();
      return row;
    },

    async getSessionAndUser(sessionToken) {
      const result = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.sessionToken, sessionToken));
      const row = result[0];
      if (!row) return null;
      return { session: row.session, user: toAdapterUser(row.user) };
    },

    async updateSession(data) {
      const [row] = await db
        .update(sessions)
        .set({
          expires: data.expires ?? undefined,
          userId: data.userId ?? undefined,
        })
        .where(eq(sessions.sessionToken, data.sessionToken))
        .returning();
      return row ?? null;
    },

    async deleteSession(sessionToken) {
      await db
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken));
    },

    async createVerificationToken(data) {
      const [row] = await db
        .insert(verificationTokens)
        .values({
          identifier: data.identifier,
          token: data.token,
          expires: data.expires,
        })
        .returning();
      return row ?? null;
    },

    async useVerificationToken({ identifier, token }) {
      const [row] = await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token, token),
          ),
        )
        .returning();
      return row ?? null;
    },
  };
}

type UserRow = typeof users.$inferSelect;

function toAdapterUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.emailVerified,
    name: row.name,
    image: row.image,
  };
}

export const authOptions: NextAuthOptions = {
  adapter: buildAdapter(),
  providers: [
    EmailProvider({
      server: `smtp://resend:${env.RESEND_API_KEY}@smtp.resend.com:465`,
      from: env.FROM_EMAIL,
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (!isNewUser) return;

      const db = getDb(env.DATABASE_URL);
      const email = user.email;
      if (!email) return;

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .then((rows) => rows[0]);

      if (existingUser?.workspaceId) return;

      const domain = email.split("@")[1];
      const slug = domain ? domain.split(".")[0] : "default";

      const apiKeyRaw = randomBytes(32).toString("hex");
      const apiKeyHash = createHash("sha256").update(apiKeyRaw).digest("hex");
      const apiKeyHint = apiKeyRaw.slice(-4);

      const [workspace] = await db
        .insert(workspaces)
        .values({
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          slug: `${slug}-${randomBytes(4).toString("hex")}`,
          apiKeyHash,
          apiKeyPlain: apiKeyRaw,
          apiKeyHint,
        })
        .returning();

      await db
        .update(users)
        .set({ workspaceId: workspace.id })
        .where(eq(users.id, user.id));
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user & {
          id: string;
          workspaceId: string | null;
        };
        sessionUser.id = user.id;

        const db = getDb(env.DATABASE_URL);
        const dbUser = await db
          .select({ workspaceId: users.workspaceId })
          .from(users)
          .where(eq(users.id, user.id))
          .then((rows) => rows[0]);

        sessionUser.workspaceId = dbUser?.workspaceId ?? null;
      }
      return session;
    },
  },
};
