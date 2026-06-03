import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// GET /api/audit - returns audit logs with optional filters
export async function GET(req: NextRequest) {
  try {
    const institutionId = req.nextUrl.searchParams.get("institutionId");
    const entity = req.nextUrl.searchParams.get("entity");
    const action = req.nextUrl.searchParams.get("action");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10);

    // Build where clause
    const where: Record<string, string> = {};
    if (institutionId) where.institutionId = institutionId;
    if (entity) where.entity = entity;
    // Note: action filtering done in-memory below since dataStore doesn't support it directly

    const logs = await dataStore.auditLog.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
    });

    // Filter by action in-memory
    let filtered = logs as any[];
    if (action) {
      filtered = filtered.filter((log: any) => log.action === action);
    }

    // Enrich with user name
    const enriched = await Promise.all(
      filtered.map(async (log: any) => {
        let userName = "Système";
        if (log.userId) {
          try {
            const user = await dataStore.user.findUnique({ where: { id: log.userId } });
            if (user) {
              userName = (user as any).name || "Utilisateur inconnu";
            }
          } catch {
            userName = "Utilisateur inconnu";
          }
        }
        return {
          ...log,
          userName,
        };
      })
    );

    // Sort by createdAt descending
    enriched.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = enriched.length;
    const paginated = enriched.slice(offset, offset + limit);

    return NextResponse.json({
      logs: paginated,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
