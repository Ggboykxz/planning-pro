import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }
    const rooms = await db.room.findMany({
      where: { institutionId },
      include: {
        timetableSlots: {
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la récupération des salles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const room = await db.room.create({
      data: {
        institutionId: body.institutionId,
        name: body.name,
        capacity: body.capacity,
        type: body.type,
        building: body.building,
        floor: body.floor,
        equipment: body.equipment ? JSON.stringify(body.equipment) : null,
      },
    });
    return NextResponse.json(room);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création de la salle" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.equipment && Array.isArray(data.equipment)) {
      updateData.equipment = JSON.stringify(data.equipment);
    }

    const room = await db.room.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(room);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la salle" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    await db.room.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression de la salle" }, { status: 500 });
  }
}
