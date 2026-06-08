import { dataStore, isDatabaseAvailable, checkPlanLimit } from "@/lib/data-store";
import { NextResponse } from "next/server";

// Helper: Enrich a single slot with subject/teacher/room data (for fallback mode)
async function enrichSlot(slot: Record<string, unknown>) {
  const dbAvailable = await isDatabaseAvailable();
  if (dbAvailable) {
    // When DB is available, dataStore methods already include relations via Prisma
    return slot;
  }

  const subjects = await dataStore.subject.findMany();
  const teachers = await dataStore.teacher.findMany();
  const rooms = await dataStore.room.findMany();

  return {
    ...slot,
    subject: slot.subjectId
      ? subjects.find((s) => s.id === slot.subjectId) || null
      : null,
    teacher: slot.teacherId
      ? teachers.find((t) => t.id === slot.teacherId) || null
      : null,
    room: slot.roomId
      ? rooms.find((r) => r.id === slot.roomId) || null
      : null,
  };
}

// Helper: Enrich an array of slots
async function enrichSlots(slots: Record<string, unknown>[]) {
  const dbAvailable = await isDatabaseAvailable();
  if (dbAvailable) {
    // When DB is available, dataStore methods already include relations via Prisma
    return slots;
  }

  if (slots.length === 0) return slots;

  const subjects = await dataStore.subject.findMany();
  const teachers = await dataStore.teacher.findMany();
  const rooms = await dataStore.room.findMany();

  return slots.map((slot) => ({
    ...slot,
    subject: slot.subjectId
      ? subjects.find((s) => s.id === slot.subjectId) || null
      : null,
    teacher: slot.teacherId
      ? teachers.find((t) => t.id === slot.teacherId) || null
      : null,
    room: slot.roomId
      ? rooms.find((r) => r.id === slot.roomId) || null
      : null,
  }));
}

// Helper: Sort slots by dayOfWeek then startTime
function sortSlots(slots: Record<string, unknown>[]) {
  return slots.sort((a, b) => {
    const dayA = (a.dayOfWeek as number) ?? 0;
    const dayB = (b.dayOfWeek as number) ?? 0;
    if (dayA !== dayB) return dayA - dayB;
    return String(a.startTime ?? "").localeCompare(String(b.startTime ?? ""));
  });
}

// Helper: Detect conflicts for a slot (teacher/room double-booking)
async function detectSlotConflicts(
  slot: { teacherId?: string | null; roomId?: string | null; dayOfWeek: number; startTime: string; endTime: string; id: string }
): Promise<string[]> {
  const conflicts: string[] = [];

  if (slot.teacherId) {
    const teacherSlots = await dataStore.timetableSlot.findMany({
      where: {
        teacherId: slot.teacherId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        id: { not: slot.id },
      },
      include: { timetable: { include: { class: true } } },
    });

    const teacherConflicts = Array.isArray(teacherSlots) ? teacherSlots : [];
    if (teacherConflicts.length > 0) {
      const classNames = teacherConflicts.map((s: Record<string, unknown>) => {
        const tt = s.timetable as Record<string, unknown> | null;
        const cls = tt?.class as Record<string, unknown> | null;
        return (cls?.name as string) || "inconnu";
      });
      conflicts.push(
        `Enseignant déjà assigné: ${classNames.join(", ")}`
      );
    }
  }

  if (slot.roomId) {
    const roomSlots = await dataStore.timetableSlot.findMany({
      where: {
        roomId: slot.roomId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        id: { not: slot.id },
      },
      include: { timetable: { include: { class: true } } },
    });

    const roomConflicts = Array.isArray(roomSlots) ? roomSlots : [];
    if (roomConflicts.length > 0) {
      const classNames = roomConflicts.map((s: Record<string, unknown>) => {
        const tt = s.timetable as Record<string, unknown> | null;
        const cls = tt?.class as Record<string, unknown> | null;
        return (cls?.name as string) || "inconnu";
      });
      conflicts.push(
        `Salle déjà occupée: ${classNames.join(", ")}`
      );
    }
  }

  return conflicts;
}

