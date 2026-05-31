import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }
    const subjects = await db.subject.findMany({
      where: { institutionId },
      include: {
        teacherAssignments: { include: { teacher: true } },
        classSubjects: { include: { class: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la récupération des matières" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subject = await db.subject.create({
      data: {
        institutionId: body.institutionId,
        name: body.name,
        code: body.code,
        hoursPerWeek: body.hoursPerWeek,
        type: body.type,
        semester: body.semester,
        coefficient: body.coefficient,
      },
    });
    return NextResponse.json(subject);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création de la matière" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    const subject = await db.subject.update({
      where: { id },
      data,
    });
    return NextResponse.json(subject);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la matière" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    await db.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression de la matière" }, { status: 500 });
  }
}
