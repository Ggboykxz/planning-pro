import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    const classId = searchParams.get("classId");

    if (classId) {
      const timetable = await db.timetable.findFirst({
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
      return NextResponse.json(timetable);
    }

    if (!institutionId) {
      return NextResponse.json({ error: "institutionId ou classId requis" }, { status: 400 });
    }

    const timetables = await db.timetable.findMany({
      where: { institutionId },
      include: {
        class: true,
        _count: { select: { slots: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(timetables);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la récupération des emplois du temps" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Deactivate existing timetables for this class
    if (body.classId) {
      await db.timetable.updateMany({
        where: { classId: body.classId, isActive: true },
        data: { isActive: false },
      });
    }

    const timetable = await db.timetable.create({
      data: {
        institutionId: body.institutionId,
        classId: body.classId,
        name: body.name,
        semester: body.semester,
        academicYear: body.academicYear,
        isActive: true,
      },
    });

    // Create slots if provided
    if (body.slots && Array.isArray(body.slots)) {
      for (const slot of body.slots) {
        await db.timetableSlot.create({
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
    const { id, slots, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const timetable = await db.timetable.update({
      where: { id },
      data,
    });

    // Update slots if provided
    if (slots && Array.isArray(slots)) {
      // Delete existing slots and recreate
      await db.timetableSlot.deleteMany({ where: { timetableId: id } });
      for (const slot of slots) {
        await db.timetableSlot.create({
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    await db.timetable.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression de l'emploi du temps" }, { status: 500 });
  }
}
