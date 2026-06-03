import { dataStore, isDatabaseAvailable } from "@/lib/data-store";
import { NextResponse } from "next/server";

// Predefined timetable templates
const TEMPLATES = [
  {
    id: "universite-lmd",
    name: "Université LMD",
    description: "Créneaux de 90min, pause déjeuner 12h-14h30, 6 jours",
    config: {
      slotDuration: 90,
      dayStartTime: "08:00",
      dayEndTime: "18:00",
      breakStartTime: "12:00",
      breakEndTime: "14:30",
      workingDays: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    },
  },
  {
    id: "lycee-francais",
    name: "Lycée Français",
    description: "Créneaux de 60min, pause déjeuner 12h-14h, 5 jours",
    config: {
      slotDuration: 60,
      dayStartTime: "08:00",
      dayEndTime: "18:00",
      breakStartTime: "12:00",
      breakEndTime: "14:00",
      workingDays: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
    },
  },
  {
    id: "college-francais",
    name: "Collège Français",
    description: "Créneaux de 55min, pause méridienne 12h-13h30, 5 jours",
    config: {
      slotDuration: 55,
      dayStartTime: "08:00",
      dayEndTime: "17:00",
      breakStartTime: "12:00",
      breakEndTime: "13:30",
      workingDays: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
    },
  },
  {
    id: "ecole-primaire",
    name: "École Primaire",
    description: "Créneaux de 45min, pause méridienne 11h30-13h30, 5 jours",
    config: {
      slotDuration: 45,
      dayStartTime: "08:30",
      dayEndTime: "16:30",
      breakStartTime: "11:30",
      breakEndTime: "13:30",
      workingDays: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
    },
  },
  {
    id: "universite-anglophone",
    name: "Université Anglophone",
    description: "Créneaux de 60min, 5 jours, système semestriel",
    config: {
      slotDuration: 60,
      dayStartTime: "09:00",
      dayEndTime: "18:00",
      breakStartTime: "12:00",
      breakEndTime: "13:00",
      workingDays: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
    },
  },
  {
    id: "custom",
    name: "Personnalisé",
    description: "Configurer manuellement les créneaux horaires",
    config: null,
  },
];

// GET /api/templates - List all templates
export async function GET() {
  return NextResponse.json(TEMPLATES);
}

// POST /api/templates - Apply a template to an institution
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, institutionId } = body;

    if (!templateId || !institutionId) {
      return NextResponse.json(
        { error: "templateId et institutionId sont requis" },
        { status: 400 }
      );
    }

    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template non trouvé" },
        { status: 404 }
      );
    }

    if (!template.config) {
      // Custom template - nothing to apply
      return NextResponse.json({
        message: "Template personnalisé sélectionné — configuration manuelle requise",
        templateId,
      });
    }

    // Apply template config to institution
    const updateData: Record<string, unknown> = {
      slotDuration: template.config.slotDuration,
      dayStartTime: template.config.dayStartTime,
      dayEndTime: template.config.dayEndTime,
      breakStartTime: template.config.breakStartTime,
      breakEndTime: template.config.breakEndTime,
      workingDays: JSON.stringify(template.config.workingDays),
    };

    await dataStore.institution.update({
      where: { id: institutionId },
      data: updateData,
    });

    // Regenerate time slots for the institution
    // First delete existing time slots
    await dataStore.timeSlot.deleteMany({
      where: { institutionId },
    });

    // Generate new time slots based on template config
    const dayMap: Record<string, number> = {
      Lundi: 1,
      Mardi: 2,
      Mercredi: 3,
      Jeudi: 4,
      Vendredi: 5,
      Samedi: 6,
      Dimanche: 7,
    };

    const duration = template.config.slotDuration;
    const [startH, startM] = template.config.dayStartTime.split(":").map(Number);
    const [endH, endM] = template.config.dayEndTime.split(":").map(Number);
    const [breakStartH, breakStartM] = template.config.breakStartTime.split(":").map(Number);
    const [breakEndH, breakEndM] = template.config.breakEndTime.split(":").map(Number);

    const dayStartMin = startH * 60 + startM;
    const dayEndMin = endH * 60 + endM;
    const breakStartMin = breakStartH * 60 + breakStartM;
    const breakEndMin = breakEndH * 60 + breakEndM;

    let slotCount = 0;
    for (const dayName of template.config.workingDays) {
      const dayOfWeek = dayMap[dayName];
      if (!dayOfWeek) continue;

      let currentTime = dayStartMin;
      while (currentTime + duration <= dayEndMin) {
        // Skip break time
        if (currentTime >= breakStartMin && currentTime < breakEndMin) {
          currentTime = breakEndMin;
          continue;
        }
        // Skip if slot would overlap with break
        if (currentTime < breakStartMin && currentTime + duration > breakStartMin) {
          currentTime = breakEndMin;
          continue;
        }

        const slotStart = `${String(Math.floor(currentTime / 60)).padStart(2, "0")}:${String(currentTime % 60).padStart(2, "0")}`;
        const endTime = currentTime + duration;
        const slotEnd = `${String(Math.floor(endTime / 60)).padStart(2, "0")}:${String(endTime % 60).padStart(2, "0")}`;

        await dataStore.timeSlot.create({
          data: {
            institutionId,
            dayOfWeek,
            startTime: slotStart,
            endTime: slotEnd,
            isBreak: false,
          },
        });

        slotCount++;
        currentTime += duration;
      }

      // Add break slot
      await dataStore.timeSlot.create({
        data: {
          institutionId,
          dayOfWeek,
          startTime: template.config.breakStartTime,
          endTime: template.config.breakEndTime,
          isBreak: true,
          label: "Pause déjeuner",
        },
      });
    }

    return NextResponse.json({
      message: `Template "${template.name}" appliqué avec succès`,
      templateId,
      institutionId,
      slotsGenerated: slotCount,
    });
  } catch (error) {
    console.error("POST /api/templates error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'application du template" },
      { status: 500 }
    );
  }
}
