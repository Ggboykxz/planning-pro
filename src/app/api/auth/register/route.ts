import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import {
  generateSessionToken,
  getCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-server";

// Simple hash function (in production, use bcrypt)
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
    const { email, name, password, role, institutionName, institutionType, country } = body;

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Email, nom et mot de passe requis" }, { status: 400 });
    }

    // Validate role
    const validRoles = ["admin", "teacher", "student"];
    const userRole = validRoles.includes(role) ? role : "admin";

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await dataStore.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Un compte avec cet email existe déjà" }, { status: 409 });
    }

    const passwordHash = simpleHash(password);

    // Create institution if provided
    let institutionId: string | null = null;
    if (institutionName) {
      const inst = await dataStore.institution.create({
        data: {
          name: institutionName,
          type: institutionType || "autre",
          country: country || "FR",
          timezone: "Europe/Paris",
          academieYear: "2025-2026",
          workingDays: JSON.stringify(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]),
          slotDuration: 60,
          dayStartTime: "08:00",
          dayEndTime: "18:00",
          breakStartTime: "12:00",
          breakEndTime: "14:00",
        },
      });
      institutionId = inst.id;

      // Generate default time slots
      try {
        await fetch(new URL("/api/timeslots", req.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ institutionId: inst.id, generateFromConfig: true }),
        });
      } catch {}
    }

    // Create user
    const user = await dataStore.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: userRole,
        institutionId: userRole === "student" ? null : institutionId,
        plan: "free",
        isActive: true,
      },
    });

    // Create user-institution link if institution was created
    if (institutionId) {
      try {
        await dataStore.userInstitution.create({
          data: {
            userId: user.id,
            institutionId,
            role: "admin",
          },
        });
      } catch {}
    }

    // Log the registration
    await dataStore.auditLog.create({
      data: {
        userId: user.id,
        institutionId: institutionId || undefined,
        action: "create",
        entity: "user",
        entityId: user.id,
        details: JSON.stringify({ email, name, role: "admin" }),
      },
    });

    // Generate session token and set cookie
    const token = generateSessionToken(user.id);
    const { passwordHash: _, ...userSafe } = user as any;

    const response = NextResponse.json({ user: userSafe, institutionId }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions());

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
