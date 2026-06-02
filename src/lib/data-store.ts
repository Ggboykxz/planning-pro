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

// ─── In-Memory Store ─────────────────────────────────────────────

const store = {
  institutions: [] as InstitutionRecord[],
  teachers: [] as TeacherRecord[],
  rooms: [] as RoomRecord[],
  subjects: [] as SubjectRecord[],
  classes: [] as ClassRecord[],
  timeSlots: [] as TimeSlotRecord[],
};

// Try to load persisted data from /tmp
function loadFromDisk() {
  try {
    const fs = require("fs");
    const path = "/tmp/planning-pro-data.json";
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, "utf-8"));
      if (data.institutions) store.institutions = data.institutions;
      if (data.teachers) store.teachers = data.teachers;
      if (data.rooms) store.rooms = data.rooms;
      if (data.subjects) store.subjects = data.subjects;
      if (data.classes) store.classes = data.classes;
      if (data.timeSlots) store.timeSlots = data.timeSlots;
    }
  } catch {
    // Ignore errors - start fresh
  }
}

function saveToDisk() {
  try {
    const fs = require("fs");
    const path = "/tmp/planning-pro-data.json";
    fs.writeFileSync(path, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Ignore errors - in-memory only
  }
}

// Load on module init
loadFromDisk();

// ─── Database availability check ─────────────────────────────────

let _dbAvailable: boolean | null = null;

export async function isDatabaseAvailable(): Promise<boolean> {
  if (_dbAvailable !== null) return _dbAvailable;
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    _dbAvailable = true;
    return true;
  } catch {
    _dbAvailable = false;
    return false;
  }
}

