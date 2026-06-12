import { dataStore } from "@/lib/data-store";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }
    const timeSlots = await dataStore.timeSlot.findMany({
      where: { institutionId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error("GET /api/timeslots error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des créneaux" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    // Auto-generate from institution config
    if (body.generateFromConfig && body.institutionId) {
      const institution = await dataStore.institution.findUnique({
        where: { id: body.institutionId },
      });
      if (!institution) {
        return NextResponse.json({ error: "Institution non trouvée" }, { status: 404 });
      }

      const { generateTimeSlots } = await import("@/lib/schedule-utils");
      const workingDays = JSON.parse(institution.workingDays) as string[];
      const slots = generateTimeSlots(
        workingDays,
        institution.dayStartTime,
        institution.dayEndTime,
        institution.breakStartTime ?? null,
        institution.breakEndTime ?? null,
        institution.slotDuration
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created: any[] = [];
      for (const slot of slots) {
        const ts = await dataStore.timeSlot.create({
          data: {
            institutionId: body.institutionId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            label: slot.label || null,
            isBreak: slot.isBreak || false,
          },
        });
        created.push(ts);
      }
      return NextResponse.json(created);
    }

    // Support bulk creation
    if (Array.isArray(body.slots)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created: any[] = [];
      for (const slot of body.slots) {
        const ts = await dataStore.timeSlot.create({
          data: {
            institutionId: body.institutionId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            label: slot.label || null,
            isBreak: slot.isBreak || false,
          },
        });
        created.push(ts);
      }
      return NextResponse.json(created);
    }

    const timeSlot = await dataStore.timeSlot.create({
      data: {
        institutionId: body.institutionId,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        label: body.label || null,
        isBreak: body.isBreak || false,
      },
    });
    return NextResponse.json(timeSlot);
  } catch (error) {
    console.error("POST /api/timeslots error:", error);
    return NextResponse.json({
      error: "Erreur lors de la création du créneau",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (institutionId) {
      await dataStore.timeSlot.deleteMany({ where: { institutionId } });
      return NextResponse.json({ success: true });
    }

    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID ou institutionId requis" }, { status: 400 });
    }
    await dataStore.timeSlot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/timeslots error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression du créneau" }, { status: 500 });
  }
}
