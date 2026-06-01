import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { institutionId, type, data } = body;

    if (!institutionId || !type || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "institutionId, type et data (array) requis" },
        { status: 400 }
      );
    }

    let created = 0;

    await db.$transaction(async (tx) => {
      switch (type) {
        case "teachers": {
          for (const item of data) {
            if (!item.firstName || !item.lastName) continue;
            await tx.teacher.create({
              data: {
                institutionId,
                firstName: item.firstName,
                lastName: item.lastName,
                email: item.email || null,
                phone: item.phone || null,
                specialization: item.specialization || null,
                maxHoursPerWeek: item.maxHoursPerWeek || null,
              },
            });
            created++;
          }
          break;
        }
        case "rooms": {
          for (const item of data) {
            if (!item.name) continue;
            await tx.room.create({
              data: {
                institutionId,
                name: item.name,
                capacity: item.capacity || null,
                type: item.type || null,
                building: item.building || null,
                floor: item.floor || null,
              },
            });
            created++;
          }
          break;
        }
        case "subjects": {
          for (const item of data) {
            if (!item.name) continue;
            await tx.subject.create({
              data: {
                institutionId,
                name: item.name,
                code: item.code || null,
                hoursPerWeek: item.hoursPerWeek || null,
                type: item.type || null,
                semester: item.semester || null,
                coefficient: item.coefficient || null,
              },
            });
            created++;
          }
          break;
        }
        case "classes": {
          for (const item of data) {
            if (!item.name) continue;
            await tx.class.create({
              data: {
                institutionId,
                name: item.name,
                level: item.level || null,
                department: item.department || null,
                studentCount: item.studentCount || null,
                academicYear: item.academicYear || null,
              },
            });
            created++;
          }
          break;
        }
        default:
          throw new Error(`Type inconnu: ${type}`);
      }
    });

    return NextResponse.json({ created });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erreur lors de l'importation des données" },
      { status: 500 }
    );
  }
}
