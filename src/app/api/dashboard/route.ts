import { dataStore, isDatabaseAvailable, checkPlanLimit, getPlanLimits } from "@/lib/data-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    const userId = searchParams.get("userId");
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
        subjects,
        auditLogs,
        holidays,
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
        db.subject.findMany({ where: { institutionId } }),
        (db as Record<string, unknown>).auditLog
          ? (db as Record<string, { findMany: (a: Record<string, unknown>) => Promise<unknown[]> }>).auditLog.findMany({
              where: { institutionId },
              orderBy: { createdAt: "desc" },
              take: 10,
            })
          : [],
        (db as Record<string, unknown>).holiday
          ? (db as Record<string, { findMany: (a: Record<string, unknown>) => Promise<unknown[]> }>).holiday.findMany({
              where: { institutionId, startDate: { gte: new Date().toISOString() } },
              orderBy: { startDate: "asc" },
              take: 3,
            })
          : [],
      ]);

      const base = buildDashboardResponse(
        teacherCount, roomCount, subjectCount, classCount, timetableCount,
        teachers, rooms, timetables
      );

      // Enrich with audit data for activity feed
      const recentActivity = (auditLogs as Array<Record<string, unknown>>).map((log) => ({
        id: log.id as string,
        action: log.action as string,
        entity: log.entity as string,
        details: log.details as string | null,
        createdAt: log.createdAt as string,
        userName: "Utilisateur",
      }));

      // Upcoming holidays
      const upcomingHolidays = (holidays as Array<Record<string, unknown>>).map((h) => ({
        id: h.id as string,
        name: h.name as string,
        startDate: h.startDate as string,
        endDate: h.endDate as string,
        type: h.type as string,
      }));

      // Subject type breakdown
      const subjectTypeBreakdown = buildSubjectTypeBreakdown(subjects as Array<Record<string, unknown>>);

      // Weekly hours distribution
      const weeklyHoursDistribution = buildWeeklyHoursDistribution(timetables as Array<Record<string, unknown>>);

      // Alerts
      const alerts = buildAlerts(
        base.teacherWorkload,
        base.roomUtilization,
        base.conflictCount
      );

      // Plan usage
      const planUsage = await buildPlanUsage(institutionId, userId, teacherCount, roomCount, timetableCount);

      return NextResponse.json({
        ...base,
        recentActivity,
        upcomingHolidays,
        subjectTypeBreakdown,
        weeklyHoursDistribution,
        alerts,
        planUsage,
      });
    }

    // Fallback: basic counts from data store
    const teachers = await dataStore.teacher.findMany({ where: { institutionId } });
    const rooms = await dataStore.room.findMany({ where: { institutionId } });
    const subjects = await dataStore.subject.findMany({ where: { institutionId } });
    const classes = await dataStore.class.findMany({ where: { institutionId } });
    const timetables = await dataStore.timetable.findMany({ where: { institutionId } });
    const holidays = await dataStore.holiday.findMany({ where: { institutionId } });

    const base = buildDashboardResponse(
      teachers.length, rooms.length, subjects.length, classes.length,
      Array.isArray(timetables) ? timetables.length : 0,
      teachers.map((t) => ({ ...t, subjectAssignments: [], timetableSlots: [] })),
      rooms.map((r) => ({ ...r, timetableSlots: [] })),
      []
    );

    // Audit logs for activity feed
    const auditLogs = await dataStore.auditLog.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentActivity = await Promise.all(
      (auditLogs as Array<Record<string, unknown>>).map(async (log) => {
        let userName = "Système";
        if (log.userId) {
          try {
            const user = await dataStore.user.findUnique({ where: { id: log.userId as string } });
            if (user) userName = (user as Record<string, unknown>).name as string || "Utilisateur";
          } catch { /* ignore */ }
        }
        return {
          id: log.id as string,
          action: log.action as string,
          entity: log.entity as string,
          details: log.details as string | null,
          createdAt: log.createdAt as string,
          userName,
        };
      })
    );

    // Upcoming holidays
    const now = new Date().toISOString();
    const upcomingHolidays = (holidays as Array<Record<string, unknown>>)
      .filter((h) => (h.startDate as string) >= now)
      .sort((a, b) => (a.startDate as string).localeCompare(b.startDate as string))
      .slice(0, 3)
      .map((h) => ({
        id: h.id as string,
        name: h.name as string,
        startDate: h.startDate as string,
        endDate: h.endDate as string,
        type: h.type as string,
      }));

    // Subject type breakdown
    const subjectTypeBreakdown = buildSubjectTypeBreakdown(subjects as unknown as Array<Record<string, unknown>>);

    // Weekly hours distribution
    const weeklyHoursDistribution = buildWeeklyHoursDistribution([]);

    // Alerts
    const alerts = buildAlerts(
      base.teacherWorkload,
      base.roomUtilization,
      base.conflictCount
    );

    // Plan usage
    const planUsage = await buildPlanUsage(
      institutionId, userId,
      teachers.length, rooms.length,
      Array.isArray(timetables) ? timetables.length : 0
    );

    return NextResponse.json({
      ...base,
      recentActivity,
      upcomingHolidays,
      subjectTypeBreakdown,
      weeklyHoursDistribution,
      alerts,
      planUsage,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des statistiques" }, { status: 500 });
  }
}

