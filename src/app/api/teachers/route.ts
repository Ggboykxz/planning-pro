import { dataStore, isDatabaseAvailable } from "@/lib/data-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }

    const teachers = await dataStore.teacher.findMany({ where: { institutionId } });

    // Enrich with subject assignments and slot count if DB available
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      const enriched = await db.teacher.findMany({
        where: { institutionId },
        include: {
          subjectAssignments: { include: { subject: true } },
          timetableSlots: { select: { id: true } },
        },
        orderBy: { lastName: "asc" },
      });
      return NextResponse.json(enriched);
    }

    // Fallback: return basic teacher data
    return NextResponse.json(teachers.map((t) => ({
      ...t,
      subjectAssignments: [],
      timetableSlots: [],
    })));
  } catch (error) {
    console.error("GET /api/teachers error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des enseignants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const teacher = await dataStore.teacher.create({
      data: {
        institutionId: body.institutionId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || null,
        phone: body.phone || null,
        specialization: body.specialization || null,
        maxHoursPerWeek: body.maxHoursPerWeek || null,
        unavailableSlots: body.unavailableSlots ? JSON.stringify(body.unavailableSlots) : null,
      },
    });

    // Create subject assignments if DB available
    if (body.subjectIds && Array.isArray(body.subjectIds) && await isDatabaseAvailable()) {
      try {
        const { db } = await import("@/lib/db");
        for (const subjectId of body.subjectIds) {
          await db.teacherSubject.create({
            data: {
              teacherId: teacher.id,
              subjectId,
              institutionId: body.institutionId,
            },
          });
        }
      } catch {
        // Silently skip subject assignments in fallback mode
      }
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("POST /api/teachers error:", error);
    return NextResponse.json({
      error: "Erreur lors de la création de l'enseignant",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, subjectIds, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.unavailableSlots && Array.isArray(data.unavailableSlots)) {
      updateData.unavailableSlots = JSON.stringify(data.unavailableSlots);
    }

    const teacher = await dataStore.teacher.update({
      where: { id },
      data: updateData,
    });

    // Update subject assignments if DB available
    if (subjectIds && Array.isArray(subjectIds) && await isDatabaseAvailable()) {
      try {
        const { db } = await import("@/lib/db");
        await db.teacherSubject.deleteMany({ where: { teacherId: id } });
        for (const subjectId of subjectIds) {
          await db.teacherSubject.create({
            data: { teacherId: id, subjectId, institutionId: body.institutionId },
          });
        }
      } catch {
        // Silently skip in fallback mode
      }
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("PUT /api/teachers error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'enseignant" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    await dataStore.teacher.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/teachers error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression de l'enseignant" }, { status: 500 });
  }
}
