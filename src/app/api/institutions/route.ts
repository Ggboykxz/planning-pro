import { dataStore } from "@/lib/data-store";
import { generateTimeSlots } from "@/lib/schedule-utils";
import { NextResponse } from "next/server";

// GET /api/institutions?userId=xxx - List all institutions the user has access to
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    // Get all UserInstitution records for this user
    const userInstitutions = await dataStore.userInstitution.findMany({
      where: { userId },
    });

    // Get the institution details for each
    const results = [];
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

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET /api/institutions error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des institutions" },
      { status: 500 }
    );
  }
}

// POST /api/institutions - Create a new institution and link to user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, ...institutionData } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    if (!institutionData.name) {
      return NextResponse.json(
        { error: "Le nom de l'établissement est requis" },
        { status: 400 }
      );
    }

    // Create the institution
    const institution = await dataStore.institution.create({
      data: {
        name: institutionData.name,
        type: institutionData.type || "universite",
        country: institutionData.country || "FR",
        timezone: institutionData.timezone || "Europe/Paris",
        academieYear: institutionData.academieYear || "2025-2026",
        logo: institutionData.logo || null,
        address: institutionData.address || null,
        phone: institutionData.phone || null,
        email: institutionData.email || null,
        workingDays:
          typeof institutionData.workingDays === "string"
            ? institutionData.workingDays
            : JSON.stringify(
                institutionData.workingDays || [
                  "Lundi",
                  "Mardi",
                  "Mercredi",
                  "Jeudi",
                  "Vendredi",
                ]
              ),
        slotDuration: institutionData.slotDuration || 90,
        dayStartTime: institutionData.dayStartTime || "08:00",
        dayEndTime: institutionData.dayEndTime || "18:00",
        breakStartTime: institutionData.breakStartTime || null,
        breakEndTime: institutionData.breakEndTime || null,
        lunchDuration: institutionData.lunchDuration || null,
        educationSystem: institutionData.educationSystem || null,
        gradingSystem: institutionData.gradingSystem || null,
        semesterSystem: institutionData.semesterSystem || null,
      },
    });

    // Create UserInstitution record linking user to this institution as admin
    await dataStore.userInstitution.create({
      data: {
        userId,
        institutionId: institution.id,
        role: "admin",
      },
    });

    // Generate default time slots
    try {
      const workingDays = JSON.parse(institution.workingDays) as string[];
      const slots = generateTimeSlots(
        workingDays,
        institution.dayStartTime,
        institution.dayEndTime,
        institution.breakStartTime,
        institution.breakEndTime,
        institution.slotDuration
      );

      for (const slot of slots) {
        await dataStore.timeSlot.create({
          data: {
            institutionId: institution.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            label: slot.label || null,
            isBreak: slot.isBreak || false,
          },
        });
      }
    } catch (slotError) {
      console.error("Error generating default time slots:", slotError);
      // Don't fail the whole request if time slot generation fails
    }

    // Return the created institution with user role
    return NextResponse.json(
      {
        ...institution,
        userRole: "admin",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/institutions error:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la création de l'institution",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE /api/institutions?institutionId=xxx&userId=xxx - Leave/remove an institution
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    const userId = searchParams.get("userId");

    if (!institutionId || !userId) {
      return NextResponse.json(
        { error: "institutionId et userId requis" },
        { status: 400 }
      );
    }

    // Check user has more than one institution
    const userInstitutions = await dataStore.userInstitution.findMany({
      where: { userId },
    });

    if (userInstitutions.length <= 1) {
      return NextResponse.json(
        { error: "Impossible de quitter le seul établissement" },
        { status: 400 }
      );
    }

    // Find the UserInstitution record by userId + institutionId
    const record = userInstitutions.find(
      (ui: { userId: string; institutionId: string }) =>
        ui.userId === userId && ui.institutionId === institutionId
    );

    if (!record) {
      return NextResponse.json(
        { error: "Lien utilisateur-institution non trouvé" },
        { status: 404 }
      );
    }

    // Delete the UserInstitution record by id
    await dataStore.userInstitution.delete({
      where: { id: record.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/institutions error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du lien" },
      { status: 500 }
    );
  }
}
