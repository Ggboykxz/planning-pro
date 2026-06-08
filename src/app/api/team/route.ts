import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// GET /api/team?institutionId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");

    if (!institutionId) {
      return NextResponse.json({ error: "institutionId requis" }, { status: 400 });
    }

    // Get user-institution relations
    const userInstitutions = await dataStore.userInstitution.findMany();
    const members = userInstitutions.filter(
      (ui: { institutionId: string }) => ui.institutionId === institutionId
    );

    // Enrich with user data
    const enrichedMembers = [];
    for (const member of members) {
      const user = await dataStore.user.findUnique({ where: { id: member.userId } });
      if (user) {
        enrichedMembers.push({
          id: member.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          role: member.role,
          avatar: user.avatar,
          plan: user.plan,
          joinedAt: member.createdAt || user.createdAt || new Date().toISOString(),
        });
      }
    }

    return NextResponse.json(enrichedMembers);
  } catch (error) {
    console.error("Team GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/team - Invite a member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { institutionId, email, role, name } = body;

    if (!institutionId || !email || !role) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Check if user exists
    let user = await dataStore.user.findUnique({ where: { email } });
    
    if (!user) {
      // Create user with default password
      user = await dataStore.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          passwordHash: `invited_${Date.now()}`,
          role: "viewer",
          plan: "free",
          isActive: true,
        },
      });
    }

    // Check if already a member
    const existing = await dataStore.userInstitution.findMany();
    const alreadyMember = existing.find(
      (ui: { userId: string; institutionId: string }) =>
        ui.userId === user!.id && ui.institutionId === institutionId
    );

    if (alreadyMember) {
      return NextResponse.json({ error: "Cet utilisateur est déjà membre" }, { status: 409 });
    }

    // Add to institution
    const userInstitution = await dataStore.userInstitution.create({
      data: {
        userId: user.id,
        institutionId,
        role,
      },
    });

    // Log audit
    await dataStore.auditLog.create({
      data: {
        action: "TEAM_INVITE",
        entity: "UserInstitution",
        entityId: userInstitution.id,
        institutionId,
        details: `Invité ${email} en tant que ${role}`,
      },
    });

    return NextResponse.json({
      id: userInstitution.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role,
      joinedAt: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Team POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/team - Update member role
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { institutionId, userId, role } = body;

    if (!institutionId || !userId || !role) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Find the userInstitution record
    const allUI = await dataStore.userInstitution.findMany();
    const record = allUI.find(
      (ui: { userId: string; institutionId: string }) =>
        ui.userId === userId && ui.institutionId === institutionId
    );

    if (!record) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    // Update role
    await dataStore.userInstitution.update({ where: { id: record.id }, data: { role } });

    // Log audit
    await dataStore.auditLog.create({
      data: {
        action: "TEAM_ROLE_UPDATE",
        entity: "UserInstitution",
        entityId: record.id,
        institutionId,
        details: `Rôle changé à ${role}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team PUT error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/team?institutionId=xxx&userId=yyy
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");
    const userId = searchParams.get("userId");

    if (!institutionId || !userId) {
      return NextResponse.json({ error: "Paramètres requis manquants" }, { status: 400 });
    }

    // Find the userInstitution record
    const allUI = await dataStore.userInstitution.findMany();
    const record = allUI.find(
      (ui: { userId: string; institutionId: string }) =>
        ui.userId === userId && ui.institutionId === institutionId
    );

    if (!record) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    // Remove from institution
    await dataStore.userInstitution.delete({ where: { id: record.id } });

    // Log audit
    await dataStore.auditLog.create({
      data: {
        action: "TEAM_REMOVE",
        entity: "UserInstitution",
        entityId: record.id,
        institutionId,
        details: `Membre retiré`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team DELETE error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
