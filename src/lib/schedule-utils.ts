// Schedule utilities for timetable generation

export interface TimeSlotData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label?: string;
  isBreak?: boolean;
}

export function generateTimeSlots(
  workingDays: string[],
  dayStartTime: string,
  dayEndTime: string,
  breakStartTime: string | null,
  breakEndTime: string | null,
  slotDuration: number
): TimeSlotData[] {
  const slots: TimeSlotData[] = [];
  const dayMap: Record<string, number> = {
    Lundi: 1,
    Mardi: 2,
    Mercredi: 3,
    Jeudi: 4,
    Vendredi: 5,
    Samedi: 6,
    Dimanche: 7,
  };

  for (const day of workingDays) {
    const dayOfWeek = dayMap[day];
    if (!dayOfWeek) continue;

    let currentTime = parseTime(dayStartTime);
    const endOfDay = parseTime(dayEndTime);
    const breakStart = breakStartTime ? parseTime(breakStartTime) : null;
    const breakEnd = breakEndTime ? parseTime(breakEndTime) : null;

    let slotIndex = 1;
    while (currentTime < endOfDay) {
      const nextTime = currentTime + slotDuration;

      // Check if this slot overlaps with break
      if (breakStart !== null && breakEnd !== null) {
        if (currentTime >= breakStart && currentTime < breakEnd) {
          // We're in the break, skip to end of break
          currentTime = breakEnd;
          continue;
        }
        if (currentTime < breakStart && nextTime > breakStart) {
          // Slot would overlap with break, add partial slot before break
          slots.push({
            dayOfWeek,
            startTime: formatTime(currentTime),
            endTime: breakStartTime!,
            label: `Créneau ${slotIndex}`,
            isBreak: false,
          });
          slotIndex++;
          // Add break slot
          slots.push({
            dayOfWeek,
            startTime: breakStartTime!,
            endTime: breakEndTime!,
            label: "Pause déjeuner",
            isBreak: true,
          });
          currentTime = breakEnd;
          continue;
        }
      }

      if (nextTime > endOfDay) {
        // Slot would go past end of day, don't add it
        break;
      }

      slots.push({
        dayOfWeek,
        startTime: formatTime(currentTime),
        endTime: formatTime(nextTime),
        label: `Créneau ${slotIndex}`,
        isBreak: false,
      });

      slotIndex++;
      currentTime = nextTime;
    }
  }

  return slots;
}

function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export interface ConflictInfo {
  type: "teacher" | "room";
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  conflictingSlots: Array<{
    subjectName: string;
    className: string;
  }>;
}

export function detectConflicts(
  allSlots: Array<{
    subjectId: string | null;
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectName?: string;
    teacherName?: string;
    roomName?: string;
    className?: string;
  }>
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Check teacher conflicts
  const teacherSlots = new Map<string, typeof allSlots>();
  for (const slot of allSlots) {
    if (!slot.teacherId) continue;
    const key = `${slot.teacherId}-${slot.dayOfWeek}`;
    if (!teacherSlots.has(key)) teacherSlots.set(key, []);
    teacherSlots.get(key)!.push(slot);
  }

  for (const [, slots] of teacherSlots) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (timeOverlaps(slots[i], slots[j])) {
          conflicts.push({
            type: "teacher",
            teacherId: slots[i].teacherId!,
            teacherName: slots[i].teacherName,
            dayOfWeek: slots[i].dayOfWeek,
            startTime: slots[i].startTime,
            endTime: slots[i].endTime,
            conflictingSlots: [
              { subjectName: slots[i].subjectName || "", className: slots[i].className || "" },
              { subjectName: slots[j].subjectName || "", className: slots[j].className || "" },
            ],
          });
        }
      }
    }
  }

  // Check room conflicts
  const roomSlots = new Map<string, typeof allSlots>();
  for (const slot of allSlots) {
    if (!slot.roomId) continue;
    const key = `${slot.roomId}-${slot.dayOfWeek}`;
    if (!roomSlots.has(key)) roomSlots.set(key, []);
    roomSlots.get(key)!.push(slot);
  }

  for (const [, slots] of roomSlots) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (timeOverlaps(slots[i], slots[j])) {
          conflicts.push({
            type: "room",
            roomId: slots[i].roomId!,
            roomName: slots[i].roomName,
            dayOfWeek: slots[i].dayOfWeek,
            startTime: slots[i].startTime,
            endTime: slots[i].endTime,
            conflictingSlots: [
              { subjectName: slots[i].subjectName || "", className: slots[i].className || "" },
              { subjectName: slots[j].subjectName || "", className: slots[j].className || "" },
            ],
          });
        }
      }
    }
  }

  return conflicts;
}

