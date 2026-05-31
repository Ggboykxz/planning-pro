"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Pencil, Trash2, Mail, Phone, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface TeacherData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  maxHoursPerWeek: number | null;
  subjectAssignments: Array<{ subject: { id: string; name: string } }>;
  timetableSlots: Array<{ id: string }>;
}

interface SubjectData {
  id: string;
  name: string;
  code: string | null;
}

interface TeachersViewProps {
  institutionId: string;
}

export function TeachersView({ institutionId }: TeachersViewProps) {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherData | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialization: "",
    maxHoursPerWeek: 20,
    subjectIds: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [institutionId]);

  const loadData = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/teachers?institutionId=${institutionId}`),
        fetch(`/api/subjects?institutionId=${institutionId}`),
      ]);
      if (tRes.ok) setTeachers(await tRes.json());
      if (sRes.ok) setSubjects((await sRes.json()).map((s: SubjectData) => s));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingTeacher(null);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      specialization: "",
      maxHoursPerWeek: 20,
      subjectIds: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (teacher: TeacherData) => {
    setEditingTeacher(teacher);
    setForm({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email || "",
      phone: teacher.phone || "",
      specialization: teacher.specialization || "",
      maxHoursPerWeek: teacher.maxHoursPerWeek || 20,
      subjectIds: teacher.subjectAssignments.map((sa) => sa.subject.id),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) {
      toast.error("Le prénom et le nom sont requis");
      return;
    }
    setSaving(true);
    try {
      const url = editingTeacher ? "/api/teachers" : "/api/teachers";
      const method = editingTeacher ? "PUT" : "POST";
      const body = {
        ...(editingTeacher ? { id: editingTeacher.id } : {}),
        institutionId,
        ...form,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(
          editingTeacher
            ? "Enseignant mis à jour"
            : "Enseignant créé avec succès"
        );
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
    if (!confirm("Supprimer cet enseignant ?")) return;
    try {
      const res = await fetch(`/api/teachers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Enseignant supprimé");
        loadData();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleSubject = (subjectId: string) => {
    setForm((prev) => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter((id) => id !== subjectId)
        : [...prev.subjectIds, subjectId],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Enseignants</h1>
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
          <h1 className="text-2xl font-bold">Enseignants</h1>
          <p className="text-muted-foreground">
            Gérez les enseignants de votre établissement
          </p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un enseignant
        </Button>
      </div>

      {teachers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucun enseignant</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez votre premier enseignant pour commencer
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Spécialisation</TableHead>
                    <TableHead>Matières</TableHead>
                    <TableHead>Charge</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => {
                    const assignedSlots = teacher.timetableSlots.length;
                    const maxHours = teacher.maxHoursPerWeek || 0;
                    const loadPct = maxHours > 0 ? Math.round((assignedSlots / maxHours) * 100) : 0;
                    return (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">
                          {teacher.firstName} {teacher.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {teacher.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {teacher.email}
                              </div>
                            )}
                            {teacher.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {teacher.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {teacher.specialization && (
                            <Badge variant="outline">{teacher.specialization}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.subjectAssignments.map((sa) => (
                              <Badge key={sa.subject.id} variant="secondary" className="text-xs">
                                {sa.subject.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-sm">
                              {assignedSlots}h / {maxHours}h
                            </div>
                            <div
                              className={`h-2 w-16 rounded-full bg-muted overflow-hidden`}
                            >
                              <div
                                className={`h-full rounded-full ${
                                  loadPct > 80
                                    ? "bg-rose-500"
                                    : loadPct > 50
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(loadPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(teacher)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(teacher.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTeacher ? "Modifier l'enseignant" : "Nouvel enseignant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prénom *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  placeholder="Prénom"
                />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+221 7X XXX XXXX"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Spécialisation</Label>
                <Input
                  value={form.specialization}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      specialization: e.target.value,
                    }))
                  }
                  placeholder="Informatique, Mathématiques..."
                />
              </div>
              <div>
                <Label>Heures max / semaine</Label>
                <Input
                  type="number"
                  value={form.maxHoursPerWeek}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxHoursPerWeek: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4" />
                Matières enseignées
              </Label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <Badge
                    key={subject.id}
                    variant={
                      form.subjectIds.includes(subject.id)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleSubject(subject.id)}
                  >
                    {subject.name}
                  </Badge>
                ))}
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
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? "Enregistrement..." : editingTeacher ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
