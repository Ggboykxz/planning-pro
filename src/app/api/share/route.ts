import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { timetableId } = body;

    if (!timetableId) {
      return NextResponse.json(
        { error: "timetableId requis" },
        { status: 400 }
      );
    }

    const timetable = await db.timetable.findUnique({
      where: { id: timetableId },
    });
    if (!timetable) {
      return NextResponse.json(
        { error: "Emploi du temps non trouvé" },
        { status: 404 }
      );
    }

    const shareId = randomBytes(8).toString("hex");

    await db.shareToken.create({
      data: {
        timetableId,
        shareId,
      },
    });

    return NextResponse.json({ shareId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erreur lors de la création du lien de partage" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("shareId");

    if (!shareId) {
      return NextResponse.json(
        { error: "shareId requis" },
        { status: 400 }
      );
    }

    const shareToken = await db.shareToken.findUnique({
      where: { shareId },
      include: {
        timetable: {
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
            institution: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!shareToken) {
      return NextResponse.json(
        { error: "Lien de partage invalide" },
        { status: 404 }
      );
    }

    return NextResponse.json(shareToken.timetable);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'emploi du temps" },
      { status: 500 }
    );
  }
}
