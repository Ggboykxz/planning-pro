import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { dayNames } from "@/lib/countries";

// Day number to iCal day abbreviation
const dayToICal: Record<number, string> = {
  1: "MO", // Lundi
  2: "TU", // Mardi
  3: "WE", // Mercredi
  4: "TH", // Jeudi
  5: "FR", // Vendredi
  6: "SA", // Samedi
  7: "SU", // Dimanche
};

// Get the next occurrence of a given day of week (1=Mon, 7=Sun) from today
function getNextOccurrence(dayOfWeek: number): Date {
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun, 1=Mon, ...
  // Convert our dayOfWeek (1=Mon) to JS day (1=Mon)
  const jsDay = dayOfWeek === 7 ? 0 : dayOfWeek;
  let daysUntil = jsDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  return next;
}

// Format date to iCal datetime string (local time with TZID)
function formatDateToICal(date: Date, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  const year = d.getFullYear().toString().padStart(4, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hour = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  const sec = d.getSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}T${hour}${min}${sec}`;
}

// Escape text for iCal
function escapeICalText(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === "\n") return "\\n";
    return `\\${match}`;
  });
}

// GET /api/ical?timetableId=xxx — Export timetable as iCal
export async function GET(req: NextRequest) {
  try {
    const timetableId = req.nextUrl.searchParams.get("timetableId");
    if (!timetableId) {
      return NextResponse.json({ error: "timetableId requis" }, { status: 400 });
    }

    // Fetch the timetable with all slots enriched
    const timetable = await dataStore.timetable.findUnique({
      where: { id: timetableId },
      include: {
        slots: {
          include: {
            subject: true,
            teacher: true,
            room: true,
          },
        },
        class: true,
        institution: { select: { name: true, timezone: true } },
      },
    });

    if (!timetable) {
      return NextResponse.json({ error: "Emploi du temps non trouvé" }, { status: 404 });
    }

    const timezone = (timetable as Record<string, unknown>).institution
      ? ((timetable as Record<string, unknown>).institution as { timezone?: string }).timezone || "Europe/Paris"
      : "Europe/Paris";

    const slots = (timetable as Record<string, unknown>).slots as Array<{
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      subject: { name: string } | null;
      teacher: { firstName: string; lastName: string } | null;
      room: { name: string } | null;
    }> | undefined;

    if (!slots || slots.length === 0) {
      return NextResponse.json({ error: "Aucun créneau dans cet emploi du temps" }, { status: 404 });
    }

    const className = (timetable as Record<string, unknown>).class
      ? ((timetable as Record<string, unknown>).class as { name: string }).name
      : "";

    // Build iCal content
    const lines: string[] = [];
    lines.push("BEGIN:VCALENDAR");
    lines.push("PRODID:-//PlanningPro//FR");
    lines.push("VERSION:2.0");
    lines.push("CALSCALE:GREGORIAN");
    lines.push("METHOD:PUBLISH");
    lines.push(`X-WR-CALNAME:${escapeICalText(timetable.name || "Emploi du temps")}`);
    lines.push(`X-WR-TIMEZONE:${escapeICalText(timezone)}`);

    for (const slot of slots) {
      if (!slot.subject) continue;

      const nextDate = getNextOccurrence(slot.dayOfWeek);
      const dtStart = formatDateToICal(nextDate, slot.startTime);
      const dtEnd = formatDateToICal(nextDate, slot.endTime);
      const dayAbbr = dayToICal[slot.dayOfWeek] || "MO";

      // Build description
      const descParts: string[] = [];
      if (slot.teacher) {
        descParts.push(`Enseignant: ${slot.teacher.firstName} ${slot.teacher.lastName}`);
      }
      if (className) {
        descParts.push(`Classe: ${className}`);
      }

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${slot.id}@planningpro.app`);
      lines.push(`DTSTART;TZID=${timezone}:${dtStart}`);
      lines.push(`DTEND;TZID=${timezone}:${dtEnd}`);
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${dayAbbr}`);
      lines.push(`SUMMARY:${escapeICalText(slot.subject.name)}`);
      if (slot.room) {
        lines.push(`LOCATION:${escapeICalText(slot.room.name)}`);
      }
      if (descParts.length > 0) {
        lines.push(`DESCRIPTION:${escapeICalText(descParts.join("\\n"))}`);
      }
      lines.push(`CATEGORIES:${escapeICalText(dayNames[slot.dayOfWeek] || "Cours")}`);
      lines.push("STATUS:CONFIRMED");
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icalContent = lines.join("\r\n");
    const filename = `${(timetable.name || "emploi-du-temps").replace(/\s+/g, "-").toLowerCase()}.ics`;

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("iCal export error:", error);
    return NextResponse.json({ error: "Erreur lors de l'export iCal" }, { status: 500 });
  }
}
