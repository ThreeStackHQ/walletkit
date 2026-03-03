import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { eq } from "drizzle-orm";
import { getDb, users } from "@walletkit/db";
import { env } from "./env";

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER ?? "",
      from: process.env.EMAIL_FROM ?? "noreply@walletkit.threestack.io",
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const extended = session.user as typeof session.user & {
          id: string;
          workspaceId: string | null;
        };
        extended.id = user.id;

        const db = getDb(env.DATABASE_URL);
        const rows = await db
          .select({ workspaceId: users.workspaceId })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        extended.workspaceId = rows[0]?.workspaceId ?? null;
      }
      return session;
    },
  },
};
