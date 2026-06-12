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

    // Fallback: basic data with enrichment from in-memory store
    const subjects = await dataStore.subject.findMany({ where: { institutionId } });
    const teacherSubjects = await dataStore.teacherSubject.findMany({ where: { institutionId } });
    const classSubjects = await dataStore.classSubject.findMany({ where: { institutionId } });
    const teachers = await dataStore.teacher.findMany({ where: { institutionId } });
    const classes = await dataStore.class.findMany({ where: { institutionId } });

    return NextResponse.json(subjects.map((s) => ({
      ...s,
      teacherAssignments: teacherSubjects
        .filter((ts) => ts.subjectId === s.id)
        .map((ts) => ({
          ...ts,
          teacher: teachers.find((t) => t.id === ts.teacherId) || null,
        })),
      classSubjects: classSubjects
        .filter((cs) => cs.subjectId === s.id)
        .map((cs) => ({
          ...cs,
          class: classes.find((c) => c.id === cs.classId) || null,
        })),
    })));
  } catch (error) {
    console.error("GET /api/subjects error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des matières" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

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

    // Create teacher assignments
    if (body.teacherIds && Array.isArray(body.teacherIds)) {
      if (await isDatabaseAvailable()) {
        try {
          const { db } = await import("@/lib/db");
          for (const teacherId of body.teacherIds) {
            await db.teacherSubject.create({
              data: {
                teacherId,
                subjectId: subject.id,
                institutionId: body.institutionId,
              },
            });
          }
        } catch {
          // Silently skip teacher assignments in fallback mode
        }
      } else {
        // Fallback: create via dataStore
        for (const teacherId of body.teacherIds) {
          await dataStore.teacherSubject.create({
            data: {
              teacherId,
              subjectId: subject.id,
              institutionId: body.institutionId,
            },
          });
        }
      }
    }

    // Create class-subject associations
    if (body.classIds && Array.isArray(body.classIds)) {
      if (await isDatabaseAvailable()) {
        try {
          const { db } = await import("@/lib/db");
          for (const item of body.classIds) {
            const classId = typeof item === "string" ? item : item.classId;
            const hours = typeof item === "object" ? item.hoursPerWeek : null;
            await db.classSubject.create({
              data: {
                classId,
                subjectId: subject.id,
                institutionId: body.institutionId,
                hoursPerWeek: hours,
              },
            });
          }
        } catch {
          // Silently skip class associations in fallback mode
        }
      } else {
        // Fallback: create via dataStore
        for (const item of body.classIds) {
          const classId = typeof item === "string" ? item : item.classId;
          const hours = typeof item === "object" ? item.hoursPerWeek : null;
          await dataStore.classSubject.create({
            data: {
              classId,
              subjectId: subject.id,
              institutionId: body.institutionId,
              hoursPerWeek: hours,
            },
          });
        }
      }
    }

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
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { id, teacherIds, classIds, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    const subject = await dataStore.subject.update({
      where: { id },
      data,
    });

    // Update teacher assignments
    if (teacherIds !== undefined && Array.isArray(teacherIds)) {
      if (await isDatabaseAvailable()) {
        try {
          const { db } = await import("@/lib/db");
          await db.teacherSubject.deleteMany({ where: { subjectId: id } });
          for (const teacherId of teacherIds) {
            await db.teacherSubject.create({
              data: { teacherId, subjectId: id, institutionId: body.institutionId },
            });
          }
        } catch {
          // Silently skip in fallback mode
        }
      } else {
        await dataStore.teacherSubject.deleteMany({ where: { institutionId: body.institutionId } });
        for (const teacherId of teacherIds) {
          await dataStore.teacherSubject.create({
            data: { teacherId, subjectId: id, institutionId: body.institutionId },
          });
        }
      }
    }

    // Update class-subject associations
    if (classIds !== undefined && Array.isArray(classIds)) {
      if (await isDatabaseAvailable()) {
        try {
          const { db } = await import("@/lib/db");
          await db.classSubject.deleteMany({ where: { subjectId: id } });
          for (const item of classIds) {
            const classId = typeof item === "string" ? item : item.classId;
            const hours = typeof item === "object" ? item.hoursPerWeek : null;
            await db.classSubject.create({
              data: { classId, subjectId: id, institutionId: body.institutionId, hoursPerWeek: hours },
            });
          }
        } catch {
          // Silently skip in fallback mode
        }
      } else {
        await dataStore.classSubject.deleteMany({ where: { institutionId: body.institutionId } });
        for (const item of classIds) {
          const classId = typeof item === "string" ? item : item.classId;
          const hours = typeof item === "object" ? item.hoursPerWeek : null;
          await dataStore.classSubject.create({
            data: { classId, subjectId: id, institutionId: body.institutionId, hoursPerWeek: hours },
          });
        }
      }
    }

    return NextResponse.json(subject);
  } catch (error) {
    console.error("PUT /api/subjects error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la matière" }, { status: 500 });
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
    await dataStore.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/subjects error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression de la matière" }, { status: 500 });
  }
}