function timeOverlaps(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
): boolean {
  const aStart = parseTime(a.startTime);
  const aEnd = parseTime(a.endTime);
  const bStart = parseTime(b.startTime);
  const bEnd = parseTime(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

// Simple constraint-based timetable generation algorithm
export interface GenerationInput {
  classId: string;
  className: string;
  subjects: Array<{
    id: string;
    name: string;
    hoursPerWeek: number;
    type: string;
  }>;
  teachers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    subjectIds: string[];
    maxHoursPerWeek: number;
    unavailableSlots?: string;
  }>;
  rooms: Array<{
    id: string;
    name: string;
    type: string;
    capacity: number;
  }>;
  availableSlots: TimeSlotData[];
  existingSlots: Array<{
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

export interface GeneratedSlot {
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function generateTimetable(input: GenerationInput): GeneratedSlot[] {
  const result: GeneratedSlot[] = [];
  const nonBreakSlots = input.availableSlots.filter((s) => !s.isBreak);
  const teacherAssignedHours = new Map<string, number>();
  const occupiedSlots = new Set<string>();

  // Mark existing slots as occupied
  for (const slot of input.existingSlots) {
    if (slot.teacherId) {
      occupiedSlots.add(`teacher-${slot.teacherId}-${slot.dayOfWeek}-${slot.startTime}`);
    }
    if (slot.roomId) {
      occupiedSlots.add(`room-${slot.roomId}-${slot.dayOfWeek}-${slot.startTime}`);
    }
  }

  // Group available slots by day
  const slotsByDay = new Map<number, TimeSlotData[]>();
  for (const slot of nonBreakSlots) {
    if (!slotsByDay.has(slot.dayOfWeek)) slotsByDay.set(slot.dayOfWeek, []);
    slotsByDay.get(slot.dayOfWeek)!.push(slot);
  }

  // Sort subjects by hours required (descending)
  const sortedSubjects = [...input.subjects].sort(
    (a, b) => b.hoursPerWeek - a.hoursPerWeek
  );

  // Track assigned slots per day per subject to distribute evenly
  const subjectDayCount = new Map<string, Map<number, number>>();

  for (const subject of sortedSubjects) {
    const slotsNeeded = Math.ceil(subject.hoursPerWeek);
    let slotsAssigned = 0;

    // Find teachers for this subject
    const subjectTeachers = input.teachers.filter((t) =>
      t.subjectIds.includes(subject.id)
    );

    if (subjectTeachers.length === 0) continue;

    // Find appropriate room type
    const preferredRoomType = subject.type === "cours" ? "amphi" : subject.type === "tp" ? "labo" : "salle_td";
    const appropriateRooms = input.rooms.filter(
      (r) => r.type === preferredRoomType || r.type === "salle_normale"
    );
    const fallbackRooms = input.rooms.filter(
      (r) => !appropriateRooms.includes(r)
    );
    const allRooms = [...appropriateRooms, ...fallbackRooms];

    if (allRooms.length === 0) continue;

    // Get days sorted by least assignments for this subject (distribute evenly)
    const days = Array.from(slotsByDay.keys()).sort((a, b) => {
      const aCount = subjectDayCount.get(subject.id)?.get(a) || 0;
      const bCount = subjectDayCount.get(subject.id)?.get(b) || 0;
      return aCount - bCount;
    });

    for (const day of days) {
      if (slotsAssigned >= slotsNeeded) break;

      const daySlots = slotsByDay.get(day)!;
      for (const slot of daySlots) {
        if (slotsAssigned >= slotsNeeded) break;

        // Find an available teacher
        let assignedTeacher = null;
        for (const teacher of subjectTeachers) {
          const currentHours = teacherAssignedHours.get(teacher.id) || 0;
          if (currentHours >= (teacher.maxHoursPerWeek || 30)) continue;

          const teacherKey = `teacher-${teacher.id}-${slot.dayOfWeek}-${slot.startTime}`;
          if (occupiedSlots.has(teacherKey)) continue;

          // Check teacher unavailability
          if (teacher.unavailableSlots) {
            try {
              const unavailable = JSON.parse(teacher.unavailableSlots);
              if (
                unavailable.some(
                  (u: { day: number; startTime: string }) =>
                    u.day === slot.dayOfWeek && u.startTime === slot.startTime
                )
              ) {
                continue;
              }
            } catch {
              // ignore parse errors
            }
          }

          assignedTeacher = teacher;
          break;
        }

        if (!assignedTeacher) continue;

        // Find an available room
        let assignedRoom = null;
        for (const room of allRooms) {
          const roomKey = `room-${room.id}-${slot.dayOfWeek}-${slot.startTime}`;
          if (!occupiedSlots.has(roomKey)) {
            assignedRoom = room;
            break;
          }
        }

        if (!assignedRoom) continue;

        // Assign the slot
        result.push({
          subjectId: subject.id,
          teacherId: assignedTeacher.id,
          roomId: assignedRoom.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });

        // Mark as occupied
        occupiedSlots.add(
          `teacher-${assignedTeacher.id}-${slot.dayOfWeek}-${slot.startTime}`
        );
        occupiedSlots.add(
          `room-${assignedRoom.id}-${slot.dayOfWeek}-${slot.startTime}`
        );

        // Update tracking
        teacherAssignedHours.set(
          assignedTeacher.id,
          (teacherAssignedHours.get(assignedTeacher.id) || 0) + 1
        );
        if (!subjectDayCount.has(subject.id)) {
          subjectDayCount.set(subject.id, new Map());
        }
        subjectDayCount
          .get(subject.id)!
          .set(day, (subjectDayCount.get(subject.id)?.get(day) || 0) + 1);

        slotsAssigned++;
      }
    }
  }

  return result;
}
