import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }
    const teachers = await db.teacher.findMany({
      where: { institutionId },
      include: {
        subjectAssignments: {
          include: { subject: true },
        },
      },
      orderBy: { lastName: "asc" },
    });
    return NextResponse.json(teachers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la récupération des enseignants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const teacher = await db.teacher.create({
      data: {
        institutionId: body.institutionId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        specialization: body.specialization,
        maxHoursPerWeek: body.maxHoursPerWeek,
        unavailableSlots: body.unavailableSlots ? JSON.stringify(body.unavailableSlots) : null,
      },
    });

    // Create subject assignments if provided
    if (body.subjectIds && Array.isArray(body.subjectIds)) {
      for (const subjectId of body.subjectIds) {
        await db.teacherSubject.create({
          data: {
            teacherId: teacher.id,
            subjectId,
            institutionId: body.institutionId,
          },
        });
      }
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création de l'enseignant" }, { status: 500 });
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

    const teacher = await db.teacher.update({
      where: { id },
      data: updateData,
    });

    // Update subject assignments
    if (subjectIds && Array.isArray(subjectIds)) {
      await db.teacherSubject.deleteMany({ where: { teacherId: id } });
      for (const subjectId of subjectIds) {
        await db.teacherSubject.create({
          data: {
            teacherId: id,
            subjectId,
            institutionId: body.institutionId,
          },
        });
      }
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error(error);
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
    await db.teacher.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression de l'enseignant" }, { status: 500 });
  }
}
