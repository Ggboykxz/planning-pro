import { db } from "@/lib/db";
import { generateTimeSlots } from "@/lib/schedule-utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }
    const timeSlots = await db.timeSlot.findMany({
      where: { institutionId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la récupération des créneaux" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Auto-generate from institution config
    if (body.generateFromConfig && body.institutionId) {
      const institution = await db.institution.findUnique({
        where: { id: body.institutionId },
      });
      if (!institution) {
        return NextResponse.json({ error: "Institution non trouvée" }, { status: 404 });
      }

      const workingDays = JSON.parse(institution.workingDays) as string[];
      const slots = generateTimeSlots(
        workingDays,
        institution.dayStartTime,
        institution.dayEndTime,
        institution.breakStartTime,
        institution.breakEndTime,
        institution.slotDuration
      );

      const created = [];
      for (const slot of slots) {
        const ts = await db.timeSlot.create({
          data: {
            institutionId: body.institutionId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            label: slot.label,
            isBreak: slot.isBreak || false,
          },
        });
        created.push(ts);
      }
      return NextResponse.json(created);
    }

    // Support bulk creation
    if (Array.isArray(body.slots)) {
      const created = [];
      for (const slot of body.slots) {
        const ts = await db.timeSlot.create({
          data: {
            institutionId: body.institutionId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            label: slot.label,
            isBreak: slot.isBreak || false,
          },
        });
        created.push(ts);
      }
      return NextResponse.json(created);
    }

    const timeSlot = await db.timeSlot.create({
      data: {
        institutionId: body.institutionId,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        label: body.label,
        isBreak: body.isBreak || false,
      },
    });
    return NextResponse.json(timeSlot);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création du créneau" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (institutionId) {
      // Delete all time slots for this institution
      await db.timeSlot.deleteMany({ where: { institutionId } });
      return NextResponse.json({ success: true });
    }

    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID ou institutionId requis" }, { status: 400 });
    }
    await db.timeSlot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression du créneau" }, { status: 500 });
  }
}
