/**
 * Server-side authentication utilities
 * HMAC-signed session tokens for cookie-based auth
 */

import { createHmac } from "crypto";

const SECRET_KEY = process.env.AUTH_SECRET || "planningpro_dev_secret_key_2025";
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a signed session token
 * Format: {userId}:{timestamp}:{signature}
 * Signature = HMAC-SHA256(userId + timestamp, SECRET_KEY)
 */
export function generateSessionToken(userId: string): string {
  const timestamp = Date.now().toString(36);
  const signature = createHmac("sha256", SECRET_KEY)
    .update(`${userId}${timestamp}`)
    .digest("hex");

  return `${userId}:${timestamp}:${signature}`;
}

/**
 * Verify a session token and return the parsed data
 * Returns null if the token is invalid or expired
 */
export function verifySessionToken(
  token: string
): { userId: string; expiresAt: Date } | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return null;

    const [userId, timestampStr, signature] = parts;

    // Verify signature
    const expectedSignature = createHmac("sha256", SECRET_KEY)
      .update(`${userId}${timestampStr}`)
      .digest("hex");

    if (signature !== expectedSignature) return null;

    // Check expiration
    const timestamp = parseInt(timestampStr, 36);
    const expiresAt = new Date(timestamp + TOKEN_EXPIRY_MS);

    if (expiresAt < new Date()) return null;

    return { userId, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Cookie configuration for session tokens
 */
export const SESSION_COOKIE_NAME = "planningpro_session";
export const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
}
