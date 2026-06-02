import { dataStore, isDatabaseAvailable } from "@/lib/data-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }

    // Try enriched dashboard data with DB
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      const [
        teacherCount,
        roomCount,
        subjectCount,
        classCount,
        timetableCount,
        teachers,
        rooms,
        timetables,
      ] = await Promise.all([
        db.teacher.count({ where: { institutionId } }),
        db.room.count({ where: { institutionId } }),
        db.subject.count({ where: { institutionId } }),
        db.class.count({ where: { institutionId } }),
        db.timetable.count({ where: { institutionId } }),
        db.teacher.findMany({
          where: { institutionId },
          include: { subjectAssignments: true, timetableSlots: true },
        }),
        db.room.findMany({
          where: { institutionId },
          include: { timetableSlots: true },
        }),
        db.timetable.findMany({
          where: { institutionId, isActive: true },
          include: {
            slots: { include: { subject: true, teacher: true, room: true } },
            class: true,
          },
        }),
      ]);

      return NextResponse.json(buildDashboardResponse(
        teacherCount, roomCount, subjectCount, classCount, timetableCount,
        teachers, rooms, timetables
      ));
    }

    // Fallback: basic counts from data store
    const teachers = await dataStore.teacher.findMany({ where: { institutionId } });
    const rooms = await dataStore.room.findMany({ where: { institutionId } });
    const subjects = await dataStore.subject.findMany({ where: { institutionId } });
    const classes = await dataStore.class.findMany({ where: { institutionId } });
    const timetables = await (dataStore as Record<string, unknown>).timetable
      ? (dataStore.timetable as { findMany: (args: { where: { institutionId: string } }) => Promise<unknown[]> }).findMany({ where: { institutionId } })
      : [];

    return NextResponse.json(buildDashboardResponse(
      teachers.length, rooms.length, subjects.length, classes.length,
      Array.isArray(timetables) ? timetables.length : 0,
      teachers.map((t) => ({ ...t, subjectAssignments: [], timetableSlots: [] })),
      rooms.map((r) => ({ ...r, timetableSlots: [] })),
      []
    ));
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des statistiques" }, { status: 500 });
  }
}

function buildDashboardResponse(
  teacherCount: number,
  roomCount: number,
  subjectCount: number,
  classCount: number,
  timetableCount: number,
  teachers: Array<{ firstName: string; lastName: string; timetableSlots: Array<unknown>; maxHoursPerWeek: number | null }>,
  rooms: Array<{ name: string; timetableSlots: Array<unknown>; capacity: number | null }>,
  timetables: Array<{
    classId: string;
    class?: { name: string };
    slots: Array<{
      subjectId: string | null;
      teacherId: string | null;
      roomId: string | null;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      subject?: { name: string };
      teacher?: { firstName: string; lastName: string };
      room?: { name: string };
    }>;
  }>
) {
  // Calculate conflicts
  const allSlots: Array<{
    subjectId: string | null;
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectName: string;
    teacherName: string;
    roomName: string;
    className: string;
  }> = [];

  for (const tt of timetables) {
    for (const slot of tt.slots) {
      allSlots.push({
        subjectId: slot.subjectId,
        teacherId: slot.teacherId,
        roomId: slot.roomId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subjectName: slot.subject?.name || "",
        teacherName: slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : "",
        roomName: slot.room?.name || "",
        className: tt.class?.name || "",
      });
    }
  }

  // Detect teacher conflicts
  const teacherConflicts: Array<{
    teacherName: string;
    dayOfWeek: number;
    time: string;
    classes: string[];
  }> = [];
  const teacherSlotMap = new Map<string, typeof allSlots>();
  for (const slot of allSlots) {
    if (!slot.teacherId) continue;
    const key = `${slot.teacherId}-${slot.dayOfWeek}`;
    if (!teacherSlotMap.has(key)) teacherSlotMap.set(key, []);
    teacherSlotMap.get(key)!.push(slot);
  }
  for (const [, slots] of teacherSlotMap) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        const aStart = parseTime(a.startTime);
        const aEnd = parseTime(a.endTime);
        const bStart = parseTime(b.startTime);
        const bEnd = parseTime(b.endTime);
        if (aStart < bEnd && bStart < aEnd) {
          teacherConflicts.push({
            teacherName: a.teacherName,
            dayOfWeek: a.dayOfWeek,
            time: `${a.startTime}-${a.endTime}`,
            classes: [a.className, b.className],
          });
        }
      }
    }
  }

  // Detect room conflicts
  const roomConflicts: Array<{
    roomName: string;
    dayOfWeek: number;
    time: string;
    classes: string[];
  }> = [];
  const roomSlotMap = new Map<string, typeof allSlots>();
  for (const slot of allSlots) {
    if (!slot.roomId) continue;
    const key = `${slot.roomId}-${slot.dayOfWeek}`;
    if (!roomSlotMap.has(key)) roomSlotMap.set(key, []);
    roomSlotMap.get(key)!.push(slot);
  }
  for (const [, slots] of roomSlotMap) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        const aStart = parseTime(a.startTime);
        const aEnd = parseTime(a.endTime);
        const bStart = parseTime(b.startTime);
        const bEnd = parseTime(b.endTime);
        if (aStart < bEnd && bStart < aEnd) {
          roomConflicts.push({
            roomName: a.roomName,
            dayOfWeek: a.dayOfWeek,
            time: `${a.startTime}-${a.endTime}`,
            classes: [a.className, b.className],
          });
        }
      }
    }
  }

  // Calculate completion rate
  const classesWithTimetable = new Set(timetables.map((t) => t.classId));
  const completionRate = classCount > 0 ? Math.round((classesWithTimetable.size / classCount) * 100) : 0;

  // Teacher workload
  const teacherWorkload = teachers.map((t) => {
    const assignedHours = t.timetableSlots.length;
    const maxHours = t.maxHoursPerWeek || 0;
    return {
      id: "",
      name: `${t.firstName} ${t.lastName}`,
      assignedHours,
      maxHours,
      percentage: maxHours > 0 ? Math.round((assignedHours / maxHours) * 100) : 0,
    };
  });

  // Room utilization
  const roomUtilization = rooms.map((r) => ({
    id: "",
    name: r.name,
    usedSlots: r.timetableSlots.length,
    capacity: r.capacity,
  }));

  return {
    teacherCount,
    roomCount,
    subjectCount,
    classCount,
    timetableCount,
    conflictCount: teacherConflicts.length + roomConflicts.length,
    teacherConflicts,
    roomConflicts,
    completionRate,
    teacherWorkload,
    roomUtilization,
    recentTimetables: timetables.slice(0, 5),
  };
}

function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
