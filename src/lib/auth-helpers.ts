/**
 * Auth helper for API routes
 * Provides a unified way to get the authenticated user from a request
 */

import { verifySessionToken, SESSION_COOKIE_NAME } from "./auth-server";
import { dataStore } from "./data-store";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  avatar?: string | null;
  institutionId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the authenticated user from a request by reading the session cookie.
 * Returns null if not authenticated.
 * This should be used by all API routes that need auth.
 */
export async function getAuthenticatedUser(
  request: Request
): Promise<AuthUser | null> {
  try {
    // Read cookie from request headers
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [key, ...v] = c.split("=");
        return [key, v.join("=")];
      })
    );

    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) return null;

    // Verify the token
    const result = verifySessionToken(token);
    if (!result) return null;

    // Get user from data store
    const user = await dataStore.user.findUnique({
      where: { id: result.userId },
    });

    if (!user || !user.isActive) return null;

    // Return user without passwordHash
    const { passwordHash: _, ...userSafe } = user as Record<string, unknown> & {
      passwordHash: string;
    };

    return userSafe as unknown as AuthUser;
  } catch {
    return null;
  }
}
