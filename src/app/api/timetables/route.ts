import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    const classId = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");
    const roomId = searchParams.get("roomId");

    // Get timetable by class
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

    // Get timetable by teacher - gather all slots for this teacher across all timetables
    if (teacherId) {
      const teacher = await db.teacher.findUnique({
        where: { id: teacherId },
        select: { firstName: true, lastName: true },
      });

      if (!teacher) {
        return NextResponse.json({ error: "Enseignant non trouve" }, { status: 404 });
      }

      const slots = await db.timetableSlot.findMany({
        where: { teacherId },
        include: {
          subject: true,
          teacher: true,
          room: true,
          timetable: {
            include: { class: true },
          },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });

      // Format as a timetable-like structure
      const timetable = {
        id: `teacher-${teacherId}`,
        name: `Emploi du temps - ${teacher.firstName} ${teacher.lastName}`,
        class: { id: teacherId, name: `${teacher.firstName} ${teacher.lastName}` },
        slots: slots.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject,
          teacher: s.teacher,
          room: s.room,
          className: s.timetable?.class?.name || "",
        })),
      };
      return NextResponse.json(timetable);
    }

    // Get timetable by room - gather all slots for this room across all timetables
    if (roomId) {
      const room = await db.room.findUnique({
        where: { id: roomId },
        select: { name: true },
      });

      if (!room) {
        return NextResponse.json({ error: "Salle non trouvee" }, { status: 404 });
      }

      const slots = await db.timetableSlot.findMany({
        where: { roomId },
        include: {
          subject: true,
          teacher: true,
          room: true,
          timetable: {
            include: { class: true },
          },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });

      const timetable = {
        id: `room-${roomId}`,
        name: `Emploi du temps - ${room.name}`,
        class: { id: roomId, name: room.name },
        slots: slots.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject,
          teacher: s.teacher,
          room: s.room,
          className: s.timetable?.class?.name || "",
        })),
      };
      return NextResponse.json(timetable);
    }

    if (!institutionId) {
      return NextResponse.json({ error: "institutionId, classId, teacherId ou roomId requis" }, { status: 400 });
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
