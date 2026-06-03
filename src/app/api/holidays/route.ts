import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// GET /api/holidays — List holidays with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");
    const year = searchParams.get("year");
    const type = searchParams.get("type");

    if (!institutionId) {
      return NextResponse.json(
        { error: "institutionId est requis" },
        { status: 400 }
      );
    }

    const holidays = await dataStore.holiday.findMany({
      where: {
        institutionId,
        ...(year ? { year } : {}),
        ...(type ? { type } : {}),
      },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error("Erreur lors de la récupération des vacances:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des vacances" },
      { status: 500 }
    );
  }
}

// POST /api/holidays — Create a holiday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { institutionId, name, startDate, endDate, type } = body;

    if (!institutionId || !name || !startDate || !endDate || !type) {
      return NextResponse.json(
        {
          error:
            "institutionId, name, startDate, endDate et type sont requis",
        },
        { status: 400 }
      );
    }

    const holiday = await dataStore.holiday.create({
      data: {
        institutionId,
        name,
        startDate,
        endDate,
        type,
      },
    });

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la vacance:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la vacance" },
      { status: 500 }
    );
  }
}

// PUT /api/holidays — Update a holiday
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, startDate, endDate, type } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id est requis" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (type !== undefined) updateData.type = type;

    const holiday = await dataStore.holiday.update({
      where: { id },
      data: updateData as { name?: string; startDate?: string; endDate?: string; type?: string },
    });

    return NextResponse.json({ holiday });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la vacance:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la vacance" },
      { status: 500 }
    );
  }
}

// DELETE /api/holidays — Delete a holiday
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id est requis" },
        { status: 400 }
      );
    }

    const holiday = await dataStore.holiday.delete({
      where: { id },
    });

    return NextResponse.json({ holiday });
  } catch (error) {
    console.error("Erreur lors de la suppression de la vacance:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la vacance" },
      { status: 500 }
    );
  }
}
