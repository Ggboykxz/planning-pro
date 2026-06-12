import { dataStore, isDatabaseAvailable } from "@/lib/data-store";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }

    // Try enriched query with DB
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      const classes = await db.class.findMany({
        where: { institutionId },
        include: {
          subjects: { include: { subject: true } },
          timetables: true,
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(classes);
    }

    // Fallback: basic data with enrichment
    const classes = await dataStore.class.findMany({ where: { institutionId } });
    const classSubjects = await dataStore.classSubject.findMany({ where: { institutionId } });
    const subjects = await dataStore.subject.findMany({ where: { institutionId } });
    const timetables = await dataStore.timetable.findMany({ where: { institutionId } });

    return NextResponse.json(classes.map((c) => ({
      ...c,
      subjects: classSubjects
        .filter((cs) => cs.classId === c.id)
        .map((cs) => ({
          ...cs,
          subject: subjects.find((s) => s.id === cs.subjectId) || null,
        })),
      timetables: timetables.filter((t) => t.classId === c.id),
    })));
  } catch (error) {
    console.error("GET /api/classes error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des classes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const cls = await dataStore.class.create({
      data: {
        institutionId: body.institutionId,
        name: body.name,
        level: body.level || null,
        department: body.department || null,
        studentCount: body.studentCount || null,
        academicYear: body.academicYear || null,
      },
    });

    // Create class-subject associations
    if (body.subjectIds && Array.isArray(body.subjectIds)) {
      if (await isDatabaseAvailable()) {
        try {
          const { db } = await import("@/lib/db");
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
        } catch {
          // Silently skip in fallback mode
        }
      } else {
        for (const item of body.subjectIds) {
          const subjectId = typeof item === "string" ? item : item.subjectId;
          const hours = typeof item === "object" ? item.hoursPerWeek : null;
          await dataStore.classSubject.create({
            data: {
              classId: cls.id,
              subjectId,
              institutionId: body.institutionId,
              hoursPerWeek: hours,
            },
          });
        }
      }
    }

    return NextResponse.json(cls);
  } catch (error) {
    console.error("POST /api/classes error:", error);
    return NextResponse.json({
      error: "Erreur lors de la création de la classe",
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
    const { id, subjectIds, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const cls = await dataStore.class.update({
      where: { id },
      data,
    });

    // Update class-subject associations
    if (subjectIds && Array.isArray(subjectIds)) {
      if (await isDatabaseAvailable()) {
        try {
          const { db } = await import("@/lib/db");
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
        } catch {
          // Silently skip in fallback mode
        }
      } else {
        await dataStore.classSubject.deleteMany({ where: { institutionId: cls.institutionId } });
        for (const item of subjectIds) {
          const subjectId = typeof item === "string" ? item : item.subjectId;
          const hours = typeof item === "object" ? item.hoursPerWeek : null;
          await dataStore.classSubject.create({
            data: {
              classId: id,
              subjectId,
              institutionId: body.institutionId || cls.institutionId,
              hoursPerWeek: hours,
            },
          });
        }
      }
    }

    return NextResponse.json(cls);
  } catch (error) {
    console.error("PUT /api/classes error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la classe" }, { status: 500 });
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
    await dataStore.class.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/classes error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression de la classe" }, { status: 500 });
  }
}
