import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { dataStore } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Get user's institutions via UserInstitution records
    const userInstitutions = await dataStore.userInstitution.findMany({
      where: { userId: user.id },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const institutions: any[] = [];
    for (const ui of userInstitutions) {
      const institution = await dataStore.institution.findUnique({
        where: { id: ui.institutionId },
      });
      if (institution) {
        institutions.push({ ...institution, userRole: ui.role ?? null });
      }
    }

    // If user has institutionId but no UserInstitution record (legacy), add it
    if (user.institutionId && !institutions.find((i) => i.id === user.institutionId)) {
      const institution = await dataStore.institution.findUnique({
        where: { id: user.institutionId },
      });
      if (institution) {
        institutions.push({ ...institution, userRole: "admin" });
      }
    }

    return NextResponse.json({ user, institutions });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
