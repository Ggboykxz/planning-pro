/**
 * Hybrid Data Store
 * - Uses Prisma when DATABASE_URL is valid and working
 * - Falls back to in-memory JSON store (with /tmp persistence) for Vercel/serverless
 */

import { createId } from "./cuid";

// ─── Types ───────────────────────────────────────────────────────

interface InstitutionRecord {
  id: string;
  name: string;
  type: string;
  country: string;
  timezone: string;
  academieYear: string;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  workingDays: string; // JSON string
  slotDuration: number;
  dayStartTime: string;
  dayEndTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  lunchDuration?: number | null;
  educationSystem?: string | null;
  gradingSystem?: string | null;
  semesterSystem?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TeacherRecord {
  id: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
  maxHoursPerWeek?: number | null;
  unavailableSlots?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RoomRecord {
  id: string;
  institutionId: string;
  name: string;
  capacity?: number | null;
  type?: string | null;
  building?: string | null;
  floor?: string | null;
  equipment?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubjectRecord {
  id: string;
  institutionId: string;
  name: string;
  code?: string | null;
  hoursPerWeek?: number | null;
  type?: string | null;
  semester?: string | null;
  coefficient?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ClassRecord {
  id: string;
  institutionId: string;
  name: string;
  level?: string | null;
  department?: string | null;
  studentCount?: number | null;
  academicYear?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TimeSlotRecord {
  id: string;
  institutionId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label?: string | null;
  isBreak: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TimetableRecord {
  id: string;
  institutionId: string;
  classId: string;
  name: string;
  semester?: string | null;
  academicYear?: string | null;
  isActive: boolean;
  version: number;
  previousVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TimetableSlotRecord {
  id: string;
  timetableId: string;
  timeSlotId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  roomId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

interface ShareTokenRecord {
  id: string;
  timetableId: string;
  shareId: string; // unique
  createdAt: string;
}

interface TeacherSubjectRecord {
  id: string;
  teacherId: string;
  subjectId: string;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
}

interface ClassSubjectRecord {
  id: string;
  classId: string;
  subjectId: string;
  institutionId: string;
  hoursPerWeek?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AppConfigRecord {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

// ─── In-Memory Store ─────────────────────────────────────────────

const store = {
  institutions: [] as InstitutionRecord[],
  teachers: [] as TeacherRecord[],
  rooms: [] as RoomRecord[],
  subjects: [] as SubjectRecord[],
  classes: [] as ClassRecord[],
  timeSlots: [] as TimeSlotRecord[],
  timetables: [] as TimetableRecord[],
  timetableSlots: [] as TimetableSlotRecord[],
  shareTokens: [] as ShareTokenRecord[],
  teacherSubjects: [] as TeacherSubjectRecord[],
  classSubjects: [] as ClassSubjectRecord[],
  appConfigs: [] as AppConfigRecord[],
};

// Try to load persisted data from /tmp
function loadFromDisk() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");

    // Load main data
    const mainPath = "/tmp/planning-pro-data.json";
    if (fs.existsSync(mainPath)) {
      const data = JSON.parse(fs.readFileSync(mainPath, "utf-8"));
      if (data.institutions) store.institutions = data.institutions;
      if (data.teachers) store.teachers = data.teachers;
      if (data.rooms) store.rooms = data.rooms;
      if (data.subjects) store.subjects = data.subjects;
      if (data.classes) store.classes = data.classes;
      if (data.timeSlots) store.timeSlots = data.timeSlots;
    }

    // Load timetable data
    const ttPath = "/tmp/planning-pro-timetable.json";
    if (fs.existsSync(ttPath)) {
      const data = JSON.parse(fs.readFileSync(ttPath, "utf-8"));
      if (data.timetables) store.timetables = data.timetables;
      if (data.timetableSlots) store.timetableSlots = data.timetableSlots;
    }

    // Load extended data
    const extPath = "/tmp/planning-pro-extended.json";
    if (fs.existsSync(extPath)) {
      const data = JSON.parse(fs.readFileSync(extPath, "utf-8"));
      if (data.shareTokens) store.shareTokens = data.shareTokens;
      if (data.teacherSubjects) store.teacherSubjects = data.teacherSubjects;
      if (data.classSubjects) store.classSubjects = data.classSubjects;
      if (data.appConfigs) store.appConfigs = data.appConfigs;
    }
  } catch {
    // Ignore errors - start fresh
  }
}

function saveToDisk() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");

    // Save main data
    const mainPath = "/tmp/planning-pro-data.json";
    fs.writeFileSync(
      mainPath,
      JSON.stringify(
        {
          institutions: store.institutions,
          teachers: store.teachers,
          rooms: store.rooms,
          subjects: store.subjects,
          classes: store.classes,
          timeSlots: store.timeSlots,
        },
        null,
        2
      ),
      "utf-8"
    );

    // Save timetable data
    const ttPath = "/tmp/planning-pro-timetable.json";
    fs.writeFileSync(
      ttPath,
      JSON.stringify(
        {
          timetables: store.timetables,
          timetableSlots: store.timetableSlots,
        },
        null,
        2
      ),
      "utf-8"
    );

    // Save extended data
    const extPath = "/tmp/planning-pro-extended.json";
    fs.writeFileSync(
      extPath,
      JSON.stringify(
        {
          shareTokens: store.shareTokens,
          teacherSubjects: store.teacherSubjects,
          classSubjects: store.classSubjects,
          appConfigs: store.appConfigs,
        },
        null,
        2
      ),
      "utf-8"
    );
  } catch {
    // Ignore errors - in-memory only
  }
}

// Load on module init
loadFromDisk();

// ─── Database availability check ─────────────────────────────────

let _dbAvailable: boolean | null = null;
let _dbCheckTime: number = 0;
const DB_CHECK_INTERVAL = 60000; // 60 seconds

export async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_dbAvailable !== null && now - _dbCheckTime < DB_CHECK_INTERVAL) {
    return _dbAvailable;
  }
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    _dbAvailable = true;
    _dbCheckTime = now;
    return true;
  } catch {
    _dbAvailable = false;
    _dbCheckTime = now;
    return false;
  }
}

// Reset availability check (for testing)
export function resetDbCheck() {
  _dbAvailable = null;
  _dbCheckTime = 0;
}

// ─── Fallback helper: manually join related records ──────────────

function enrichTimetableSlot(slot: TimetableSlotRecord) {
  return {
    ...slot,
    subject: slot.subjectId
      ? store.subjects.find((s) => s.id === slot.subjectId) || null
      : null,
    teacher: slot.teacherId
      ? store.teachers.find((t) => t.id === slot.teacherId) || null
      : null,
    room: slot.roomId
      ? store.rooms.find((r) => r.id === slot.roomId) || null
      : null,
  };
}

function enrichTimetableSlotWithTimetable(slot: TimetableSlotRecord) {
  const timetable = store.timetables.find((t) => t.id === slot.timetableId);
  const cls = timetable
    ? store.classes.find((c) => c.id === timetable.classId) || null
    : null;
  return {
    ...enrichTimetableSlot(slot),
    timetable: timetable
      ? { ...timetable, class: cls }
      : null,
  };
}

function enrichTimetable(
  timetable: TimetableRecord,
  includeSlots?: boolean,
  includeClass?: boolean
) {
  const result: Record<string, unknown> = { ...timetable };

  if (includeSlots) {
    const slots = store.timetableSlots
      .filter((s) => s.timetableId === timetable.id)
      .map(enrichTimetableSlot)
      .sort(
        (a, b) =>
          (a as TimetableSlotRecord).dayOfWeek - (b as TimetableSlotRecord).dayOfWeek ||
          (a as TimetableSlotRecord).startTime.localeCompare((b as TimetableSlotRecord).startTime)
      );
    result.slots = slots;
  }

  if (includeClass) {
    result.class =
      store.classes.find((c) => c.id === timetable.classId) || null;
  }

  return result;
}

// ─── Data Store API (mimics Prisma interface) ────────────────────

export const dataStore = {
  // ─── Institution ─────────────────────────────────────────────

  institution: {
    findMany: async (): Promise<InstitutionRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.findMany();
      }
      return store.institutions;
    },

    findUnique: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<InstitutionRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.findUnique({ where });
      }
      return store.institutions.find((i) => i.id === where.id) || null;
    },

