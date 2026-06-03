import { dataStore, isDatabaseAvailable } from "@/lib/data-store";
import { NextResponse } from "next/server";

function generateShareId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

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

    const timetable = await dataStore.timetable.findUnique({
      where: { id: timetableId },
    });
    if (!timetable) {
      return NextResponse.json(
        { error: "Emploi du temps non trouvé" },
        { status: 404 }
      );
    }

    const shareId = generateShareId();

    await dataStore.shareToken.create({
      data: { timetableId, shareId },
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

    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      // When DB is available, use shareToken.findUnique with includes
      // which delegates to Prisma and returns the full nested structure
      const shareToken = await dataStore.shareToken.findUnique({
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

      return NextResponse.json((shareToken as Record<string, unknown>).timetable);
    } else {
      // Fallback: manually build the response from dataStore
      const shareToken = await dataStore.shareToken.findUnique({
        where: { shareId },
      });

      if (!shareToken) {
        return NextResponse.json(
          { error: "Lien de partage invalide" },
          { status: 404 }
        );
      }

      // Get the timetable
      const timetable = await dataStore.timetable.findUnique({
        where: { id: (shareToken as Record<string, unknown>).timetableId as string },
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

      if (!timetable) {
        return NextResponse.json(
          { error: "Emploi du temps non trouvé" },
          { status: 404 }
        );
      }

      // Get institution name
      const institution = await dataStore.institution.findUnique({
        where: { id: (timetable as Record<string, unknown>).institutionId as string },
      });

      const result = {
        ...timetable,
        institution: institution ? { name: institution.name } : null,
      };

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'emploi du temps" },
      { status: 500 }
    );
  }
}
