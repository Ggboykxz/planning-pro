import { dataStore, isDatabaseAvailable } from "@/lib/data-store";
import { generateTimeSlots, generateTimetableAdvanced, type GenerationInput } from "@/lib/schedule-utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { institutionId, classId } = body;

    if (!institutionId || !classId) {
      return NextResponse.json({ error: "institutionId et classId requis" }, { status: 400 });
    }

    // Get institution config
    const institution = await dataStore.institution.findUnique({ where: { id: institutionId } });
    if (!institution) {
      return NextResponse.json({ error: "Institution non trouvée" }, { status: 404 });
    }

    // Get class with subjects
    const cls = await dataStore.class.findUnique({
      where: { id: classId },
      include: {
        subjects: { include: { subject: true } },
      },
    });
    if (!cls) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    // Get subjects for this class
    const subjects = (cls.subjects as unknown as Array<Record<string, unknown>>).map((cs) => {
      const subject = cs.subject as Record<string, unknown>;
      return {
        id: subject.id as string,
        name: subject.name as string,
        hoursPerWeek: (cs.hoursPerWeek as number) || (subject.hoursPerWeek as number) || 2,
        type: (subject.type as string) || "cours",
      };
    });

    // Get teachers with their subject assignments
    const allTeachers = await dataStore.teacher.findMany({
      where: { institutionId },
      include: { subjectAssignments: true },
    });

    const teachers = (Array.isArray(allTeachers) ? allTeachers : []).map((t: Record<string, unknown>) => {
      const subjectAssignments = (t.subjectAssignments as Array<Record<string, unknown>>) || [];
      return {
        id: t.id as string,
        firstName: t.firstName as string,
        lastName: t.lastName as string,
        subjectIds: subjectAssignments.map((sa) => sa.subjectId as string),
        maxHoursPerWeek: (t.maxHoursPerWeek as number) || 30,
        unavailableSlots: t.unavailableSlots
          ? (typeof t.unavailableSlots === "string" ? t.unavailableSlots : JSON.stringify(t.unavailableSlots))
          : undefined,
      };
    });

    // Get rooms
    const allRooms = await dataStore.room.findMany({ where: { institutionId } });
    const rooms = (Array.isArray(allRooms) ? allRooms : []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      type: (r.type as string) || "salle_normale",
      capacity: (r.capacity as number) || 30,
    }));

    // Generate time slots from institution config
    const workingDays = JSON.parse(institution.workingDays) as string[];
    const availableSlots = generateTimeSlots(
      workingDays,
      institution.dayStartTime,
      institution.dayEndTime,
      institution.breakStartTime,
      institution.breakEndTime,
      institution.slotDuration
    );

    // Get existing occupied slots from other classes' timetables
    const otherTimetables = await dataStore.timetable.findMany({
      where: {
        institutionId,
        classId: { not: classId },
        isActive: true,
      },
      include: { slots: true },
    });

    const existingSlots = (Array.isArray(otherTimetables) ? otherTimetables : []).flatMap((tt: Record<string, unknown>) => {
      const ttSlots = (tt.slots as Array<Record<string, unknown>>) || [];
      return ttSlots.map((s: Record<string, unknown>) => ({
        teacherId: s.teacherId as string | null,
        roomId: s.roomId as string | null,
        dayOfWeek: s.dayOfWeek as number,
        startTime: s.startTime as string,
        endTime: s.endTime as string,
      }));
    });

    // Get current active timetable for versioning
    const currentTimetable = await dataStore.timetable.findFirst({
      where: { classId, isActive: true },
    });

    // Generate timetable using advanced algorithm
    const result = generateTimetableAdvanced({
      classId,
      className: (cls as Record<string, unknown>).name as string,
      subjects,
      teachers,
      rooms,
      availableSlots,
      existingSlots,
      classStudentCount: ((cls as Record<string, unknown>).studentCount as number) || undefined,
    });

    if (result.slots.length === 0) {
      return NextResponse.json({
        error: "Impossible de générer l'emploi du temps. Vérifiez que les enseignants et salles sont configurés.",
      }, { status: 400 });
    }

    // Deactivate existing timetables for this class
    await dataStore.timetable.updateMany({
      where: { classId, isActive: true },
      data: { isActive: false },
    });

    // Create new timetable with version info
    const newVersion = ((currentTimetable as Record<string, unknown> | null)?.version as number || 0) + 1;

    const timetable = await dataStore.timetable.create({
      data: {
        institutionId,
        classId,
        name: `Emploi du temps ${(cls as Record<string, unknown>).name}`,
        semester: institution.semesterSystem === "semestriel" ? "S1" : undefined,
        academicYear: institution.academieYear,
        isActive: true,
        version: newVersion,
        previousVersionId: (currentTimetable as Record<string, unknown> | null)?.id as string || null,
      },
    });

    // Create time slots for institution if they don't exist
    const existingTimeSlots = await dataStore.timeSlot.findMany({ where: { institutionId } });
    if (existingTimeSlots.length === 0) {
      for (const slot of availableSlots) {
        await dataStore.timeSlot.create({
          data: {
            institutionId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            label: slot.label,
            isBreak: slot.isBreak || false,
          },
        });
      }
    }

    // Get the newly created time slots
    const dbTimeSlots = await dataStore.timeSlot.findMany({ where: { institutionId } });

    // Create timetable slots
    for (const slot of result.slots) {
      const matchingTimeSlot = dbTimeSlots.find(
        (ts) => ts.dayOfWeek === slot.dayOfWeek && ts.startTime === slot.startTime
      );

      await dataStore.timetableSlot.create({
        data: {
          timetableId: timetable.id,
          timeSlotId: matchingTimeSlot?.id || null,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          roomId: slot.roomId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      });
    }

    // Return the complete timetable with score
    const fullResult = await dataStore.timetable.findUnique({
      where: { id: timetable.id },
      include: {
        slots: {
          include: {
            subject: true,
            teacher: true,
            room: true,
          },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        class: true,
      },
    });

    return NextResponse.json({
      ...fullResult,
      score: result.score,
      unassignedSubjects: result.unassignedSubjects,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération de l'emploi du temps" }, { status: 500 });
  }
}