    create: async ({
      data,
    }: {
      data: Omit<InstitutionRecord, "id" | "createdAt" | "updatedAt"> & {
        id?: string;
      };
    }): Promise<InstitutionRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.create({
          data: data as Parameters<typeof db.institution.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: InstitutionRecord = {
        id: data.id || createId(),
        name: data.name,
        type: data.type,
        country: data.country,
        timezone: data.timezone,
        academieYear: data.academieYear || "2025-2026",
        logo: data.logo || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        workingDays:
          typeof data.workingDays === "string"
            ? data.workingDays
            : JSON.stringify(data.workingDays),
        slotDuration: data.slotDuration,
        dayStartTime: data.dayStartTime,
        dayEndTime: data.dayEndTime,
        breakStartTime: data.breakStartTime || null,
        breakEndTime: data.breakEndTime || null,
        lunchDuration: data.lunchDuration || null,
        educationSystem: data.educationSystem || null,
        gradingSystem: data.gradingSystem || null,
        semesterSystem: data.semesterSystem || null,
        createdAt: now,
        updatedAt: now,
      };
      store.institutions.push(record);
      saveToDisk();
      return record;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<InstitutionRecord>;
    }): Promise<InstitutionRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.update({
          where,
          data: data as Parameters<typeof db.institution.update>[0]["data"],
        });
      }
      const idx = store.institutions.findIndex((i) => i.id === where.id);
      if (idx === -1) throw new Error("Institution non trouvée");
      store.institutions[idx] = {
        ...store.institutions[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveToDisk();
      return store.institutions[idx];
    },

    delete: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<InstitutionRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.delete({ where });
      }
      const idx = store.institutions.findIndex((i) => i.id === where.id);
      if (idx === -1) throw new Error("Institution non trouvée");
      const [deleted] = store.institutions.splice(idx, 1);
      // Also delete related records
      store.teachers = store.teachers.filter(
        (t) => t.institutionId !== where.id
      );
      store.rooms = store.rooms.filter((r) => r.institutionId !== where.id);
      store.subjects = store.subjects.filter(
        (s) => s.institutionId !== where.id
      );
      store.classes = store.classes.filter(
        (c) => c.institutionId !== where.id
      );
      store.timeSlots = store.timeSlots.filter(
        (t) => t.institutionId !== where.id
      );
      store.teacherSubjects = store.teacherSubjects.filter(
        (ts) => ts.institutionId !== where.id
      );
      store.classSubjects = store.classSubjects.filter(
        (cs) => cs.institutionId !== where.id
      );
      // Delete timetables and their slots for this institution
      const ttIds = store.timetables
        .filter((t) => t.institutionId === where.id)
        .map((t) => t.id);
      store.timetableSlots = store.timetableSlots.filter(
        (s) => !ttIds.includes(s.timetableId)
      );
      store.timetables = store.timetables.filter(
        (t) => t.institutionId !== where.id
      );
      store.shareTokens = store.shareTokens.filter(
        (st) => !ttIds.includes(st.timetableId)
      );
      saveToDisk();
      return deleted;
    },
  },

  // ─── Teacher ─────────────────────────────────────────────────

  teacher: {
    findMany: async ({
      where,
      include,
    }: {
      where?: { institutionId?: string };
      include?: Record<string, boolean>;
    } = {}): Promise<TeacherRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.findMany({
          where: where as Parameters<typeof db.teacher.findMany>[0]["where"],
          include: include as Parameters<typeof db.teacher.findMany>[0]["include"],
        });
      }
      let results = store.teachers;
      if (where?.institutionId) {
        results = results.filter((t) => t.institutionId === where.institutionId);
      }
      if (include?.subjectAssignments) {
        return results.map((t) => ({
          ...t,
          subjectAssignments: store.teacherSubjects.filter(
            (ts) => ts.teacherId === t.id
          ),
        })) as (TeacherRecord & { subjectAssignments: TeacherSubjectRecord[] })[];
      }
      return results;
    },

    findUnique: async ({
      where,
      select,
    }: {
      where: { id: string };
      select?: Record<string, boolean>;
    }): Promise<TeacherRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.findUnique({
          where,
          select: select as Parameters<typeof db.teacher.findUnique>[0]["select"],
        });
      }
      const teacher = store.teachers.find((t) => t.id === where.id) || null;
      if (!teacher) return null;
      if (select?.firstName && select?.lastName) {
        return { firstName: teacher.firstName, lastName: teacher.lastName } as unknown as TeacherRecord;
      }
      return teacher;
    },

    create: async ({
      data,
    }: {
      data: Omit<TeacherRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<TeacherRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.create({
          data: data as Parameters<typeof db.teacher.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: TeacherRecord = {
        id: createId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.teachers.push(record);
      saveToDisk();
      return record;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<TeacherRecord>;
    }): Promise<TeacherRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.update({
          where,
          data: data as Parameters<typeof db.teacher.update>[0]["data"],
        });
      }
      const idx = store.teachers.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error("Enseignant non trouvé");
      store.teachers[idx] = {
        ...store.teachers[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveToDisk();
      return store.teachers[idx];
    },

    delete: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<TeacherRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.delete({ where });
      }
      const idx = store.teachers.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error("Enseignant non trouvé");
      const [deleted] = store.teachers.splice(idx, 1);
      // Clean up related teacherSubjects
      store.teacherSubjects = store.teacherSubjects.filter(
        (ts) => ts.teacherId !== where.id
      );
      saveToDisk();
      return deleted;
    },
  },

  // ─── Room ────────────────────────────────────────────────────

  room: {
    findMany: async ({
      where,
    }: {
      where?: { institutionId?: string };
    } = {}): Promise<RoomRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.room.findMany({
          where: where as Parameters<typeof db.room.findMany>[0]["where"],
        });
      }
      if (where?.institutionId) {
        return store.rooms.filter((r) => r.institutionId === where.institutionId);
      }
      return store.rooms;
    },

    findUnique: async ({
      where,
      select,
    }: {
      where: { id: string };
      select?: Record<string, boolean>;
    }): Promise<RoomRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.room.findUnique({
          where,
          select: select as Parameters<typeof db.room.findUnique>[0]["select"],
        });
      }
      const room = store.rooms.find((r) => r.id === where.id) || null;
      if (!room) return null;
      if (select?.name) {
        return { name: room.name } as unknown as RoomRecord;
      }
      return room;
    },

    create: async ({
      data,
    }: {
      data: Omit<RoomRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<RoomRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.room.create({
          data: data as Parameters<typeof db.room.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: RoomRecord = { id: createId(), ...data, createdAt: now, updatedAt: now };
      store.rooms.push(record);
      saveToDisk();
      return record;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<RoomRecord>;
    }): Promise<RoomRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.room.update({
          where,
          data: data as Parameters<typeof db.room.update>[0]["data"],
        });
      }
      const idx = store.rooms.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error("Salle non trouvée");
      store.rooms[idx] = {
        ...store.rooms[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveToDisk();
      return store.rooms[idx];
    },

    delete: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<RoomRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.room.delete({ where });
      }
      const idx = store.rooms.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error("Salle non trouvée");
      const [deleted] = store.rooms.splice(idx, 1);
      saveToDisk();
      return deleted;
    },
  },

  // ─── Subject ─────────────────────────────────────────────────

  subject: {
    findMany: async ({
      where,
    }: {
      where?: { institutionId?: string };
    } = {}): Promise<SubjectRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.subject.findMany({
          where: where as Parameters<typeof db.subject.findMany>[0]["where"],
        });
      }
      if (where?.institutionId) {
        return store.subjects.filter((s) => s.institutionId === where.institutionId);
      }
      return store.subjects;
    },

    create: async ({
      data,
    }: {
      data: Omit<SubjectRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<SubjectRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.subject.create({
          data: data as Parameters<typeof db.subject.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: SubjectRecord = {
        id: createId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.subjects.push(record);
      saveToDisk();
      return record;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<SubjectRecord>;
    }): Promise<SubjectRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.subject.update({
          where,
          data: data as Parameters<typeof db.subject.update>[0]["data"],
        });
      }
      const idx = store.subjects.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error("Matière non trouvée");
      store.subjects[idx] = {
        ...store.subjects[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveToDisk();
      return store.subjects[idx];
    },

    delete: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<SubjectRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.subject.delete({ where });
      }
      const idx = store.subjects.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error("Matière non trouvée");
      const [deleted] = store.subjects.splice(idx, 1);
      // Clean up related teacherSubjects and classSubjects
      store.teacherSubjects = store.teacherSubjects.filter(
        (ts) => ts.subjectId !== where.id
      );
      store.classSubjects = store.classSubjects.filter(
        (cs) => cs.subjectId !== where.id
      );
      saveToDisk();
      return deleted;
    },
  },

  // ─── Class ───────────────────────────────────────────────────

  class: {
    findMany: async ({
      where,
    }: {
      where?: { institutionId?: string };
    } = {}): Promise<ClassRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.findMany({
          where: where as Parameters<typeof db.class.findMany>[0]["where"],
        });
      }
      if (where?.institutionId) {
        return store.classes.filter((c) => c.institutionId === where.institutionId);
      }
      return store.classes;
    },

    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: Record<string, unknown>;
    }): Promise<ClassRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.findUnique({
          where,
          include: include as Parameters<typeof db.class.findUnique>[0]["include"],
        });
      }
      const cls = store.classes.find((c) => c.id === where.id) || null;
      if (!cls) return null;
      if (include?.subjects) {
        const classSubjs = store.classSubjects.filter(
          (cs) => cs.classId === cls.id
        );
        const subjects = classSubjs.map((cs) => {
          const subject = store.subjects.find((s) => s.id === cs.subjectId);
          return {
            ...cs,
            subject,
          };
        });
        return { ...cls, subjects } as unknown as ClassRecord;
      }
      return cls;
    },

    create: async ({
      data,
    }: {
      data: Omit<ClassRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<ClassRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.create({
          data: data as Parameters<typeof db.class.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: ClassRecord = {
        id: createId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.classes.push(record);
      saveToDisk();
      return record;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<ClassRecord>;
    }): Promise<ClassRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.update({
          where,
          data: data as Parameters<typeof db.class.update>[0]["data"],
        });
      }
      const idx = store.classes.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error("Classe non trouvée");
      store.classes[idx] = {
        ...store.classes[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveToDisk();
      return store.classes[idx];
    },

    delete: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<ClassRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.delete({ where });
      }
      const idx = store.classes.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error("Classe non trouvée");
      const [deleted] = store.classes.splice(idx, 1);
      // Clean up related records
      store.classSubjects = store.classSubjects.filter(
        (cs) => cs.classId !== where.id
      );
      const ttIds = store.timetables
        .filter((t) => t.classId === where.id)
        .map((t) => t.id);
      store.timetableSlots = store.timetableSlots.filter(
        (s) => !ttIds.includes(s.timetableId)
      );
      store.shareTokens = store.shareTokens.filter(
        (st) => !ttIds.includes(st.timetableId)
      );
      store.timetables = store.timetables.filter(
        (t) => t.classId !== where.id
      );
      saveToDisk();
      return deleted;
    },
  },

  // ─── TimeSlot ────────────────────────────────────────────────

  timeSlot: {
    findMany: async ({
      where,
      orderBy,
    }: {
      where?: { institutionId?: string };
      orderBy?: unknown;
    } = {}): Promise<TimeSlotRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timeSlot.findMany({
          where: where as Parameters<typeof db.timeSlot.findMany>[0]["where"],
          orderBy: orderBy as Parameters<typeof db.timeSlot.findMany>[0]["orderBy"],
        });
      }
      let results = store.timeSlots;
      if (where?.institutionId) {
        results = results.filter((t) => t.institutionId === where.institutionId);
      }
      // Sort by dayOfWeek asc, startTime asc (mimicking the Prisma orderBy)
      results.sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
      );
      return results;
    },

    create: async ({
      data,
    }: {
      data: Omit<TimeSlotRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<TimeSlotRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timeSlot.create({
          data: data as Parameters<typeof db.timeSlot.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: TimeSlotRecord = {
        id: createId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.timeSlots.push(record);
      saveToDisk();
      return record;
    },

    deleteMany: async ({
      where,
    }: {
      where: { institutionId: string };
    }): Promise<{ count: number }> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timeSlot.deleteMany({
          where: where as Parameters<typeof db.timeSlot.deleteMany>[0]["where"],
        });
      }
      const before = store.timeSlots.length;
      store.timeSlots = store.timeSlots.filter(
        (t) => t.institutionId !== where.institutionId
      );
      const count = before - store.timeSlots.length;
      saveToDisk();
      return { count };
    },

    delete: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<TimeSlotRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timeSlot.delete({ where });
      }
      const idx = store.timeSlots.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error("Créneau non trouvé");
      const [deleted] = store.timeSlots.splice(idx, 1);
      saveToDisk();
      return deleted;
    },
  },

  // ─── Timetable ───────────────────────────────────────────────

  timetable: {
    findMany: async ({
      where,
      include,
      orderBy,
    }: {
      where?: {
        institutionId?: string;
        classId?: string | { not?: string };
        isActive?: boolean;
      };
      include?: Record<string, unknown>;
      orderBy?: unknown;
    } = {}): Promise<TimetableRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetable.findMany({
          where: where as Parameters<typeof db.timetable.findMany>[0]["where"],
          include: include as Parameters<typeof db.timetable.findMany>[0]["include"],
          orderBy: orderBy as Parameters<typeof db.timetable.findMany>[0]["orderBy"],
        });
      }
      let results = store.timetables;
      if (where?.institutionId)
        results = results.filter((t) => t.institutionId === where.institutionId);
      if (where?.classId) {
        if (typeof where.classId === "object" && where.classId.not) {
          results = results.filter((t) => t.classId !== where.classId.not);
        } else if (typeof where.classId === "string") {
          results = results.filter((t) => t.classId === where.classId);
        }
      }
      if (where?.isActive !== undefined)
        results = results.filter((t) => t.isActive === where.isActive);

      // Handle includes
      if (include?.slots || include?.class || include?._count) {
        results = results.map((tt) => {
          const enriched: Record<string, unknown> = { ...tt };
          if (include.slots) {
            let slots = store.timetableSlots
              .filter((s) => s.timetableId === tt.id)
              .map(enrichTimetableSlot)
              .sort(
                (a, b) =>
                  (a as TimetableSlotRecord).dayOfWeek -
                  (b as TimetableSlotRecord).dayOfWeek ||
                  (a as TimetableSlotRecord).startTime.localeCompare(
                    (b as TimetableSlotRecord).startTime
                  )
              );
            // If include.slots is an object with include for subject/teacher/room, enrichTimetableSlot already handles it
            // If slots include is just `true`, we still enrich
            enriched.slots = slots;
          }
          if (include.class) {
            enriched.class =
              store.classes.find((c) => c.id === tt.classId) || null;
          }
          if (include._count) {
            enriched._count = {
              slots: store.timetableSlots.filter(
                (s) => s.timetableId === tt.id
              ).length,
            };
          }
          return enriched as TimetableRecord;
        });
      }

      // Default sort by createdAt desc
      results.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return results;
    },

    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: {
        slots?: boolean | { include?: { subject?: boolean; teacher?: boolean; room?: boolean }; orderBy?: unknown };
        class?: boolean;
        institution?: { select?: Record<string, boolean> };
      };
    }): Promise<TimetableRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetable.findUnique({
          where,
          include: include as Parameters<typeof db.timetable.findUnique>[0]["include"],
        });
      }
      const tt = store.timetables.find((t) => t.id === where.id);
      if (!tt) return null;

      const includeSlots = !!include?.slots;
      const includeClass = !!include?.class;
      const includeInstitution = !!include?.institution;

      const result: Record<string, unknown> = enrichTimetable(
        tt,
        includeSlots,
        includeClass
      );

      if (includeInstitution) {
        const inst = store.institutions.find(
          (i) => i.id === tt.institutionId
        );
        if (include.institution?.select?.name) {
          result.institution = inst ? { name: inst.name } : null;
        } else {
          result.institution = inst || null;
        }
      }

      return result as TimetableRecord;
    },

    findFirst: async ({
      where,
      include,
    }: {
      where: { classId?: string; institutionId?: string; isActive?: boolean };
      include?: {
        slots?: boolean | { include?: { subject?: boolean; teacher?: boolean; room?: boolean }; orderBy?: unknown };
        class?: boolean;
      };
    }): Promise<TimetableRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetable.findFirst({
          where: where as Parameters<typeof db.timetable.findFirst>[0]["where"],
          include: include as Parameters<typeof db.timetable.findFirst>[0]["include"],
        });
      }
      let results = store.timetables;
      if (where.classId)
        results = results.filter((t) => t.classId === where.classId);
      if (where.institutionId)
        results = results.filter((t) => t.institutionId === where.institutionId);
      if (where.isActive !== undefined)
        results = results.filter((t) => t.isActive === where.isActive);

      const first = results[0] || null;
      if (!first) return null;

      const includeSlots = !!include?.slots;
      const includeClass = !!include?.class;

      return enrichTimetable(first, includeSlots, includeClass) as TimetableRecord;
    },

    create: async ({
      data,
    }: {
      data: Omit<TimetableRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<TimetableRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetable.create({
          data: data as Parameters<typeof db.timetable.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: TimetableRecord = {
        id: createId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.timetables.push(record);
      saveToDisk();
      return record;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<TimetableRecord>;
    }): Promise<TimetableRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetable.update({
          where,
          data: data as Parameters<typeof db.timetable.update>[0]["data"],
        });
      }
      const idx = store.timetables.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error("Emploi du temps non trouvé");
      store.timetables[idx] = {
        ...store.timetables[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveToDisk();
      return store.timetables[idx];
    },

    updateMany: async ({
      where,
      data,
    }: {
      where: { classId?: string; institutionId?: string; isActive?: boolean };
      data: Partial<TimetableRecord>;
    }): Promise<{ count: number }> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetable.updateMany({
          where: where as Parameters<typeof db.timetable.updateMany>[0]["where"],
          data: data as Parameters<typeof db.timetable.updateMany>[0]["data"],
        });
      }
      let count = 0;
      for (let i = 0; i < store.timetables.length; i++) {
        const tt = store.timetables[i];
        let match = true;
        if (where.classId && tt.classId !== where.classId) match = false;
        if (where.institutionId && tt.institutionId !== where.institutionId)
          match = false;
        if (where.isActive !== undefined && tt.isActive !== where.isActive)
          match = false;
        if (match) {
          store.timetables[i] = {
            ...tt,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          count++;
        }
      }
      saveToDisk();
      return { count };
    },

    delete: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<TimetableRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetable.delete({ where });
      }
      const idx = store.timetables.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error("Emploi du temps non trouvé");
      const [deleted] = store.timetables.splice(idx, 1);
      // Clean up related slots and share tokens
      store.timetableSlots = store.timetableSlots.filter(
        (s) => s.timetableId !== where.id
      );
      store.shareTokens = store.shareTokens.filter(
        (st) => st.timetableId !== where.id
      );
      saveToDisk();
      return deleted;
    },
  },

  // ─── TimetableSlot ───────────────────────────────────────────

  timetableSlot: {
    findMany: async ({
      where,
      include,
      orderBy,
    }: {
      where?: {
        timetableId?: string;
        teacherId?: string;
        roomId?: string;
        dayOfWeek?: number;
        startTime?: string;
        endTime?: string;
        id?: string | { not?: string };
      };
      include?: {
        subject?: boolean;
        teacher?: boolean;
        room?: boolean;
        timetable?: { include?: { class?: boolean } };
      };
      orderBy?: unknown;
    } = {}): Promise<TimetableSlotRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetableSlot.findMany({
          where: where as Parameters<typeof db.timetableSlot.findMany>[0]["where"],
          include: include as Parameters<typeof db.timetableSlot.findMany>[0]["include"],
          orderBy: orderBy as Parameters<typeof db.timetableSlot.findMany>[0]["orderBy"],
        });
      }
      let results = store.timetableSlots;

      if (where?.timetableId)
        results = results.filter((s) => s.timetableId === where.timetableId);
      if (where?.teacherId)
        results = results.filter((s) => s.teacherId === where.teacherId);
      if (where?.roomId)
        results = results.filter((s) => s.roomId === where.roomId);
      if (where?.dayOfWeek !== undefined)
        results = results.filter((s) => s.dayOfWeek === where.dayOfWeek);
      if (where?.startTime)
        results = results.filter((s) => s.startTime === where.startTime);
      if (where?.endTime)
        results = results.filter((s) => s.endTime === where.endTime);
      if (where?.id) {
        if (typeof where.id === "object" && where.id.not) {
          results = results.filter((s) => s.id !== where.id!.not);
        } else if (typeof where.id === "string") {
          results = results.filter((s) => s.id === where.id);
        }
      }

      // Sort by dayOfWeek asc, startTime asc by default
      results.sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
      );

      // Handle includes
      if (include?.subject || include?.teacher || include?.room || include?.timetable) {
        results = results.map((slot) => {
          if (include?.timetable) {
            return enrichTimetableSlotWithTimetable(slot);
          }
          return enrichTimetableSlot(slot);
        }) as TimetableSlotRecord[];
      }

      return results;
    },

    create: async ({
      data,
      include,
    }: {
      data: Omit<TimetableSlotRecord, "id" | "createdAt" | "updatedAt">;
      include?: {
        subject?: boolean;
        teacher?: boolean;
        room?: boolean;
      };
    }): Promise<TimetableSlotRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetableSlot.create({
          data: data as Parameters<typeof db.timetableSlot.create>[0]["data"],
          include: include as Parameters<typeof db.timetableSlot.create>[0]["include"],
        });
      }
      const now = new Date().toISOString();
      const record: TimetableSlotRecord = {
        id: createId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.timetableSlots.push(record);
      saveToDisk();

      if (include?.subject || include?.teacher || include?.room) {
        return enrichTimetableSlot(record) as TimetableSlotRecord;
      }
      return record;
    },

    update: async ({
      where,
      data,
      include,
    }: {
      where: { id: string };
      data: Partial<TimetableSlotRecord>;
      include?: {
        subject?: boolean;
        teacher?: boolean;
        room?: boolean;
        timetable?: { include?: { class?: boolean } };
      };
    }): Promise<TimetableSlotRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetableSlot.update({
          where,
          data: data as Parameters<typeof db.timetableSlot.update>[0]["data"],
          include: include as Parameters<typeof db.timetableSlot.update>[0]["include"],
        });
      }
      const idx = store.timetableSlots.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error("Créneau d'emploi du temps non trouvé");
      store.timetableSlots[idx] = {
        ...store.timetableSlots[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveToDisk();

      const updated = store.timetableSlots[idx];
      if (include?.subject || include?.teacher || include?.room || include?.timetable) {
        if (include?.timetable) {
          return enrichTimetableSlotWithTimetable(updated) as TimetableSlotRecord;
        }
        return enrichTimetableSlot(updated) as TimetableSlotRecord;
      }
      return updated;
    },

    delete: async ({
      where,
    }: {
      where: { id: string };
    }): Promise<TimetableSlotRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetableSlot.delete({ where });
      }
      const idx = store.timetableSlots.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error("Créneau d'emploi du temps non trouvé");
      const [deleted] = store.timetableSlots.splice(idx, 1);
      saveToDisk();
      return deleted;
    },

    deleteMany: async ({
      where,
    }: {
      where: { timetableId: string };
    }): Promise<{ count: number }> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timetableSlot.deleteMany({
          where: where as Parameters<typeof db.timetableSlot.deleteMany>[0]["where"],
        });
      }
      const before = store.timetableSlots.length;
      store.timetableSlots = store.timetableSlots.filter(
        (s) => s.timetableId !== where.timetableId
      );
      const count = before - store.timetableSlots.length;
      saveToDisk();
      return { count };
    },
  },

  // ─── ShareToken ──────────────────────────────────────────────

  shareToken: {
    findUnique: async ({
      where,
      include,
    }: {
      where: { shareId: string };
      include?: {
        timetable?: {
          include?: {
            slots?: {
              include?: { subject?: boolean; teacher?: boolean; room?: boolean };
              orderBy?: unknown;
            };
            class?: boolean;
            institution?: { select?: Record<string, boolean> };
          };
        };
      };
    }): Promise<ShareTokenRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.shareToken.findUnique({
          where,
          include: include as Parameters<typeof db.shareToken.findUnique>[0]["include"],
        });
      }
      const token = store.shareTokens.find((st) => st.shareId === where.shareId) || null;
      if (!token) return null;

      if (include?.timetable) {
        const tt = store.timetables.find((t) => t.id === token.timetableId);
        if (!tt) return token;

        const ttResult: Record<string, unknown> = { ...tt };

        if (include.timetable.include?.slots) {
          let slots = store.timetableSlots
            .filter((s) => s.timetableId === tt.id)
            .map(enrichTimetableSlot)
            .sort(
              (a, b) =>
                (a as TimetableSlotRecord).dayOfWeek -
                (b as TimetableSlotRecord).dayOfWeek ||
                (a as TimetableSlotRecord).startTime.localeCompare(
                  (b as TimetableSlotRecord).startTime
                )
            );
          ttResult.slots = slots;
        }

        if (include.timetable.include?.class) {
          ttResult.class =
            store.classes.find((c) => c.id === tt.classId) || null;
        }

        if (include.timetable.include?.institution) {
          const inst = store.institutions.find(
            (i) => i.id === tt.institutionId
          );
          if (include.timetable.include.institution.select?.name) {
            ttResult.institution = inst ? { name: inst.name } : null;
          } else {
            ttResult.institution = inst || null;
          }
        }

        return { ...token, timetable: ttResult } as unknown as ShareTokenRecord;
      }

      return token;
    },

    create: async ({
      data,
    }: {
      data: { timetableId: string; shareId: string };
    }): Promise<ShareTokenRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.shareToken.create({
          data: data as Parameters<typeof db.shareToken.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: ShareTokenRecord = {
        id: createId(),
        timetableId: data.timetableId,
        shareId: data.shareId,
        createdAt: now,
      };
      store.shareTokens.push(record);
      saveToDisk();
      return record;
    },
  },

  // ─── TeacherSubject ──────────────────────────────────────────

  teacherSubject: {
    findMany: async ({
      where,
    }: {
      where?: { teacherId?: string; institutionId?: string };
    } = {}): Promise<TeacherSubjectRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacherSubject.findMany({
          where: where as Parameters<typeof db.teacherSubject.findMany>[0]["where"],
        });
      }
      let results = store.teacherSubjects;
      if (where?.teacherId)
        results = results.filter((ts) => ts.teacherId === where.teacherId);
      if (where?.institutionId)
        results = results.filter(
          (ts) => ts.institutionId === where.institutionId
        );
      return results;
    },

    create: async ({
      data,
    }: {
      data: Omit<TeacherSubjectRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<TeacherSubjectRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacherSubject.create({
          data: data as Parameters<typeof db.teacherSubject.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: TeacherSubjectRecord = {
        id: createId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.teacherSubjects.push(record);
      saveToDisk();
      return record;
    },

    deleteMany: async ({
      where,
    }: {
      where: { teacherId?: string; institutionId?: string };
    }): Promise<{ count: number }> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacherSubject.deleteMany({
          where: where as Parameters<typeof db.teacherSubject.deleteMany>[0]["where"],
        });
      }
      const before = store.teacherSubjects.length;
      store.teacherSubjects = store.teacherSubjects.filter((ts) => {
        if (where.teacherId && ts.teacherId !== where.teacherId) return true;
        if (where.institutionId && ts.institutionId !== where.institutionId)
          return true;
        return false;
      });
      const count = before - store.teacherSubjects.length;
      saveToDisk();
      return { count };
    },
  },

  // ─── ClassSubject ────────────────────────────────────────────

  classSubject: {
    findMany: async ({
      where,
    }: {
      where?: { classId?: string; institutionId?: string };
    } = {}): Promise<ClassSubjectRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.classSubject.findMany({
          where: where as Parameters<typeof db.classSubject.findMany>[0]["where"],
        });
      }
      let results = store.classSubjects;
      if (where?.classId)
        results = results.filter((cs) => cs.classId === where.classId);
      if (where?.institutionId)
        results = results.filter(
          (cs) => cs.institutionId === where.institutionId
        );
      return results;
    },

    create: async ({
      data,
    }: {
      data: Omit<ClassSubjectRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<ClassSubjectRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.classSubject.create({
          data: data as Parameters<typeof db.classSubject.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: ClassSubjectRecord = {
        id: createId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.classSubjects.push(record);
      saveToDisk();
      return record;
    },

    deleteMany: async ({
      where,
    }: {
      where: { classId?: string; institutionId?: string };
    }): Promise<{ count: number }> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.classSubject.deleteMany({
          where: where as Parameters<typeof db.classSubject.deleteMany>[0]["where"],
        });
      }
      const before = store.classSubjects.length;
      store.classSubjects = store.classSubjects.filter((cs) => {
        if (where.classId && cs.classId !== where.classId) return true;
        if (where.institutionId && cs.institutionId !== where.institutionId)
          return true;
        return false;
      });
      const count = before - store.classSubjects.length;
      saveToDisk();
      return { count };
    },
  },

  // ─── AppConfig ───────────────────────────────────────────────

  appConfig: {
    findMany: async (): Promise<AppConfigRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.appConfig.findMany();
      }
      return store.appConfigs;
    },

    findUnique: async ({
      where,
    }: {
      where: { key?: string; id?: string };
    }): Promise<AppConfigRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.appConfig.findUnique({ where });
      }
      if (where.key) {
        return store.appConfigs.find((ac) => ac.key === where.key) || null;
      }
      if (where.id) {
        return store.appConfigs.find((ac) => ac.id === where.id) || null;
      }
      return null;
    },

    create: async ({
      data,
    }: {
      data: Omit<AppConfigRecord, "id" | "updatedAt">;
    }): Promise<AppConfigRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.appConfig.create({
          data: data as Parameters<typeof db.appConfig.create>[0]["data"],
        });
      }
      const now = new Date().toISOString();
      const record: AppConfigRecord = {
        id: createId(),
        ...data,
        updatedAt: now,
      };
      store.appConfigs.push(record);
      saveToDisk();
      return record;
    },

    update: async ({
      where,
      data,
    }: {
      where: { key?: string; id?: string };
      data: Partial<AppConfigRecord>;
    }): Promise<AppConfigRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.appConfig.update({
          where,
          data: data as Parameters<typeof db.appConfig.update>[0]["data"],
        });
      }
      let idx = -1;
      if (where.key) {
        idx = store.appConfigs.findIndex((ac) => ac.key === where.key);
      } else if (where.id) {
        idx = store.appConfigs.findIndex((ac) => ac.id === where.id);
      }
      if (idx === -1) throw new Error("AppConfig non trouvée");
      store.appConfigs[idx] = {
        ...store.appConfigs[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveToDisk();
      return store.appConfigs[idx];
    },

    delete: async ({
      where,
    }: {
      where: { key?: string; id?: string };
    }): Promise<AppConfigRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.appConfig.delete({ where });
      }
      let idx = -1;
      if (where.key) {
        idx = store.appConfigs.findIndex((ac) => ac.key === where.key);
      } else if (where.id) {
        idx = store.appConfigs.findIndex((ac) => ac.id === where.id);
      }
      if (idx === -1) throw new Error("AppConfig non trouvée");
      const [deleted] = store.appConfigs.splice(idx, 1);
      saveToDisk();
      return deleted;
    },
  },
};
