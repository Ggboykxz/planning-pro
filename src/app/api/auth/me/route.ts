import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Get user's institutions
    const { dataStore } = await import("@/lib/data-store");
    const institutions = await dataStore.institution.findMany();

    return NextResponse.json({ user, institutions });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
