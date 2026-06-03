import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

// POST /api/seed — Create comprehensive demo data for an institution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { institutionId } = body;

    if (!institutionId) {
      return NextResponse.json(
        { error: "institutionId est requis" },
        { status: 400 }
      );
    }

    // Verify institution exists
    const institution = await dataStore.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) {
      return NextResponse.json(
        { error: "Établissement non trouvé" },
        { status: 404 }
      );
    }

    // ─── 15 Teachers ──────────────────────────────────────────────
    const teachersData = [
      { firstName: "Amadou", lastName: "Diallo", email: "a.diallo@univ.fr", specialization: "Mathématiques", maxHoursPerWeek: 20 },
      { firstName: "Marie", lastName: "Dupont", email: "m.dupont@univ.fr", specialization: "Physique-Chimie", maxHoursPerWeek: 19 },
      { firstName: "Jean-Pierre", lastName: "Martin", email: "jp.martin@univ.fr", specialization: "Informatique", maxHoursPerWeek: 21 },
      { firstName: "Fatou", lastName: "Sow", email: "f.sow@univ.fr", specialization: "Français", maxHoursPerWeek: 18 },
      { firstName: "David", lastName: "Johnson", email: "d.johnson@univ.fr", specialization: "Anglais", maxHoursPerWeek: 20 },
      { firstName: "Aïcha", lastName: "Traoré", email: "a.traore@univ.fr", specialization: "Histoire-Géographie", maxHoursPerWeek: 19 },
      { firstName: "Paul", lastName: "Ngassa", email: "p.ngassa@univ.fr", specialization: "SVT", maxHoursPerWeek: 22 },
      { firstName: "Claire", lastName: "Rousseau", email: "c.rousseau@univ.fr", specialization: "Philosophie", maxHoursPerWeek: 18 },
      { firstName: "Omar", lastName: "Ba", email: "o.ba@univ.fr", specialization: "EPS", maxHoursPerWeek: 20 },
      { firstName: "Sophie", lastName: "Laurent", email: "s.laurent@univ.fr", specialization: "Économie", maxHoursPerWeek: 19 },
      { firstName: "Ibrahim", lastName: "Ndiaye", email: "i.ndiaye@univ.fr", specialization: "Mathématiques (L2/L3)", maxHoursPerWeek: 21 },
      { firstName: "Isabelle", lastName: "Petit", email: "i.petit@univ.fr", specialization: "Physique (TP)", maxHoursPerWeek: 20 },
      { firstName: "Karim", lastName: "Benali", email: "k.benali@univ.fr", specialization: "Informatique (TD)", maxHoursPerWeek: 19 },
      { firstName: "Nathalie", lastName: "Dubois", email: "n.dubois@univ.fr", specialization: "Lettres Modernes", maxHoursPerWeek: 18 },
      { firstName: "Emmanuel", lastName: "Okafor", email: "e.okafor@univ.fr", specialization: "Sciences Sociales", maxHoursPerWeek: 20 },
    ];

    const teachers = [];
    for (const t of teachersData) {
      const teacher = await dataStore.teacher.create({
        data: {
          institutionId,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          specialization: t.specialization,
          maxHoursPerWeek: t.maxHoursPerWeek,
        },
      });
      teachers.push(teacher);
    }

    // ─── 20 Rooms ─────────────────────────────────────────────────
    const roomsData = [
      // Amphis
      { name: "Amphi A", capacity: 300, type: "amphi", building: "Bâtiment Principal" },
      { name: "Amphi B", capacity: 250, type: "amphi", building: "Bâtiment Principal" },
      { name: "Amphi C", capacity: 200, type: "amphi", building: "Bâtiment Secondaire" },
      // Salles TD
      { name: "Salle TD 101", capacity: 40, type: "salle_td", building: "Bâtiment A", floor: "1" },
      { name: "Salle TD 102", capacity: 40, type: "salle_td", building: "Bâtiment A", floor: "1" },
      { name: "Salle TD 103", capacity: 40, type: "salle_td", building: "Bâtiment A", floor: "1" },
      { name: "Salle TD 104", capacity: 40, type: "salle_td", building: "Bâtiment B", floor: "1" },
      { name: "Salle TD 105", capacity: 40, type: "salle_td", building: "Bâtiment B", floor: "1" },
      { name: "Salle TD 106", capacity: 40, type: "salle_td", building: "Bâtiment B", floor: "1" },
      // Laboratoires
      { name: "Labo Physique", capacity: 30, type: "labo", building: "Bâtiment Scientifique", floor: "0", equipment: "Oscilloscopes, Générateurs, Multimètres" },
      { name: "Labo Chimie", capacity: 30, type: "labo", building: "Bâtiment Scientifique", floor: "0", equipment: "Hottes, Verrierie, Réactifs" },
      { name: "Labo Info", capacity: 30, type: "labo", building: "Bâtiment Informatique", floor: "0", equipment: "Postes Linux, Réseau isolé" },
      // Salles Info
      { name: "Salle Info 201", capacity: 25, type: "salle_info", building: "Bâtiment Informatique", floor: "2", equipment: "25 PC Windows, Vidéoprojecteur" },
      { name: "Salle Info 202", capacity: 25, type: "salle_info", building: "Bâtiment Informatique", floor: "2", equipment: "25 PC Windows, Vidéoprojecteur" },
      { name: "Salle Info 203", capacity: 25, type: "salle_info", building: "Bâtiment Informatique", floor: "2", equipment: "25 PC Mac, Vidéoprojecteur" },
      // Salles normales
      { name: "Salle 301", capacity: 35, type: "salle_normale", building: "Bâtiment C", floor: "3" },
      { name: "Salle 302", capacity: 35, type: "salle_normale", building: "Bâtiment C", floor: "3" },
      { name: "Salle 303", capacity: 35, type: "salle_normale", building: "Bâtiment C", floor: "3" },
      { name: "Salle 304", capacity: 35, type: "salle_normale", building: "Bâtiment C", floor: "3" },
      { name: "Salle 305", capacity: 35, type: "salle_normale", building: "Bâtiment C", floor: "3" },
    ];

    const rooms = [];
    for (const r of roomsData) {
      const room = await dataStore.room.create({
        data: {
          institutionId,
          name: r.name,
          capacity: r.capacity,
          type: r.type,
          building: r.building,
          floor: r.floor || null,
          equipment: r.equipment || null,
        },
      });
      rooms.push(room);
    }

    // ─── 15 Subjects ──────────────────────────────────────────────
    const subjectsData = [
      { name: "Mathématiques I", code: "MATH101", hoursPerWeek: 6, type: "cours", semester: "S1", coefficient: 4 },
      { name: "Mathématiques II", code: "MATH201", hoursPerWeek: 5, type: "cours", semester: "S3", coefficient: 4 },
      { name: "Physique I", code: "PHY101", hoursPerWeek: 5, type: "cours", semester: "S1", coefficient: 3 },
      { name: "Physique II", code: "PHY201", hoursPerWeek: 4, type: "cours", semester: "S3", coefficient: 3 },
      { name: "Algorithme", code: "INFO101", hoursPerWeek: 4, type: "cours", semester: "S1", coefficient: 3 },
      { name: "Programmation", code: "INFO201", hoursPerWeek: 4, type: "tp", semester: "S3", coefficient: 3 },
      { name: "Français", code: "FR101", hoursPerWeek: 3, type: "cours", semester: "S1", coefficient: 2 },
      { name: "Anglais", code: "ANG101", hoursPerWeek: 2, type: "cours", semester: "S1", coefficient: 2 },
      { name: "Histoire-Géo", code: "HG101", hoursPerWeek: 3, type: "cours", semester: "S1", coefficient: 2 },
      { name: "SVT", code: "SVT101", hoursPerWeek: 3, type: "cours", semester: "S1", coefficient: 2 },
      { name: "Philosophie", code: "PHIL101", hoursPerWeek: 3, type: "cours", semester: "S1", coefficient: 2 },
      { name: "Économie", code: "ECO101", hoursPerWeek: 3, type: "cours", semester: "S1", coefficient: 2 },
      { name: "Bases de données", code: "INFO301", hoursPerWeek: 4, type: "tp", semester: "S5", coefficient: 3 },
      { name: "Analyse", code: "MATH301", hoursPerWeek: 5, type: "cours", semester: "S5", coefficient: 4 },
      { name: "Mécanique", code: "PHY301", hoursPerWeek: 4, type: "td", semester: "S5", coefficient: 3 },
    ];

    const subjects = [];
    for (const s of subjectsData) {
      const subject = await dataStore.subject.create({
        data: {
          institutionId,
          name: s.name,
          code: s.code,
          hoursPerWeek: s.hoursPerWeek,
          type: s.type,
          semester: s.semester,
          coefficient: s.coefficient,
        },
      });
      subjects.push(subject);
    }

    // ─── 8 Classes ────────────────────────────────────────────────
    const classesData = [
      { name: "L1 Informatique", level: "L1", department: "Informatique", studentCount: 40, academicYear: "2025-2026" },
      { name: "L1 Mathématiques", level: "L1", department: "Mathématiques", studentCount: 35, academicYear: "2025-2026" },
      { name: "L2 Informatique", level: "L2", department: "Informatique", studentCount: 30, academicYear: "2025-2026" },
      { name: "L2 Physique", level: "L2", department: "Physique", studentCount: 28, academicYear: "2025-2026" },
      { name: "L3 Informatique", level: "L3", department: "Informatique", studentCount: 25, academicYear: "2025-2026" },
      { name: "Terminale S", level: "Terminale", department: "Scientifique", studentCount: 36, academicYear: "2025-2026" },
      { name: "Première ES", level: "Première", department: "Économique", studentCount: 32, academicYear: "2025-2026" },
      { name: "L1 Économie", level: "L1", department: "Économie", studentCount: 38, academicYear: "2025-2026" },
    ];

    const classes = [];
    for (const c of classesData) {
      const cls = await dataStore.class.create({
        data: {
          institutionId,
          name: c.name,
          level: c.level,
          department: c.department,
          studentCount: c.studentCount,
          academicYear: c.academicYear,
        },
      });
      classes.push(cls);
    }

    // ─── Teacher-Subject Links (each teacher to 2-3 subjects) ────
    const teacherSubjectLinks: { teacherIdx: number; subjectIdx: number }[] = [
      // Amadou Diallo (0) - Mathématiques I, Mathématiques II, Analyse
      { teacherIdx: 0, subjectIdx: 0 }, { teacherIdx: 0, subjectIdx: 1 }, { teacherIdx: 0, subjectIdx: 13 },
      // Marie Dupont (1) - Physique I, Physique II, Mécanique
      { teacherIdx: 1, subjectIdx: 2 }, { teacherIdx: 1, subjectIdx: 3 }, { teacherIdx: 1, subjectIdx: 14 },
      // Jean-Pierre Martin (2) - Algorithme, Programmation, Bases de données
      { teacherIdx: 2, subjectIdx: 4 }, { teacherIdx: 2, subjectIdx: 5 }, { teacherIdx: 2, subjectIdx: 12 },
      // Fatou Sow (3) - Français, Lettres Modernes
      { teacherIdx: 3, subjectIdx: 6 }, { teacherIdx: 3, subjectIdx: 13 - 1 }, // index 12 already used, use index 6 + 13
      // David Johnson (4) - Anglais
      { teacherIdx: 4, subjectIdx: 7 },
      // Aïcha Traoré (5) - Histoire-Géo, Philosophie
      { teacherIdx: 5, subjectIdx: 8 }, { teacherIdx: 5, subjectIdx: 10 },
      // Paul Ngassa (6) - SVT, Physique I
      { teacherIdx: 6, subjectIdx: 9 }, { teacherIdx: 6, subjectIdx: 2 },
      // Claire Rousseau (7) - Philosophie, Français
      { teacherIdx: 7, subjectIdx: 10 }, { teacherIdx: 7, subjectIdx: 6 },
      // Omar Ba (8) - EPS (use SVT as proxy), Histoire-Géo
      { teacherIdx: 8, subjectIdx: 9 }, { teacherIdx: 8, subjectIdx: 8 },
      // Sophie Laurent (9) - Économie
      { teacherIdx: 9, subjectIdx: 11 },
      // Ibrahim Ndiaye (10) - Mathématiques II, Analyse
      { teacherIdx: 10, subjectIdx: 1 }, { teacherIdx: 10, subjectIdx: 13 },
      // Isabelle Petit (11) - Physique II, Physique I
      { teacherIdx: 11, subjectIdx: 3 }, { teacherIdx: 11, subjectIdx: 2 },
      // Karim Benali (12) - Programmation, Bases de données
      { teacherIdx: 12, subjectIdx: 5 }, { teacherIdx: 12, subjectIdx: 12 },
      // Nathalie Dubois (13) - Français, Philosophie
      { teacherIdx: 13, subjectIdx: 6 }, { teacherIdx: 13, subjectIdx: 10 },
      // Emmanuel Okafor (14) - Économie, Histoire-Géo
      { teacherIdx: 14, subjectIdx: 11 }, { teacherIdx: 14, subjectIdx: 8 },
    ];

    // Fix Fatou Sow (3) - Français (6) + Lettres Modernes — there's no "Lettres Modernes" subject
    // so let's give her Français and Histoire-Géo
    // Already has: {3, 6} — add {3, 8}
    teacherSubjectLinks.push({ teacherIdx: 3, subjectIdx: 8 });

    const teacherSubjects = [];
    for (const link of teacherSubjectLinks) {
      const ts = await dataStore.teacherSubject.create({
        data: {
          teacherId: teachers[link.teacherIdx].id,
          subjectId: subjects[link.subjectIdx].id,
          institutionId,
        },
      });
      teacherSubjects.push(ts);
    }

    // ─── Class-Subject Links (each class with 5-7 subjects and hours) ──
    const classSubjectLinks: { classIdx: number; subjectIdx: number; hoursPerWeek: number }[] = [
      // L1 Informatique (0): MATH101, PHY101, INFO101, FR101, ANG101, HG101 (6 subjects)
      { classIdx: 0, subjectIdx: 0, hoursPerWeek: 6 },
      { classIdx: 0, subjectIdx: 2, hoursPerWeek: 5 },
      { classIdx: 0, subjectIdx: 4, hoursPerWeek: 4 },
      { classIdx: 0, subjectIdx: 6, hoursPerWeek: 3 },
      { classIdx: 0, subjectIdx: 7, hoursPerWeek: 2 },
      { classIdx: 0, subjectIdx: 8, hoursPerWeek: 3 },

      // L1 Mathématiques (1): MATH101, PHY101, FR101, ANG101, SVT101, HG101 (6 subjects)
      { classIdx: 1, subjectIdx: 0, hoursPerWeek: 6 },
      { classIdx: 1, subjectIdx: 2, hoursPerWeek: 5 },
      { classIdx: 1, subjectIdx: 6, hoursPerWeek: 3 },
      { classIdx: 1, subjectIdx: 7, hoursPerWeek: 2 },
      { classIdx: 1, subjectIdx: 9, hoursPerWeek: 3 },
      { classIdx: 1, subjectIdx: 8, hoursPerWeek: 3 },

      // L2 Informatique (2): MATH201, INFO201, PHY201, ANG101, ECO101 (5 subjects)
      { classIdx: 2, subjectIdx: 1, hoursPerWeek: 5 },
      { classIdx: 2, subjectIdx: 5, hoursPerWeek: 4 },
      { classIdx: 2, subjectIdx: 3, hoursPerWeek: 4 },
      { classIdx: 2, subjectIdx: 7, hoursPerWeek: 2 },
      { classIdx: 2, subjectIdx: 11, hoursPerWeek: 3 },

      // L2 Physique (3): MATH201, PHY201, PHY101, ANG101, FR101 (5 subjects)
      { classIdx: 3, subjectIdx: 1, hoursPerWeek: 5 },
      { classIdx: 3, subjectIdx: 3, hoursPerWeek: 4 },
      { classIdx: 3, subjectIdx: 2, hoursPerWeek: 3 },
      { classIdx: 3, subjectIdx: 7, hoursPerWeek: 2 },
      { classIdx: 3, subjectIdx: 6, hoursPerWeek: 3 },

      // L3 Informatique (4): INFO301, MATH301, INFO201, ANG101, ECO101 (5 subjects)
      { classIdx: 4, subjectIdx: 12, hoursPerWeek: 4 },
      { classIdx: 4, subjectIdx: 13, hoursPerWeek: 5 },
      { classIdx: 4, subjectIdx: 5, hoursPerWeek: 4 },
      { classIdx: 4, subjectIdx: 7, hoursPerWeek: 2 },
      { classIdx: 4, subjectIdx: 11, hoursPerWeek: 3 },

      // Terminale S (5): MATH101, PHY101, SVT101, FR101, PHIL101, ANG101, HG101 (7 subjects)
      { classIdx: 5, subjectIdx: 0, hoursPerWeek: 6 },
      { classIdx: 5, subjectIdx: 2, hoursPerWeek: 5 },
      { classIdx: 5, subjectIdx: 9, hoursPerWeek: 3 },
      { classIdx: 5, subjectIdx: 6, hoursPerWeek: 3 },
      { classIdx: 5, subjectIdx: 10, hoursPerWeek: 3 },
      { classIdx: 5, subjectIdx: 7, hoursPerWeek: 2 },
      { classIdx: 5, subjectIdx: 8, hoursPerWeek: 3 },

      // Première ES (6): ECO101, MATH101, HG101, FR101, ANG101, PHIL101 (6 subjects)
      { classIdx: 6, subjectIdx: 11, hoursPerWeek: 4 },
      { classIdx: 6, subjectIdx: 0, hoursPerWeek: 4 },
      { classIdx: 6, subjectIdx: 8, hoursPerWeek: 3 },
      { classIdx: 6, subjectIdx: 6, hoursPerWeek: 3 },
      { classIdx: 6, subjectIdx: 7, hoursPerWeek: 2 },
      { classIdx: 6, subjectIdx: 10, hoursPerWeek: 3 },

      // L1 Économie (7): ECO101, MATH101, FR101, ANG101, HG101, PHIL101 (6 subjects)
      { classIdx: 7, subjectIdx: 11, hoursPerWeek: 4 },
      { classIdx: 7, subjectIdx: 0, hoursPerWeek: 4 },
      { classIdx: 7, subjectIdx: 6, hoursPerWeek: 3 },
      { classIdx: 7, subjectIdx: 7, hoursPerWeek: 2 },
      { classIdx: 7, subjectIdx: 8, hoursPerWeek: 3 },
      { classIdx: 7, subjectIdx: 10, hoursPerWeek: 3 },
    ];

    const classSubjects = [];
    for (const link of classSubjectLinks) {
      const cs = await dataStore.classSubject.create({
        data: {
          classId: classes[link.classIdx].id,
          subjectId: subjects[link.subjectIdx].id,
          institutionId,
          hoursPerWeek: link.hoursPerWeek,
        },
      });
      classSubjects.push(cs);
    }

    return NextResponse.json(
      {
        message: "Données de démonstration créées avec succès",
        summary: {
          teachers: teachers.length,
          rooms: rooms.length,
          subjects: subjects.length,
          classes: classes.length,
          teacherSubjects: teacherSubjects.length,
          classSubjects: classSubjects.length,
        },
        data: {
          teacherIds: teachers.map((t) => t.id),
          roomIds: rooms.map((r) => r.id),
          subjectIds: subjects.map((s) => s.id),
          classIds: classes.map((c) => c.id),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur lors de la création des données de démonstration:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création des données de démonstration" },
      { status: 500 }
    );
  }
}
