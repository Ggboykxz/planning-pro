import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// Simple hash function (same as auth routes)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `h_${Math.abs(hash).toString(36)}_${str.length}_${str.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0).toString(36)}`;
}

// GET /api/users?userId=... - returns current user info
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
    }

    const user = await dataStore.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const userSafe = Object.fromEntries(
      Object.entries(user as any).filter(([k]) => k !== "passwordHash")
    );

    return NextResponse.json({ user: userSafe });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/users - update user info
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, avatar, currentPassword, newPassword } = body;

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
    }

    const user = await dataStore.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Update name if provided
    if (name !== undefined && name !== (user as any).name) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Le nom ne peut pas être vide" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    // Update avatar if provided
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    // Password change requires current password verification
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Mot de passe actuel requis" }, { status: 400 });
      }

      // Verify current password using simpleHash
      const currentHash = simpleHash(currentPassword);
      if (currentHash !== (user as any).passwordHash) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
      }

      updateData.passwordHash = simpleHash(newPassword);
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      const userSafe = Object.fromEntries(
        Object.entries(user as any).filter(([k]) => k !== "passwordHash")
      );
      return NextResponse.json({ user: userSafe });
    }

    const updatedUser = await dataStore.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Create audit log
    await dataStore.auditLog.create({
      data: {
        userId,
        institutionId: (user as any).institutionId || undefined,
        action: "update",
        entity: "user",
        entityId: userId,
        details: `Profil mis à jour: ${Object.keys(updateData).filter(k => k !== "passwordHash").join(", ")}`,
      },
    });

    const updatedSafe = Object.fromEntries(
      Object.entries(updatedUser as any).filter(([k]) => k !== "passwordHash")
    );
    return NextResponse.json({ user: updatedSafe });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