// Reset availability check (for testing)
export function resetDbCheck() {
  _dbAvailable = null;
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

    findUnique: async ({ where }: { where: { id: string } }): Promise<InstitutionRecord | null> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.findUnique({ where });
      }
      return store.institutions.find((i) => i.id === where.id) || null;
    },

    create: async ({ data }: { data: Omit<InstitutionRecord, "id" | "createdAt" | "updatedAt"> & { id?: string } }): Promise<InstitutionRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.create({ data: data as Parameters<typeof db.institution.create>[0]["data"] });
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
        workingDays: typeof data.workingDays === "string" ? data.workingDays : JSON.stringify(data.workingDays),
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

    update: async ({ where, data }: { where: { id: string }; data: Partial<InstitutionRecord> }): Promise<InstitutionRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.update({ where, data: data as Parameters<typeof db.institution.update>[0]["data"] });
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

    delete: async ({ where }: { where: { id: string } }): Promise<InstitutionRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.institution.delete({ where });
      }
      const idx = store.institutions.findIndex((i) => i.id === where.id);
      if (idx === -1) throw new Error("Institution non trouvée");
      const [deleted] = store.institutions.splice(idx, 1);
      // Also delete related records
      store.teachers = store.teachers.filter((t) => t.institutionId !== where.id);
      store.rooms = store.rooms.filter((r) => r.institutionId !== where.id);
      store.subjects = store.subjects.filter((s) => s.institutionId !== where.id);
      store.classes = store.classes.filter((c) => c.institutionId !== where.id);
      store.timeSlots = store.timeSlots.filter((t) => t.institutionId !== where.id);
      saveToDisk();
      return deleted;
    },
  },

  // ─── Teacher ─────────────────────────────────────────────────

  teacher: {
    findMany: async ({ where }: { where?: { institutionId?: string } } = {}): Promise<TeacherRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.findMany({ where: where as Parameters<typeof db.teacher.findMany>[0]["where"] });
      }
      if (where?.institutionId) {
        return store.teachers.filter((t) => t.institutionId === where.institutionId);
      }
      return store.teachers;
    },

    create: async ({ data }: { data: Omit<TeacherRecord, "id" | "createdAt" | "updatedAt"> }): Promise<TeacherRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.create({ data: data as Parameters<typeof db.teacher.create>[0]["data"] });
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

    update: async ({ where, data }: { where: { id: string }; data: Partial<TeacherRecord> }): Promise<TeacherRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.update({ where, data: data as Parameters<typeof db.teacher.update>[0]["data"] });
      }
      const idx = store.teachers.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error("Enseignant non trouvé");
      store.teachers[idx] = { ...store.teachers[idx], ...data, updatedAt: new Date().toISOString() };
      saveToDisk();
      return store.teachers[idx];
    },

    delete: async ({ where }: { where: { id: string } }): Promise<TeacherRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.teacher.delete({ where });
      }
      const idx = store.teachers.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error("Enseignant non trouvé");
      const [deleted] = store.teachers.splice(idx, 1);
      saveToDisk();
      return deleted;
    },
  },

  // ─── Room ────────────────────────────────────────────────────

  room: {
    findMany: async ({ where }: { where?: { institutionId?: string } } = {}): Promise<RoomRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.room.findMany({ where: where as Parameters<typeof db.room.findMany>[0]["where"] });
      }
      if (where?.institutionId) {
        return store.rooms.filter((r) => r.institutionId === where.institutionId);
      }
      return store.rooms;
    },

    create: async ({ data }: { data: Omit<RoomRecord, "id" | "createdAt" | "updatedAt"> }): Promise<RoomRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.room.create({ data: data as Parameters<typeof db.room.create>[0]["data"] });
      }
      const now = new Date().toISOString();
      const record: RoomRecord = { id: createId(), ...data, createdAt: now, updatedAt: now };
      store.rooms.push(record);
      saveToDisk();
      return record;
    },

    update: async ({ where, data }: { where: { id: string }; data: Partial<RoomRecord> }): Promise<RoomRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.room.update({ where, data: data as Parameters<typeof db.room.update>[0]["data"] });
      }
      const idx = store.rooms.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error("Salle non trouvée");
      store.rooms[idx] = { ...store.rooms[idx], ...data, updatedAt: new Date().toISOString() };
      saveToDisk();
      return store.rooms[idx];
    },

    delete: async ({ where }: { where: { id: string } }): Promise<RoomRecord> => {
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
    findMany: async ({ where }: { where?: { institutionId?: string } } = {}): Promise<SubjectRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.subject.findMany({ where: where as Parameters<typeof db.subject.findMany>[0]["where"] });
      }
      if (where?.institutionId) {
        return store.subjects.filter((s) => s.institutionId === where.institutionId);
      }
      return store.subjects;
    },

    create: async ({ data }: { data: Omit<SubjectRecord, "id" | "createdAt" | "updatedAt"> }): Promise<SubjectRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.subject.create({ data: data as Parameters<typeof db.subject.create>[0]["data"] });
      }
      const now = new Date().toISOString();
      const record: SubjectRecord = { id: createId(), ...data, createdAt: now, updatedAt: now };
      store.subjects.push(record);
      saveToDisk();
      return record;
    },

    update: async ({ where, data }: { where: { id: string }; data: Partial<SubjectRecord> }): Promise<SubjectRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.subject.update({ where, data: data as Parameters<typeof db.subject.update>[0]["data"] });
      }
      const idx = store.subjects.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error("Matière non trouvée");
      store.subjects[idx] = { ...store.subjects[idx], ...data, updatedAt: new Date().toISOString() };
      saveToDisk();
      return store.subjects[idx];
    },

    delete: async ({ where }: { where: { id: string } }): Promise<SubjectRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.subject.delete({ where });
      }
      const idx = store.subjects.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error("Matière non trouvée");
      const [deleted] = store.subjects.splice(idx, 1);
      saveToDisk();
      return deleted;
    },
  },

  // ─── Class ───────────────────────────────────────────────────

  class: {
    findMany: async ({ where }: { where?: { institutionId?: string } } = {}): Promise<ClassRecord[]> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.findMany({ where: where as Parameters<typeof db.class.findMany>[0]["where"] });
      }
      if (where?.institutionId) {
        return store.classes.filter((c) => c.institutionId === where.institutionId);
      }
      return store.classes;
    },

    create: async ({ data }: { data: Omit<ClassRecord, "id" | "createdAt" | "updatedAt"> }): Promise<ClassRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.create({ data: data as Parameters<typeof db.class.create>[0]["data"] });
      }
      const now = new Date().toISOString();
      const record: ClassRecord = { id: createId(), ...data, createdAt: now, updatedAt: now };
      store.classes.push(record);
      saveToDisk();
      return record;
    },

    update: async ({ where, data }: { where: { id: string }; data: Partial<ClassRecord> }): Promise<ClassRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.update({ where, data: data as Parameters<typeof db.class.update>[0]["data"] });
      }
      const idx = store.classes.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error("Classe non trouvée");
      store.classes[idx] = { ...store.classes[idx], ...data, updatedAt: new Date().toISOString() };
      saveToDisk();
      return store.classes[idx];
    },

    delete: async ({ where }: { where: { id: string } }): Promise<ClassRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.class.delete({ where });
      }
      const idx = store.classes.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error("Classe non trouvée");
      const [deleted] = store.classes.splice(idx, 1);
      saveToDisk();
      return deleted;
    },
  },

  // ─── TimeSlot ────────────────────────────────────────────────

  timeSlot: {
    findMany: async ({ where, orderBy }: { where?: { institutionId?: string }; orderBy?: unknown } = {}): Promise<TimeSlotRecord[]> => {
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
      results.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
      return results;
    },

    create: async ({ data }: { data: Omit<TimeSlotRecord, "id" | "createdAt" | "updatedAt"> }): Promise<TimeSlotRecord> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timeSlot.create({ data: data as Parameters<typeof db.timeSlot.create>[0]["data"] });
      }
      const now = new Date().toISOString();
      const record: TimeSlotRecord = { id: createId(), ...data, createdAt: now, updatedAt: now };
      store.timeSlots.push(record);
      saveToDisk();
      return record;
    },

    deleteMany: async ({ where }: { where: { institutionId: string } }): Promise<{ count: number }> => {
      if (await isDatabaseAvailable()) {
        const { db } = await import("@/lib/db");
        return db.timeSlot.deleteMany({ where: where as Parameters<typeof db.timeSlot.deleteMany>[0]["where"] });
      }
      const before = store.timeSlots.length;
      store.timeSlots = store.timeSlots.filter((t) => t.institutionId !== where.institutionId);
      const count = before - store.timeSlots.length;
      saveToDisk();
      return { count };
    },

    delete: async ({ where }: { where: { id: string } }): Promise<TimeSlotRecord> => {
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
};

