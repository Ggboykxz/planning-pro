import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// POST /api/student/join — Student joins an institution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, institutionId, classId, studentNumber } = body;

    if (!userId || !institutionId) {
      return NextResponse.json(
        { error: "userId et institutionId sont requis" },
        { status: 400 }
      );
    }

    // Verify user exists and is a student
    const user = await dataStore.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Seuls les étudiants peuvent rejoindre un établissement" },
        { status: 403 }
      );
    }

    // Verify institution exists
    const institution = await dataStore.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) {
      return NextResponse.json(
        { error: "Établissement non trouvé" },
        { status: 404 }
      );
    }

    // Check if already joined
    const existing = await dataStore.studentInstitution.findMany({
      where: { userId, institutionId },
    });
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Vous avez déjà rejoint cet établissement" },
        { status: 409 }
      );
    }

    // Create the StudentInstitution link
    const studentInstitution = await dataStore.studentInstitution.create({
      data: {
        userId,
        institutionId,
        classId: classId || null,
        studentNumber: studentNumber || null,
      },
    });

    // Update user's primary institutionId
    await dataStore.user.update({
      where: { id: userId },
      data: { institutionId },
    });

    // Log the action
    await dataStore.auditLog.create({
      data: {
        userId,
        institutionId,
        action: "create",
        entity: "studentInstitution",
        entityId: studentInstitution.id,
        details: JSON.stringify({ institutionName: institution.name }),
      },
    });

    return NextResponse.json(
      {
        message: "Établissement rejoint avec succès",
        studentInstitution,
        institution: {
          id: institution.id,
          name: institution.name,
          type: institution.type,
          country: institution.country,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/student/join error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la rejoindre de l'établissement" },
      { status: 500 }
    );
  }
}
