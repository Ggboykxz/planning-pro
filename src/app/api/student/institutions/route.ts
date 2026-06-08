import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

interface JoinedInstitutionResult {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionType: string;
  institutionCountry: string;
  classId: string | null;
  className: string | null;
  classLevel: string | null;
  studentNumber: string | null;
  joinedAt: string;
}

// GET /api/student/institutions?userId=xxx — List institutions a student has joined
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId est requis" },
        { status: 400 }
      );
    }

    // Get all StudentInstitution records for this user
    const studentInstitutions = await dataStore.studentInstitution.findMany({
      where: { userId },
    });

    // Enrich with institution details and class info
    const results: JoinedInstitutionResult[] = [];
    for (const si of studentInstitutions) {
      const institution = await dataStore.institution.findUnique({
        where: { id: si.institutionId },
      });
      let className: string | null = null;
      let classLevel: string | null = null;
      if (si.classId) {
        const cls = await dataStore.class.findUnique({
          where: { id: si.classId },
        });
        if (cls) {
          className = cls.name || null;
          classLevel = cls.level || null;
        }
      }
      if (institution) {
        results.push({
          id: si.id,
          institutionId: institution.id,
          institutionName: institution.name,
          institutionType: institution.type,
          institutionCountry: institution.country,
          classId: si.classId || null,
          className,
          classLevel,
          studentNumber: si.studentNumber || null,
          joinedAt: si.createdAt,
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET /api/student/institutions error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des établissements" },
      { status: 500 }
    );
  }
}
