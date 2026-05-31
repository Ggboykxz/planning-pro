import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }
    const classes = await db.class.findMany({
      where: { institutionId },
      include: {
        subjects: { include: { subject: true } },
        timetables: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(classes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la récupération des classes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cls = await db.class.create({
      data: {
        institutionId: body.institutionId,
        name: body.name,
        level: body.level,
        department: body.department,
        studentCount: body.studentCount,
        academicYear: body.academicYear,
      },
    });

    // Create class-subject associations if provided
    if (body.subjectIds && Array.isArray(body.subjectIds)) {
      for (const item of body.subjectIds) {
        const subjectId = typeof item === "string" ? item : item.subjectId;
        const hours = typeof item === "object" ? item.hoursPerWeek : null;
        await db.classSubject.create({
          data: {
            classId: cls.id,
            subjectId,
            institutionId: body.institutionId,
            hoursPerWeek: hours,
          },
        });
      }
    }

    return NextResponse.json(cls);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création de la classe" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, subjectIds, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const cls = await db.class.update({
      where: { id },
      data,
    });

    // Update class-subject associations if provided
    if (subjectIds && Array.isArray(subjectIds)) {
      await db.classSubject.deleteMany({ where: { classId: id } });
      for (const item of subjectIds) {
        const subjectId = typeof item === "string" ? item : item.subjectId;
        const hours = typeof item === "object" ? item.hoursPerWeek : null;
        await db.classSubject.create({
          data: {
            classId: id,
            subjectId,
            institutionId: body.institutionId || cls.institutionId,
            hoursPerWeek: hours,
          },
        });
      }
    }

    return NextResponse.json(cls);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la classe" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    await db.class.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression de la classe" }, { status: 500 });
  }
}
