import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const institutions = await db.institution.findMany();
    return NextResponse.json(institutions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la récupération des institutions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const institution = await db.institution.create({
      data: {
        name: body.name,
        type: body.type,
        country: body.country,
        timezone: body.timezone,
        academieYear: body.academieYear || "2025-2026",
        logo: body.logo,
        address: body.address,
        phone: body.phone,
        email: body.email,
        workingDays: JSON.stringify(body.workingDays),
        slotDuration: body.slotDuration,
        dayStartTime: body.dayStartTime,
        dayEndTime: body.dayEndTime,
        breakStartTime: body.breakStartTime,
        breakEndTime: body.breakEndTime,
        lunchDuration: body.lunchDuration,
        educationSystem: body.educationSystem,
        gradingSystem: body.gradingSystem,
        semesterSystem: body.semesterSystem,
      },
    });
    return NextResponse.json(institution);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création de l'institution" }, { status: 500 });
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
    if (data.workingDays && Array.isArray(data.workingDays)) {
      updateData.workingDays = JSON.stringify(data.workingDays);
    }

    const institution = await db.institution.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(institution);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'institution" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    await db.institution.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression de l'institution" }, { status: 500 });
  }
}
