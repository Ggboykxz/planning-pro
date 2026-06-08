import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// GET /api/institutions/search?q=searchTerm — Search public institutions by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    // Get all institutions
    const allInstitutions = await dataStore.institution.findMany();

    // Filter by name (case-insensitive) and return only public info
    const results = allInstitutions
      .filter((inst) => {
        if (!q) return true; // If no search term, return all
        return inst.name.toLowerCase().includes(q.toLowerCase());
      })
      .map((inst) => ({
        id: inst.id,
        name: inst.name,
        type: inst.type,
        country: inst.country,
        academieYear: inst.academieYear,
      }));

    // Limit to 50 results
    return NextResponse.json(results.slice(0, 50));
  } catch (error) {
    console.error("GET /api/institutions/search error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche d'établissements" },
      { status: 500 }
    );
  }
}
