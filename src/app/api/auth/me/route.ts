import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  try {
    // In a real app, this would check session/JWT
    // For now, we check for a user-id header or query param
    const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await dataStore.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const { passwordHash: _, ...userSafe } = user as any;

    // Get user's institutions
    const institutions = await dataStore.institution.findMany();

    return NextResponse.json({ user: userSafe, institutions });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
