import { dataStore } from "@/lib/data-store";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

// GET /api/institution - List institutions for the authenticated user
export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // If user has institutionId on their profile, use that as primary
    // Also check UserInstitution records
    const userInstitutions = await dataStore.userInstitution.findMany({
      where: { userId: authUser.id },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = [];
    for (const ui of userInstitutions) {
      const institution = await dataStore.institution.findUnique({
        where: { id: ui.institutionId },
      });
      if (institution) {
        results.push({
          ...institution,
          userRole: ui.role ?? null,
        });
      }
    }

    // If user has institutionId but no UserInstitution record (legacy data), add it
    if (authUser.institutionId && !results.find((r: { id: string }) => r.id === authUser.institutionId)) {
      const institution = await dataStore.institution.findUnique({
        where: { id: authUser.institutionId! },
      });
      if (institution) {
        results.push({ ...institution, userRole: "admin" });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET /api/institution error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des institutions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: "Le nom de l'établissement est requis" }, { status: 400 });
    }
    if (!body.country) {
      return NextResponse.json({ error: "Le pays est requis" }, { status: 400 });
    }

    const institution = await dataStore.institution.create({
      data: {
        name: body.name,
        type: body.type || "universite",
        country: body.country,
        timezone: body.timezone || "Europe/Paris",
        academieYear: body.academieYear || "2025-2026",
        logo: body.logo || null,
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
        workingDays: typeof body.workingDays === "string" ? body.workingDays : JSON.stringify(body.workingDays || ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]),
        slotDuration: body.slotDuration || 90,
        dayStartTime: body.dayStartTime || "08:00",
        dayEndTime: body.dayEndTime || "18:00",
        breakStartTime: body.breakStartTime || null,
        breakEndTime: body.breakEndTime || null,
        lunchDuration: body.lunchDuration || null,
        educationSystem: body.educationSystem || null,
        gradingSystem: body.gradingSystem || null,
        semesterSystem: body.semesterSystem || null,
      },
    });

    // Create UserInstitution record linking user to this institution as admin
    await dataStore.userInstitution.create({
      data: {
        userId: authUser.id,
        institutionId: institution.id,
        role: "admin",
      },
    });

    // Update user's institutionId if not set
    if (!authUser.institutionId) {
      await dataStore.user.update({
        where: { id: authUser.id },
        data: { institutionId: institution.id },
      });
    }

    return NextResponse.json({ ...institution, userRole: "admin" });
  } catch (error) {
    console.error("POST /api/institution error:", error);
    return NextResponse.json({
      error: "Erreur lors de la création de l'institution",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.workingDays && Array.isArray(data.workingDays)) {
      updateData.workingDays = JSON.stringify(data.workingDays);
    }

    const institution = await dataStore.institution.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(institution);
  } catch (error) {
    console.error("PUT /api/institution error:", error);
    return NextResponse.json({
      error: "Erreur lors de la mise à jour de l'institution",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    await dataStore.institution.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/institution error:", error);
    return NextResponse.json({
      error: "Erreur lors de la suppression de l'institution",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
