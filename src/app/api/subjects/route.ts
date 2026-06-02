import { dataStore, isDatabaseAvailable } from "@/lib/data-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }

    // Try enriched query with DB
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      const subjects = await db.subject.findMany({
        where: { institutionId },
        include: {
          teacherAssignments: { include: { teacher: true } },
          classSubjects: { include: { class: true } },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(subjects);
    }

    // Fallback: basic data
    const subjects = await dataStore.subject.findMany({ where: { institutionId } });
    return NextResponse.json(subjects.map((s) => ({
      ...s,
      teacherAssignments: [],
      classSubjects: [],
    })));
  } catch (error) {
    console.error("GET /api/subjects error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des matières" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subject = await dataStore.subject.create({
      data: {
        institutionId: body.institutionId,
        name: body.name,
        code: body.code || null,
        hoursPerWeek: body.hoursPerWeek || null,
        type: body.type || null,
        semester: body.semester || null,
        coefficient: body.coefficient || null,
      },
    });
    return NextResponse.json(subject);
  } catch (error) {
    console.error("POST /api/subjects error:", error);
    return NextResponse.json({
      error: "Erreur lors de la création de la matière",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    const subject = await dataStore.subject.update({
      where: { id },
      data,
    });
    return NextResponse.json(subject);
  } catch (error) {
    console.error("PUT /api/subjects error:", error);
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
    await dataStore.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/subjects error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression de la matière" }, { status: 500 });
  }
}
