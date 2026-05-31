"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
  level: string | null;
  department: string | null;
  studentCount: number | null;
  academicYear: string | null;
  subjects: Array<{ subject: { id: string; name: string }; hoursPerWeek: number | null }>;
  timetables: Array<{ id: string }>;
}

interface SubjectOption {
  id: string;
  name: string;
  hoursPerWeek: number | null;
}

interface ClassesViewProps {
  institutionId: string;
}

export function ClassesView({ institutionId }: ClassesViewProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    level: "",
    department: "",
    studentCount: 30,
    academicYear: "2025-2026",
    subjectIds: [] as Array<{ subjectId: string; hoursPerWeek: number }>,
  });

  useEffect(() => {
    loadData();
  }, [institutionId]);

  const loadData = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/classes?institutionId=${institutionId}`),
        fetch(`/api/subjects?institutionId=${institutionId}`),
      ]);
      if (cRes.ok) setClasses(await cRes.json());
      if (sRes.ok) {
        const sData = await sRes.json();
        setSubjects(sData.map((s: SubjectOption) => ({ id: s.id, name: s.name, hoursPerWeek: s.hoursPerWeek })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingClass(null);
    setForm({
      name: "",
      level: "",
      department: "",
      studentCount: 30,
      academicYear: "2025-2026",
      subjectIds: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (cls: ClassData) => {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      level: cls.level || "",
      department: cls.department || "",
      studentCount: cls.studentCount || 30,
      academicYear: cls.academicYear || "2025-2026",
      subjectIds: cls.subjects.map((s) => ({
        subjectId: s.subject.id,
        hoursPerWeek: s.hoursPerWeek || s.subject?.name ? 3 : 3,
      })),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Le nom de la classe est requis");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...(editingClass ? { id: editingClass.id } : {}),
        institutionId,
        name: form.name,
        level: form.level || null,
        department: form.department || null,
        studentCount: form.studentCount || null,
        academicYear: form.academicYear || null,
        subjectIds: form.subjectIds,
      };
      const res = await fetch("/api/classes", {
        method: editingClass ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editingClass ? "Classe mise à jour" : "Classe créée");
        setDialogOpen(false);
        loadData();
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette classe ?")) return;
    try {
      const res = await fetch(`/api/classes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Classe supprimée");
        loadData();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleSubject = (subjectId: string) => {
    setForm((prev) => {
      const existing = prev.subjectIds.find((s) => s.subjectId === subjectId);
      if (existing) {
        return { ...prev, subjectIds: prev.subjectIds.filter((s) => s.subjectId !== subjectId) };
      }
      const subject = subjects.find((s) => s.id === subjectId);
      return {
        ...prev,
        subjectIds: [...prev.subjectIds, { subjectId, hoursPerWeek: subject?.hoursPerWeek ? Math.ceil(subject.hoursPerWeek) : 3 }],
      };
    });
  };

  const updateSubjectHours = (subjectId: string, hours: number) => {
    setForm((prev) => ({
      ...prev,
      subjectIds: prev.subjectIds.map((s) =>
        s.subjectId === subjectId ? { ...s, hoursPerWeek: hours } : s
      ),
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Classes</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-muted-foreground">
            Gérez les classes et groupes d&apos;étudiants
          </p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une classe
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucune classe</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez votre première classe
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Département</TableHead>
                    <TableHead>Étudiants</TableHead>
                    <TableHead>Matières</TableHead>
                    <TableHead>Emploi du temps</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cls.level || "—"}</Badge>
                      </TableCell>
                      <TableCell>{cls.department || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {cls.studentCount || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {cls.subjects.slice(0, 3).map((s) => (
                            <Badge key={s.subject.id} variant="secondary" className="text-xs">
                              {s.subject.name}
                            </Badge>
                          ))}
                          {cls.subjects.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{cls.subjects.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cls.timetables.length > 0 ? "default" : "secondary"}
                          className={cls.timetables.length > 0 ? "bg-emerald-600" : ""}
                        >
                          {cls.timetables.length > 0 ? "Configuré" : "Non configuré"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cls)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cls.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? "Modifier la classe" : "Nouvelle classe"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: L1 Informatique"
                />
              </div>
              <div>
                <Label>Niveau</Label>
                <Input
                  value={form.level}
                  onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                  placeholder="Ex: L1, L2, Terminale"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Département</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="Ex: Informatique"
                />
              </div>
              <div>
                <Label>Nombre d&apos;étudiants</Label>
                <Input
                  type="number"
                  value={form.studentCount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, studentCount: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Année académique</Label>
              <Input
                value={form.academicYear}
                onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                placeholder="2025-2026"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4" />
                Matières associées
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {subjects.map((subject) => {
                  const isSelected = form.subjectIds.some((s) => s.subjectId === subject.id);
                  const entry = form.subjectIds.find((s) => s.subjectId === subject.id);
                  return (
                    <div key={subject.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSubject(subject.id)}
                      />
                      <span className="text-sm flex-1">{subject.name}</span>
                      {isSelected && (
                        <Input
                          type="number"
                          className="w-20 h-7 text-xs"
                          value={entry?.hoursPerWeek || 3}
                          onChange={(e) =>
                            updateSubjectHours(subject.id, parseInt(e.target.value) || 3)
                          }
                        />
                      )}
                    </div>
                  );
                })}
                {subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Créez d&apos;abord des matières
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? "Enregistrement..." : editingClass ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
