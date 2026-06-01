import { db } from "@/lib/db";
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
    const institution = await db.institution.findUnique({ where: { id: institutionId } });
    if (!institution) {
      return NextResponse.json({ error: "Institution non trouvée" }, { status: 404 });
    }

    // Get class with subjects
    const cls = await db.class.findUnique({
      where: { id: classId },
      include: {
        subjects: { include: { subject: true } },
      },
    });
    if (!cls) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    // Get subjects for this class
    const subjects = cls.subjects.map((cs) => ({
      id: cs.subject.id,
      name: cs.subject.name,
      hoursPerWeek: cs.hoursPerWeek || cs.subject.hoursPerWeek || 2,
      type: cs.subject.type || "cours",
    }));

    // Get teachers with their subject assignments
    const allTeachers = await db.teacher.findMany({
      where: { institutionId },
      include: { subjectAssignments: true },
    });

    const teachers = allTeachers.map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      subjectIds: t.subjectAssignments.map((sa) => sa.subjectId),
      maxHoursPerWeek: t.maxHoursPerWeek || 30,
      unavailableSlots: t.unavailableSlots || undefined,
    }));

    // Get rooms
    const allRooms = await db.room.findMany({ where: { institutionId } });
    const rooms = allRooms.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type || "salle_normale",
      capacity: r.capacity || 30,
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
    const otherTimetables = await db.timetable.findMany({
      where: {
        institutionId,
        classId: { not: classId },
        isActive: true,
      },
      include: { slots: true },
    });

    const existingSlots = otherTimetables.flatMap((tt) =>
      tt.slots.map((s) => ({
        teacherId: s.teacherId,
        roomId: s.roomId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );

    // Get current active timetable for versioning
    const currentTimetable = await db.timetable.findFirst({
      where: { classId, isActive: true },
    });

    // Generate timetable using advanced algorithm
    const result = generateTimetableAdvanced({
      classId,
      className: cls.name,
      subjects,
      teachers,
      rooms,
      availableSlots,
      existingSlots,
      classStudentCount: cls.studentCount || undefined,
    });

    if (result.slots.length === 0) {
      return NextResponse.json({
        error: "Impossible de générer l'emploi du temps. Vérifiez que les enseignants et salles sont configurés.",
      }, { status: 400 });
    }

    // Deactivate existing timetables for this class
    await db.timetable.updateMany({
      where: { classId, isActive: true },
      data: { isActive: false },
    });

    // Create new timetable with version info
    const newVersion = (currentTimetable?.version || 0) + 1;

    const timetable = await db.timetable.create({
      data: {
        institutionId,
        classId,
        name: `Emploi du temps ${cls.name}`,
        semester: institution.semesterSystem === "semestriel" ? "S1" : undefined,
        academicYear: institution.academieYear,
        isActive: true,
        version: newVersion,
        previousVersionId: currentTimetable?.id || null,
      },
    });

    // Create time slots for institution if they don't exist
    const existingTimeSlots = await db.timeSlot.findMany({ where: { institutionId } });
    if (existingTimeSlots.length === 0) {
      for (const slot of availableSlots) {
        await db.timeSlot.create({
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
    const dbTimeSlots = await db.timeSlot.findMany({ where: { institutionId } });

    // Create timetable slots
    for (const slot of result.slots) {
      const matchingTimeSlot = dbTimeSlots.find(
        (ts) => ts.dayOfWeek === slot.dayOfWeek && ts.startTime === slot.startTime
      );

      await db.timetableSlot.create({
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
    const fullResult = await db.timetable.findUnique({
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