// ─── Timetable & TimetableSlot support ───────────────────────────

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

const timetableStore: { timetables: TimetableRecord[]; timetableSlots: TimetableSlotRecord[] } = {
  timetables: [],
  timetableSlots: [],
};

// Load timetable data
try {
  const fs = require("fs");
  const path = "/tmp/planning-pro-timetable.json";
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, "utf-8"));
    if (data.timetables) timetableStore.timetables = data.timetables;
    if (data.timetableSlots) timetableStore.timetableSlots = data.timetableSlots;
  }
} catch { /* ignore */ }

function saveTimetableToDisk() {
  try {
    const fs = require("fs");
    const path = "/tmp/planning-pro-timetable.json";
    fs.writeFileSync(path, JSON.stringify(timetableStore, null, 2), "utf-8");
  } catch { /* ignore */ }
}

dataStore.timetable = {
  findMany: async ({ where }: { where?: { institutionId?: string; classId?: string } } = {}): Promise<TimetableRecord[]> => {
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      return db.timetable.findMany({ where: where as Parameters<typeof db.timetable.findMany>[0]["where"] });
    }
    let results = timetableStore.timetables;
    if (where?.institutionId) results = results.filter((t) => t.institutionId === where.institutionId);
    if (where?.classId) results = results.filter((t) => t.classId === where.classId);
    return results;
  },

  create: async ({ data }: { data: Omit<TimetableRecord, "id" | "createdAt" | "updatedAt"> }): Promise<TimetableRecord> => {
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      return db.timetable.create({ data: data as Parameters<typeof db.timetable.create>[0]["data"] });
    }
    const now = new Date().toISOString();
    const record: TimetableRecord = { id: createId(), ...data, createdAt: now, updatedAt: now };
    timetableStore.timetables.push(record);
    saveTimetableToDisk();
    return record;
  },
};

dataStore.timetableSlot = {
  findMany: async ({ where }: { where?: { timetableId?: string } } = {}): Promise<TimetableSlotRecord[]> => {
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      return db.timetableSlot.findMany({
        where: where as Parameters<typeof db.timetableSlot.findMany>[0]["where"],
        include: { subject: true, teacher: true, room: true },
      });
    }
    let results = timetableStore.timetableSlots;
    if (where?.timetableId) results = results.filter((s) => s.timetableId === where.timetableId);
    return results;
  },

  create: async ({ data }: { data: Omit<TimetableSlotRecord, "id" | "createdAt" | "updatedAt"> }): Promise<TimetableSlotRecord> => {
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      return db.timetableSlot.create({ data: data as Parameters<typeof db.timetableSlot.create>[0]["data"] });
    }
    const now = new Date().toISOString();
    const record: TimetableSlotRecord = { id: createId(), ...data, createdAt: now, updatedAt: now };
    timetableStore.timetableSlots.push(record);
    saveTimetableToDisk();
    return record;
  },

  deleteMany: async ({ where }: { where: { timetableId: string } }): Promise<{ count: number }> => {
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      return db.timetableSlot.deleteMany({ where: where as Parameters<typeof db.timetableSlot.deleteMany>[0]["where"] });
    }
    const before = timetableStore.timetableSlots.length;
    timetableStore.timetableSlots = timetableStore.timetableSlots.filter((s) => s.timetableId !== where.timetableId);
    const count = before - timetableStore.timetableSlots.length;
    saveTimetableToDisk();
    return { count };
  },
};

// Type assertion to make TypeScript happy
(dataStore as Record<string, unknown>).timetable = dataStore.timetable;
(dataStore as Record<string, unknown>).timetableSlot = dataStore.timetableSlot;