function buildSubjectTypeBreakdown(subjects: Array<Record<string, unknown>>) {
  const typeMap = new Map<string, number>();
  for (const s of subjects) {
    const type = (s.type as string) || "cours";
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  }
  return Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));
}

function buildWeeklyHoursDistribution(timetables: Array<Record<string, unknown>>) {
  const dayMap = new Map<string, number>();
  const dayLabels: Record<number, string> = {
    1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi",
  };

  // Try to extract from timetables
  for (const tt of timetables) {
    const slots = tt.slots as Array<Record<string, unknown>> | undefined;
    if (!slots) continue;
    for (const slot of slots) {
      const day = slot.dayOfWeek as number;
      const label = dayLabels[day] || `Jour ${day}`;
      const start = parseTime(slot.startTime as string);
      const end = parseTime(slot.endTime as string);
      const hours = (end - start) / 60;
      dayMap.set(label, (dayMap.get(label) || 0) + hours);
    }
  }

  return Array.from(dayMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => {
      const order = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });
}

function buildAlerts(
  teacherWorkload: Array<{ name: string; assignedHours: number; maxHours: number; percentage: number }>,
  roomUtilization: Array<{ name: string; usedSlots: number; capacity: number | null }>,
  conflictCount: number
) {
  const alerts: Array<{ type: "conflict" | "overwork" | "capacity"; severity: "error" | "warning" | "info"; message: string }> = [];

  if (conflictCount > 0) {
    alerts.push({
      type: "conflict",
      severity: "error",
      message: `${conflictCount} conflit${conflictCount > 1 ? "s" : ""} détecté${conflictCount > 1 ? "s" : ""} dans les emplois du temps`,
    });
  }

  const overworked = teacherWorkload.filter((t) => t.percentage > 100);
  if (overworked.length > 0) {
    alerts.push({
      type: "overwork",
      severity: "warning",
      message: `${overworked.length} enseignant${overworked.length > 1 ? "s" : ""} dépasse${overworked.length > 1 ? "nt" : ""} la charge maximale`,
    });
  }

  const nearLimit = teacherWorkload.filter((t) => t.percentage > 80 && t.percentage <= 100);
  if (nearLimit.length > 0) {
    alerts.push({
      type: "overwork",
      severity: "info",
      message: `${nearLimit.length} enseignant${nearLimit.length > 1 ? "s" : ""} proche${nearLimit.length > 1 ? "s" : ""} de la charge maximale`,
    });
  }

  return alerts;
}

