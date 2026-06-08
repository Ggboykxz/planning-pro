import { dataStore, isDatabaseAvailable, checkPlanLimit } from "@/lib/data-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }

    // Try enriched query with DB
    if (await isDatabaseAvailable()) {
      const { db } = await import("@/lib/db");
      const rooms = await db.room.findMany({
        where: { institutionId },
        include: {
          timetableSlots: { select: { id: true } },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(rooms);
    }

    // Fallback: basic data
    const rooms = await dataStore.room.findMany({ where: { institutionId } });
    return NextResponse.json(rooms.map((r) => ({
      ...r,
      timetableSlots: [],
    })));
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des salles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check plan limits
    const limitCheck = await checkPlanLimit(body.institutionId, "rooms");
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: `Limite atteinte : ${limitCheck.current}/${limitCheck.limit} salles pour le plan ${limitCheck.plan}`,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: limitCheck.plan,
      }, { status: 403 });
    }

    const room = await dataStore.room.create({
      data: {
        institutionId: body.institutionId,
        name: body.name,
        capacity: body.capacity || null,
        type: body.type || null,
        building: body.building || null,
        floor: body.floor || null,
        equipment: body.equipment ? JSON.stringify(body.equipment) : null,
      },
    });
    return NextResponse.json(room);
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({
      error: "Erreur lors de la création de la salle",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
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

    const room = await dataStore.room.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(room);
  } catch (error) {
    console.error("PUT /api/rooms error:", error);
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
    await dataStore.room.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/rooms error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression de la salle" }, { status: 500 });
  }
}
