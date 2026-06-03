import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// GET /api/absences — List absences with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    const teacherId = searchParams.get("teacherId");
    const status = searchParams.get("status");

    if (!institutionId) {
      return NextResponse.json(
        { error: "institutionId est requis" },
        { status: 400 }
      );
    }

    const absences = await dataStore.absence.findMany({
      where: {
        institutionId,
        ...(teacherId ? { teacherId } : {}),
        ...(status ? { status } : {}),
      },
    });

    // Enrich with teacher name and substitute teacher name
    const enriched = await Promise.all(
      absences.map(async (absence) => {
        const teacher = await dataStore.teacher.findUnique({
          where: { id: absence.teacherId },
        });
        let substituteTeacher = null;
        if (absence.substituteTeacherId) {
          substituteTeacher = await dataStore.teacher.findUnique({
            where: { id: absence.substituteTeacherId },
          });
        }
        return {
          ...absence,
          teacherName: teacher
            ? `${teacher.firstName} ${teacher.lastName}`
            : "Inconnu",
          substituteTeacherName: substituteTeacher
            ? `${substituteTeacher.firstName} ${substituteTeacher.lastName}`
            : null,
        };
      })
    );

    return NextResponse.json({ absences: enriched });
  } catch (error) {
    console.error("Erreur lors de la récupération des absences:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des absences" },
      { status: 500 }
    );
  }
}

// POST /api/absences — Create an absence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      institutionId,
      teacherId,
      substituteTeacherId,
      startDate,
      endDate,
      reason,
      status = "pending",
      notes,
    } = body;

    if (!institutionId || !teacherId || !startDate || !endDate || !reason) {
      return NextResponse.json(
        {
          error:
            "institutionId, teacherId, startDate, endDate et reason sont requis",
        },
        { status: 400 }
      );
    }

    const absence = await dataStore.absence.create({
      data: {
        institutionId,
        teacherId,
        substituteTeacherId: substituteTeacherId || null,
        startDate,
        endDate,
        reason,
        status,
        notes: notes || null,
      },
    });

    return NextResponse.json({ absence }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de l'absence:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'absence" },
      { status: 500 }
    );
  }
}

// PUT /api/absences — Update an absence
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, substituteTeacherId, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id est requis" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (substituteTeacherId !== undefined)
      updateData.substituteTeacherId = substituteTeacherId;
    if (notes !== undefined) updateData.notes = notes;

    const absence = await dataStore.absence.update({
      where: { id },
      data: updateData as { status?: string; substituteTeacherId?: string | null; notes?: string | null },
    });

    return NextResponse.json({ absence });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'absence:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'absence" },
      { status: 500 }
    );
  }
}

// DELETE /api/absences — Delete an absence
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id est requis" },
        { status: 400 }
      );
    }

    const absence = await dataStore.absence.delete({
      where: { id },
    });

    return NextResponse.json({ absence });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'absence:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'absence" },
      { status: 500 }
    );
  }
}