async function buildPlanUsage(
  institutionId: string,
  userId: string | null,
  teacherCount: number,
  roomCount: number,
  timetableCount: number
) {
  let plan = "free";
  if (userId) {
    try {
      const user = await dataStore.user.findUnique({ where: { id: userId } });
      if (user) plan = (user as Record<string, unknown>).plan as string || "free";
    } catch { /* ignore */ }
  }

  const limits = getPlanLimits(plan);

  // Count real institutions for this user
  let institutionCount = 1;
  try {
    if (userId) {
      const userInstitutions = await dataStore.userInstitution.findMany({ where: { userId } });
      institutionCount = userInstitutions.length || 1;
    }
    // Fallback: count all institutions if userInstitution not available
    if (institutionCount <= 1) {
      const allInstitutions = await dataStore.institution.findMany({});
      institutionCount = allInstitutions.length || 1;
    }
  } catch { /* ignore */ }

  return {
    plan,
    teachers: { current: teacherCount, limit: limits.teachers === Infinity ? -1 : limits.teachers },
    rooms: { current: roomCount, limit: limits.rooms === Infinity ? -1 : limits.rooms },
    timetables: { current: timetableCount, limit: limits.timetables === Infinity ? -1 : limits.timetables },
    institutions: { current: institutionCount, limit: limits.institutions === Infinity ? -1 : limits.institutions },
  };
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
      subject?: { name: string; type?: string | null };
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

  // ─── Weekly statistics ───
  const totalSlotsThisWeek = allSlots.length;
  const totalHoursThisWeek = allSlots.reduce((sum, s) => {
    const start = parseTime(s.startTime);
    const end = parseTime(s.endTime);
    return sum + (end - start) / 60;
  }, 0);

  // Calculate real fill rate: how many available time slots are actually filled
  // Fill rate = slots with a subject / total slots in active timetables
  const slotsWithSubject = allSlots.filter((s) => s.subjectId).length;
  const fillRate = totalSlotsThisWeek > 0 ? Math.round((slotsWithSubject / totalSlotsThisWeek) * 100) : 0;

  // ─── Upcoming schedule (next 5 slots) ───
  const nowDate = new Date();
  const currentDayOfWeek = nowDate.getDay() === 0 ? 7 : nowDate.getDay();
  const currentTime = nowDate.getHours() * 60 + nowDate.getMinutes();

  const upcomingSlots = allSlots
    .filter((s) => {
      if (s.dayOfWeek > currentDayOfWeek) return true;
      if (s.dayOfWeek === currentDayOfWeek) {
        const slotStart = parseTime(s.startTime);
        return slotStart >= currentTime;
      }
      return false;
    })
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return parseTime(a.startTime) - parseTime(b.startTime);
    })
    .slice(0, 5)
    .map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      subjectName: s.subjectName,
      teacherName: s.teacherName,
      roomName: s.roomName,
      className: s.className,
    }));

  // ─── Room utilization by day x time ───
  const roomSlotByDay: Array<{ dayOfWeek: number; roomId: string; roomName: string; count: number }> = [];
  const roomDayMap = new Map<string, { dayOfWeek: number; roomId: string; roomName: string; count: number }>();
  for (const slot of allSlots) {
    if (!slot.roomId) continue;
    const key = `${slot.roomId}-${slot.dayOfWeek}`;
    if (!roomDayMap.has(key)) {
      roomDayMap.set(key, { dayOfWeek: slot.dayOfWeek, roomId: slot.roomId, roomName: slot.roomName, count: 0 });
    }
    roomDayMap.get(key)!.count++;
  }
  for (const entry of roomDayMap.values()) {
    roomSlotByDay.push(entry);
  }

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
    weeklyStats: {
      totalSlots: totalSlotsThisWeek,
      totalHours: Math.round(totalHoursThisWeek * 10) / 10,
      fillRate,
      conflictCount: teacherConflicts.length + roomConflicts.length,
    },
    upcomingSlots,
    roomSlotsByDay: roomSlotByDay,
  };
}

function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
