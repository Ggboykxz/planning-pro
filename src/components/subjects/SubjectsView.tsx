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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { subjectTypes } from "@/lib/countries";
import { toast } from "sonner";

interface SubjectData {
  id: string;
  name: string;
  code: string | null;
  hoursPerWeek: number | null;
  type: string | null;
  semester: string | null;
  coefficient: number | null;
  teacherAssignments: Array<{ teacher: { id: string; firstName: string; lastName: string } }>;
  classSubjects: Array<{ class: { id: string; name: string } }>;
}

interface SubjectsViewProps {
  institutionId: string;
}

export function SubjectsView({ institutionId }: SubjectsViewProps) {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectData | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    hoursPerWeek: 3,
    type: "cours",
    semester: "S1",
    coefficient: 1,
  });

  useEffect(() => {
    loadSubjects();
  }, [institutionId]);

  const loadSubjects = async () => {
    try {
      const res = await fetch(`/api/subjects?institutionId=${institutionId}`);
      if (res.ok) setSubjects(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingSubject(null);
    setForm({ name: "", code: "", hoursPerWeek: 3, type: "cours", semester: "S1", coefficient: 1 });
    setDialogOpen(true);
  };

  const openEdit = (subject: SubjectData) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code || "",
      hoursPerWeek: subject.hoursPerWeek || 3,
      type: subject.type || "cours",
      semester: subject.semester || "S1",
      coefficient: subject.coefficient || 1,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Le nom de la matière est requis");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...(editingSubject ? { id: editingSubject.id } : {}),
        institutionId,
        ...form,
        code: form.code || null,
        hoursPerWeek: form.hoursPerWeek || null,
        coefficient: form.coefficient || null,
        semester: form.semester || null,
      };
      const res = await fetch("/api/subjects", {
        method: editingSubject ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editingSubject ? "Matière mise à jour" : "Matière créée");
        setDialogOpen(false);
        loadSubjects();
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
    if (!confirm("Supprimer cette matière ?")) return;
    try {
      const res = await fetch(`/api/subjects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Matière supprimée");
        loadSubjects();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getTypeLabel = (type: string | null) => {
    return subjectTypes.find((st) => st.value === type)?.label || type || "—";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Matières</h1>
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
          <h1 className="text-2xl font-bold">Matières</h1>
          <p className="text-muted-foreground">
            Gérez les matières et unités d&apos;enseignement
          </p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une matière
        </Button>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucune matière</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez votre première matière
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
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Heures/sem</TableHead>
                    <TableHead>Semestre</TableHead>
                    <TableHead>Coef.</TableHead>
                    <TableHead>Enseignants</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {subject.code || "—"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(subject.type)}</Badge>
                      </TableCell>
                      <TableCell>{subject.hoursPerWeek || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{subject.semester || "—"}</Badge>
                      </TableCell>
                      <TableCell>{subject.coefficient || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {subject.teacherAssignments.map((ta) => (
                            <span key={ta.teacher.id} className="text-xs text-muted-foreground">
                              {ta.teacher.firstName} {ta.teacher.lastName}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {subject.classSubjects.map((cs) => (
                            <Badge key={cs.class.id} variant="secondary" className="text-xs">
                              {cs.class.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(subject)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(subject.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? "Modifier la matière" : "Nouvelle matière"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Algorithmique"
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Ex: INF201"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectTypes.map((st) => (
                      <SelectItem key={st.value} value={st.value}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Heures/sem</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.hoursPerWeek}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, hoursPerWeek: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <Label>Coefficient</Label>
                <Input
                  type="number"
                  value={form.coefficient}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, coefficient: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Semestre</Label>
              <Select value={form.semester} onValueChange={(v) => setForm((prev) => ({ ...prev, semester: v }))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S1">S1</SelectItem>
                  <SelectItem value="S2">S2</SelectItem>
                  <SelectItem value="S3">S3</SelectItem>
                  <SelectItem value="S4">S4</SelectItem>
                  <SelectItem value="S5">S5</SelectItem>
                  <SelectItem value="S6">S6</SelectItem>
                  <SelectItem value="Annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? "Enregistrement..." : editingSubject ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