// Helper: Build a timetable with slots, class, and slot count for the institution list
async function buildTimetableList(institutionId: string) {
  const timetables = await dataStore.timetable.findMany({
    where: { institutionId },
    include: {
      class: true,
      _count: { select: { slots: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return timetables;
}

// Helper: Build a full timetable response with enriched slots and class
async function buildFullTimetable(timetableId: string) {
  const timetable = await dataStore.timetable.findUnique({
    where: { id: timetableId },
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
  return timetable;
}

// Helper: Build timetable by class (active)
async function buildTimetableByClass(classId: string) {
  const timetable = await dataStore.timetable.findFirst({
    where: { classId, isActive: true },
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
  return timetable;
}

// Helper: Build teacher timetable view
async function buildTeacherTimetable(teacherId: string) {
  const teacher = await dataStore.teacher.findUnique({
    where: { id: teacherId },
    select: { firstName: true, lastName: true },
  });

  if (!teacher) return null;

  const slots = await dataStore.timetableSlot.findMany({
    where: { teacherId },
    include: {
      subject: true,
      teacher: true,
      room: true,
      timetable: {
        include: { class: true },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const enrichedSlots = await enrichSlots(slots as unknown as Record<string, unknown>[]);

  const timetable = {
    id: `teacher-${teacherId}`,
    name: `Emploi du temps - ${teacher.firstName} ${teacher.lastName}`,
    class: { id: teacherId, name: `${teacher.firstName} ${teacher.lastName}` },
    slots: (Array.isArray(enrichedSlots) ? enrichedSlots : []).map((s: Record<string, unknown>) => {
      const tt = s.timetable as Record<string, unknown> | null;
      const cls = tt?.class as Record<string, unknown> | null;
      return {
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject,
        teacher: s.teacher,
        room: s.room,
        className: cls?.name || "",
      };
    }),
  };
  return timetable;
}

// Helper: Build room timetable view
async function buildRoomTimetable(roomId: string) {
  const room = await dataStore.room.findUnique({
    where: { id: roomId },
    select: { name: true },
  });

  if (!room) return null;

  const slots = await dataStore.timetableSlot.findMany({
    where: { roomId },
    include: {
      subject: true,
      teacher: true,
      room: true,
      timetable: {
        include: { class: true },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const enrichedSlots = await enrichSlots(slots as unknown as Record<string, unknown>[]);

  const timetable = {
    id: `room-${roomId}`,
    name: `Emploi du temps - ${room.name}`,
    class: { id: roomId, name: room.name },
    slots: (Array.isArray(enrichedSlots) ? enrichedSlots : []).map((s: Record<string, unknown>) => {
      const tt = s.timetable as Record<string, unknown> | null;
      const cls = tt?.class as Record<string, unknown> | null;
      return {
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject,
        teacher: s.teacher,
        room: s.room,
        className: cls?.name || "",
      };
    }),
  };
  return timetable;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    const classId = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");
    const roomId = searchParams.get("roomId");
    const timetableId = searchParams.get("timetableId");

    // Get specific timetable by ID
    if (timetableId) {
      const timetable = await buildFullTimetable(timetableId);
      return NextResponse.json(timetable);
    }

    // Get timetable by class
    if (classId) {
      const timetable = await buildTimetableByClass(classId);
      return NextResponse.json(timetable);
    }

    // Get timetable by teacher
    if (teacherId) {
      const timetable = await buildTeacherTimetable(teacherId);
      if (!timetable) {
        return NextResponse.json({ error: "Enseignant non trouve" }, { status: 404 });
      }
      return NextResponse.json(timetable);
    }

    // Get timetable by room
    if (roomId) {
      const timetable = await buildRoomTimetable(roomId);
      if (!timetable) {
        return NextResponse.json({ error: "Salle non trouvee" }, { status: 404 });
      }
      return NextResponse.json(timetable);
    }

    if (!institutionId) {
      return NextResponse.json({ error: "institutionId, classId, teacherId ou roomId requis" }, { status: 400 });
    }

    const timetables = await buildTimetableList(institutionId);
    return NextResponse.json(timetables);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la récupération des emplois du temps" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check plan limits for timetables
    if (body.institutionId) {
      const limitCheck = await checkPlanLimit(body.institutionId, "timetables");
      if (!limitCheck.allowed) {
        return NextResponse.json({
          error: `Limite atteinte : ${limitCheck.current}/${limitCheck.limit} emplois du temps pour le plan ${limitCheck.plan}`,
          limit: limitCheck.limit,
          current: limitCheck.current,
          plan: limitCheck.plan,
        }, { status: 403 });
      }
    }

    // Deactivate existing timetables for this class
    if (body.classId) {
      await dataStore.timetable.updateMany({
        where: { classId: body.classId, isActive: true },
        data: { isActive: false },
      });
    }

    const timetable = await dataStore.timetable.create({
      data: {
        institutionId: body.institutionId,
        classId: body.classId,
        name: body.name,
        semester: body.semester,
        academicYear: body.academicYear,
        isActive: true,
        version: body.version || 1,
        previousVersionId: body.previousVersionId || null,
      },
    });

    // Create slots if provided
    if (body.slots && Array.isArray(body.slots)) {
      for (const slot of body.slots) {
        await dataStore.timetableSlot.create({
          data: {
            timetableId: timetable.id,
            timeSlotId: slot.timeSlotId,
            subjectId: slot.subjectId,
            teacherId: slot.teacherId,
            roomId: slot.roomId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        });
      }
    }

    return NextResponse.json(timetable);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création de l'emploi du temps" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, slots, slotId, teacherId, roomId, ...data } = body;

    // Single slot update (including move via dayOfWeek/startTime/endTime)
    if (slotId) {
      const updateData: Record<string, unknown> = {};
      if (teacherId !== undefined) updateData.teacherId = teacherId || null;
      if (roomId !== undefined) updateData.roomId = roomId || null;
      if (body.dayOfWeek !== undefined) updateData.dayOfWeek = body.dayOfWeek;
      if (body.startTime !== undefined) updateData.startTime = body.startTime;
      if (body.endTime !== undefined) updateData.endTime = body.endTime;

      const slot = await dataStore.timetableSlot.update({
        where: { id: slotId },
        data: updateData,
        include: {
          subject: true,
          teacher: true,
          room: true,
        },
      });

      // Conflict detection: check if the move creates teacher or room conflicts
      const conflicts = await detectSlotConflicts({
        teacherId: slot.teacherId as string | null,
        roomId: slot.roomId as string | null,
        dayOfWeek: slot.dayOfWeek as number,
        startTime: slot.startTime as string,
        endTime: slot.endTime as string,
        id: slot.id as string,
      });

      return NextResponse.json({ slot, conflicts });
    }

    // Add a single slot to an existing timetable (without replacing all slots)
    if (body.addSlot && body.timetableId) {
      const newSlot = await dataStore.timetableSlot.create({
        data: {
          timetableId: body.timetableId,
          timeSlotId: body.addSlot.timeSlotId || null,
          subjectId: body.addSlot.subjectId || null,
          teacherId: body.addSlot.teacherId || null,
          roomId: body.addSlot.roomId || null,
          dayOfWeek: body.addSlot.dayOfWeek,
          startTime: body.addSlot.startTime,
          endTime: body.addSlot.endTime,
        },
        include: {
          subject: true,
          teacher: true,
          room: true,
        },
      });

      // Conflict detection for new slot
      const conflicts = await detectSlotConflicts({
        teacherId: newSlot.teacherId as string | null,
        roomId: newSlot.roomId as string | null,
        dayOfWeek: newSlot.dayOfWeek as number,
        startTime: newSlot.startTime as string,
        endTime: newSlot.endTime as string,
        id: newSlot.id as string,
      });

      return NextResponse.json({ slot: newSlot, conflicts });
    }

    // Full timetable update
    if (!id) {
      return NextResponse.json({ error: "ID, slotId ou addSlot requis" }, { status: 400 });
    }

    const timetable = await dataStore.timetable.update({
      where: { id },
      data,
    });

    // Update slots if provided
    if (slots && Array.isArray(slots)) {
      await dataStore.timetableSlot.deleteMany({ where: { timetableId: id } });
      for (const slot of slots) {
        await dataStore.timetableSlot.create({
          data: {
            timetableId: id,
            timeSlotId: slot.timeSlotId,
            subjectId: slot.subjectId,
            teacherId: slot.teacherId,
            roomId: slot.roomId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        });
      }
    }

    return NextResponse.json(timetable);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'emploi du temps" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let slotId: string | null = null;
    let id: string | null = null;

    // Try to parse body for slotId
    try {
      const parsed = await request.json();
      slotId = parsed.slotId || null;
      id = parsed.id || null;
    } catch {
      // No body or invalid JSON
    }

    // Delete single slot
    if (slotId) {
      await dataStore.timetableSlot.delete({ where: { id: slotId } });
      return NextResponse.json({ success: true });
    }

    // Delete full timetable
    const { searchParams } = new URL(request.url);
    id = id || searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID ou slotId requis" }, { status: 400 });
    }
    await dataStore.timetable.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression de l'emploi du temps" }, { status: 500 });
  }
}
