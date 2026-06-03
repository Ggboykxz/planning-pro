import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// GET /api/backup?institutionId=xxx — Export all institution data as JSON
export async function GET(req: NextRequest) {
  try {
    const institutionId = req.nextUrl.searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }

    const institution = await dataStore.institution.findUnique({ where: { id: institutionId } });
    if (!institution) {
      return NextResponse.json({ error: "Établissement non trouvé" }, { status: 404 });
    }

    const teachers = await dataStore.teacher.findMany({ where: { institutionId } });
    const rooms = await dataStore.room.findMany({ where: { institutionId } });
    const subjects = await dataStore.subject.findMany({ where: { institutionId } });
    const classes = await dataStore.class.findMany({ where: { institutionId } });
    const timeSlots = await dataStore.timeSlot.findMany({ where: { institutionId } });

    // Fetch timetables for this institution
    const timetables = await dataStore.timetable.findMany({ where: { institutionId } });

    // Fetch timetable slots for those timetables
    const timetableIds = timetables.map((t) => t.id);
    const allSlots = await dataStore.timetableSlot.findMany({});
    const timetableSlots = allSlots.filter((s) => timetableIds.includes(s.timetableId));

    // Fetch teacher subjects and class subjects
    const teacherSubjects = await dataStore.teacherSubject.findMany({ where: { institutionId } });
    const classSubjects = await dataStore.classSubject.findMany({ where: { institutionId } });

    const backupData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: "1.0",
        institutionName: institution.name,
        institutionId: institution.id,
      },
      institution,
      teachers,
      rooms,
      subjects,
      classes,
      timeSlots,
      timetables,
      timetableSlots,
      teacherSubjects,
      classSubjects,
    };

    const filename = `planningpro-backup-${institution.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup export error:", error);
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 });
  }
}

// POST /api/backup — Import/restore data from JSON
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate structure
    if (!body.metadata || !body.metadata.version) {
      return NextResponse.json({ error: "Format de sauvegarde invalide — metadata manquante" }, { status: 400 });
    }

    const institutionId = body.metadata.institutionId || body.institution?.id;
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId manquant dans la sauvegarde" }, { status: 400 });
    }

    const summary: Record<string, number> = {};

    // Import institution
    if (body.institution) {
      try {
        const existing = await dataStore.institution.findUnique({ where: { id: institutionId } });
        if (existing) {
          await dataStore.institution.update({ where: { id: institutionId }, data: body.institution });
        } else {
          await dataStore.institution.create({ data: body.institution });
        }
      } catch { /* skip */ }
      summary.institution = 1;
    }

    // Import teachers
    if (Array.isArray(body.teachers)) {
      let count = 0;
      for (const teacher of body.teachers) {
        try {
          const existing = await dataStore.teacher.findUnique({ where: { id: teacher.id } });
          if (existing) {
            await dataStore.teacher.update({ where: { id: teacher.id }, data: teacher });
          } else {
            await dataStore.teacher.create({ data: teacher });
          }
          count++;
        } catch { /* skip */ }
      }
      summary.teachers = count;
    }

    // Import rooms
    if (Array.isArray(body.rooms)) {
      let count = 0;
      for (const room of body.rooms) {
        try {
          const existing = await dataStore.room.findUnique({ where: { id: room.id } });
          if (existing) {
            await dataStore.room.update({ where: { id: room.id }, data: room });
          } else {
            await dataStore.room.create({ data: room });
          }
          count++;
        } catch { /* skip */ }
      }
      summary.rooms = count;
    }

    // Import subjects
    if (Array.isArray(body.subjects)) {
      let count = 0;
      for (const subject of body.subjects) {
        try {
          const existing = await dataStore.subject.findUnique({ where: { id: subject.id } });
          if (existing) {
            await dataStore.subject.update({ where: { id: subject.id }, data: subject });
          } else {
            await dataStore.subject.create({ data: subject });
          }
          count++;
        } catch { /* skip */ }
      }
      summary.subjects = count;
    }

    // Import classes
    if (Array.isArray(body.classes)) {
      let count = 0;
      for (const cls of body.classes) {
        try {
          const existing = await dataStore.class.findUnique({ where: { id: cls.id } });
          if (existing) {
            await dataStore.class.update({ where: { id: cls.id }, data: cls });
          } else {
            await dataStore.class.create({ data: cls });
          }
          count++;
        } catch { /* skip */ }
      }
      summary.classes = count;
    }

    // Import time slots
    if (Array.isArray(body.timeSlots)) {
      let count = 0;
      for (const ts of body.timeSlots) {
        try {
          const existing = await dataStore.timeSlot.findUnique({ where: { id: ts.id } });
          if (existing) {
            await dataStore.timeSlot.update({ where: { id: ts.id }, data: ts });
          } else {
            await dataStore.timeSlot.create({ data: ts });
          }
          count++;
        } catch { /* skip */ }
      }
      summary.timeSlots = count;
    }

    // Import timetables
    if (Array.isArray(body.timetables)) {
      let count = 0;
      for (const tt of body.timetables) {
        try {
          const existing = await dataStore.timetable.findUnique({ where: { id: tt.id } });
          if (existing) {
            await dataStore.timetable.update({ where: { id: tt.id }, data: tt });
          } else {
            await dataStore.timetable.create({ data: tt });
          }
          count++;
        } catch { /* skip */ }
      }
      summary.timetables = count;
    }

    // Import timetable slots (use findMany with id filter since no findUnique)
    if (Array.isArray(body.timetableSlots)) {
      let count = 0;
      for (const slot of body.timetableSlots) {
        try {
          const existing = await dataStore.timetableSlot.findMany({ where: { id: slot.id } });
          if (existing.length > 0) {
            await dataStore.timetableSlot.update({ where: { id: slot.id }, data: slot });
          } else {
            await dataStore.timetableSlot.create({ data: slot });
          }
          count++;
        } catch { /* skip */ }
      }
      summary.timetableSlots = count;
    }

    // Import teacher subjects
    if (Array.isArray(body.teacherSubjects)) {
      let count = 0;
      for (const ts of body.teacherSubjects) {
        try {
          await dataStore.teacherSubject.create({ data: ts });
          count++;
        } catch { /* skip duplicates */ }
      }
      summary.teacherSubjects = count;
    }

    // Import class subjects
    if (Array.isArray(body.classSubjects)) {
      let count = 0;
      for (const cs of body.classSubjects) {
        try {
          await dataStore.classSubject.create({ data: cs });
          count++;
        } catch { /* skip duplicates */ }
      }
      summary.classSubjects = count;
    }

    return NextResponse.json({
      success: true,
      message: "Données importées avec succès",
      summary,
    });
  } catch (error) {
    console.error("Backup import error:", error);
    return NextResponse.json({ error: "Erreur lors de l'import" }, { status: 500 });
  }
}
