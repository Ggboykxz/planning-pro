import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

const PLAN_LIMITS: Record<string, Record<string, number>> = {
  free: { teachers: 5, rooms: 5, timetables: 3, institutions: 1, classes: 5, subjects: 10 },
  pro: { teachers: 50, rooms: 50, timetables: 999, institutions: 3, classes: 50, subjects: 100 },
  enterprise: { teachers: 9999, rooms: 9999, timetables: 9999, institutions: 9999, classes: 9999, subjects: 9999 },
};

// GET /api/billing?institutionId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");

    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }

    // Find institution owner
    const userInstitutions = await dataStore.userInstitution.findMany();
    const adminRelation = userInstitutions.find(
      (ui: { institutionId: string; role: string }) =>
        ui.institutionId === institutionId && ui.role === "admin"
    );

    let plan = "free";
    if (adminRelation) {
      const user = await dataStore.user.findUnique({ where: { id: adminRelation.userId } });
      if (user) plan = user.plan || "free";
    }

    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // Count current resources
    const teachers = await dataStore.teacher.findMany({ where: { institutionId } });
    const rooms = await dataStore.room.findMany({ where: { institutionId } });
    const timetables = await dataStore.timetable.findMany({ where: { institutionId } });
    const classes = await dataStore.class.findMany({ where: { institutionId } });
    const subjects = await dataStore.subject.findMany({ where: { institutionId } });
    const allInstitutions = await dataStore.institution.findMany();

    const usage = {
      teachers: { current: teachers.length, limit: limits.teachers },
      rooms: { current: rooms.length, limit: limits.rooms },
      timetables: { current: timetables.length, limit: limits.timetables },
      classes: { current: classes.length, limit: limits.classes },
      subjects: { current: subjects.length, limit: limits.subjects },
      institutions: { current: allInstitutions.length, limit: limits.institutions },
    };

    // Check if any limit is exceeded
    const warnings: string[] = [];
    for (const [resource, data] of Object.entries(usage)) {
      if (data.current >= data.limit) {
        warnings.push(`${resource}: limite atteinte (${data.current}/${data.limit})`);
      } else if (data.current >= data.limit * 0.8) {
        warnings.push(`${resource}: bientôt limite (${data.current}/${data.limit})`);
      }
    }

    return NextResponse.json({
      plan,
      planName: plan === "free" ? "Gratuit" : plan === "pro" ? "Pro" : "Enterprise",
      planPrice: plan === "free" ? 0 : plan === "pro" ? 29 : 99,
      usage,
      limits,
      warnings,
      features: getPlanFeatures(plan),
    });
  } catch (error) {
    console.error("Billing GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/billing - Update plan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, plan } = body;

    if (!userId || !plan) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (!["free", "pro", "enterprise"].includes(plan)) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const user = await dataStore.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    await dataStore.user.update({ where: { id: userId }, data: {
      plan,
      planExpiresAt: plan !== "free" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    } });

    // Log audit
    // Update localStorage on client side is handled by the client
    // The plan change is effective immediately server-side
    await dataStore.auditLog.create({
      data: {
        action: "PLAN_UPDATE",
        entity: "user",
        entityId: userId,
        details: `Plan changé à ${plan}`,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Billing POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function getPlanFeatures(plan: string): Record<string, boolean> {
  const features: Record<string, Record<string, boolean>> = {
    free: {
      ai_generation: false,
      conflict_detection: true,
      multi_institution: false,
      advanced_export: false,
      api_access: false,
      sso: false,
      priority_support: false,
      webhooks: false,
      team_management: false,
    },
    pro: {
      ai_generation: true,
      conflict_detection: true,
      multi_institution: true,
      advanced_export: true,
      api_access: false,
      sso: false,
      priority_support: true,
      webhooks: false,
      team_management: true,
    },
    enterprise: {
      ai_generation: true,
      conflict_detection: true,
      multi_institution: true,
      advanced_export: true,
      api_access: true,
      sso: true,
      priority_support: true,
      webhooks: true,
      team_management: true,
    },
  };
  return features[plan] || features.free;
}
