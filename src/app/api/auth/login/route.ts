import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import {
  generateSessionToken,
  getCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-server";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `h_${Math.abs(hash).toString(36)}_${str.length}_${str.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0).toString(36)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const user = await dataStore.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    const passwordHash = simpleHash(password);
    if (user.passwordHash !== passwordHash) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    // Update last login
    await dataStore.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date().toISOString() },
    });

    // Log the login
    await dataStore.auditLog.create({
      data: {
        userId: user.id,
        institutionId: user.institutionId || undefined,
        action: "login",
        entity: "user",
        entityId: user.id,
      },
    });

    // Generate session token and set cookie
    const token = generateSessionToken(user.id);
    const { passwordHash: _, ...userSafe } = user as any;

    const response = NextResponse.json({ user: userSafe });
    response.cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions());

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erreur lors de la connexion" }, { status: 500 });
  }
}
