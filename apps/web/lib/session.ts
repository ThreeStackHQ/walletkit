import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export interface WalletKitSession {
  user: {
    id: string;
    email: string;
    workspaceId: string;
  };
}

/**
 * Get the current session and verify the user has a workspaceId.
 * Returns null if not authenticated or no workspace is assigned.
 */
export async function getRequiredSession(): Promise<WalletKitSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user as { id?: string; email?: string; workspaceId?: string | null };
  if (!user.id || !user.email || !user.workspaceId) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
    },
  };
}
