"use client";

import { useEffect, useState } from "react";
import { StatCard } from "./StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, DoorOpen, BookOpen, GraduationCap, AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import { dayNames } from "@/lib/countries";

interface DashboardData {
  teacherCount: number;
  roomCount: number;
  subjectCount: number;
  classCount: number;
  timetableCount: number;
  conflictCount: number;
  teacherConflicts: Array<{ teacherName: string; dayOfWeek: number; time: string; classes: string[] }>;
  roomConflicts: Array<{ roomName: string; dayOfWeek: number; time: string; classes: string[] }>;
  completionRate: number;
  teacherWorkload: Array<{ id: string; name: string; assignedHours: number; maxHours: number; percentage: number }>;
  roomUtilization: Array<{ id: string; name: string; usedSlots: number; capacity: number | null }>;
  recentTimetables: Array<{ id: string; name: string; class: { name: string }; createdAt: string }>;
}

interface DashboardViewProps {
  institutionId: string;
}

export function DashboardView({ institutionId }: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [institutionId]);

  const loadDashboard = async () => {
    try {
      const res = await fetch(`/api/dashboard?institutionId=${institutionId}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de votre établissement
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Enseignants"
          value={data.teacherCount}
          icon={Users}
          color="emerald"
          subtitle={`${data.teacherWorkload.filter((t) => t.percentage > 80).length} avec charge élevée`}
        />
        <StatCard
          title="Salles"
          value={data.roomCount}
          icon={DoorOpen}
          color="amber"
          subtitle={`${data.roomUtilization.filter((r) => r.usedSlots > 0).length} utilisées`}
        />
        <StatCard
          title="Matières"
          value={data.subjectCount}
          icon={BookOpen}
          color="violet"
        />
        <StatCard
          title="Classes"
          value={data.classCount}
          icon={GraduationCap}
          color="cyan"
        />
        <StatCard
          title="Emplois du temps"
          value={data.timetableCount}
          icon={Calendar}
          color="orange"
        />
        <StatCard
          title="Conflits détectés"
          value={data.conflictCount}
          icon={AlertTriangle}
          color={data.conflictCount > 0 ? "rose" : "emerald"}
          subtitle={data.conflictCount === 0 ? "Aucun conflit" : "À résoudre"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Taux de complétion
            </CardTitle>
            <CardDescription>
              Emplois du temps générés par rapport au nombre de classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{data.completionRate}%</span>
                <Badge variant={data.completionRate === 100 ? "default" : "secondary"} className={data.completionRate === 100 ? "bg-emerald-600" : ""}>
                  {data.completionRate === 100 ? "Complet" : "En cours"}
                </Badge>
              </div>
              <Progress value={data.completionRate} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {data.timetableCount} emploi(s) du temps sur {data.classCount} classe(s)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conflicts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Conflits détectés
            </CardTitle>
            <CardDescription>
              Problèmes de planification à résoudre
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.conflictCount === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-sm text-muted-foreground">
                  Aucun conflit détecté dans les emplois du temps
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.teacherConflicts.map((c, i) => (
                  <div
                    key={`teacher-${i}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50"
                  >
                    <Badge variant="destructive" className="shrink-0">
                      Enseignant
                    </Badge>
                    <div className="text-sm">
                      <p className="font-medium">{c.teacherName}</p>
                      <p className="text-muted-foreground">
                        {dayNames[c.dayOfWeek]} {c.time} — {c.classes.join(" vs ")}
                      </p>
                    </div>
                  </div>
                ))}
                {data.roomConflicts.map((c, i) => (
                  <div
                    key={`room-${i}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50"
                  >
                    <Badge className="bg-amber-600 shrink-0">Salle</Badge>
                    <div className="text-sm">
                      <p className="font-medium">{c.roomName}</p>
                      <p className="text-muted-foreground">
                        {dayNames[c.dayOfWeek]} {c.time} — {c.classes.join(" vs ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teacher Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charge des enseignants</CardTitle>
            <CardDescription>Heures assignées vs maximum</CardDescription>
          </CardHeader>
          <CardContent>
            {data.teacherWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun enseignant configuré
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.teacherWorkload.slice(0, 8).map((t) => (
                  <div key={t.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t.name}</span>
                      <span className="text-muted-foreground">
                        {t.assignedHours}h / {t.maxHours}h
                      </span>
                    </div>
                    <Progress
                      value={t.percentage}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Timetables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emplois du temps récents</CardTitle>
            <CardDescription>Derniers emplois du temps créés</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentTimetables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun emploi du temps créé
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentTimetables.map((tt) => (
                  <div
                    key={tt.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">{tt.name}</p>
                      <p className="text-muted-foreground">{tt.class.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
