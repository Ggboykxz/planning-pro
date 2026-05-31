"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
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
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const firstNameRef = useRef<HTMLInputElement>(null);

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

  // Focus first input when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => firstNameRef.current?.focus(), 100);
      setValidationErrors({});
    }
  }, [dialogOpen]);

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
    setValidationErrors({});
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
    setValidationErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    if (!form.firstName) errors.firstName = true;
    if (!form.lastName) errors.lastName = true;
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Le prénom et le nom sont requis");
      return;
    }
    setSaving(true);
    try {
      const url = "/api/teachers";
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
        toast.success(editingTeacher ? "Enseignant mis à jour ✓" : "Enseignant créé ✓");
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
        toast.success("Enseignant supprimé ✓");
        loadData();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.size} enseignant(s) ?`)) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/teachers?id=${id}`, { method: "DELETE" });
      }
      toast.success(`${selectedIds.size} enseignant(s) supprimé(s) ✓`);
      setSelectedIds(new Set());
      loadData();
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTeachers = teachers.filter((t) =>
    `${t.firstName} ${t.lastName} ${t.specialization || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Enseignants</h1>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Enseignants</h1>
          <p className="text-xs text-[#9A9898] mt-1">
            Gérez les enseignants de votre établissement
            {teachers.length > 0 && <span className="ml-1">({teachers.length})</span>}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
        >
          <Plus className="h-3 w-3 mr-1" />
          Ajouter un enseignant
        </Button>
      </div>

      {/* Search & Bulk actions */}
      <div className="flex items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un enseignant..." />
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="ghost"
            onClick={handleBulkDelete}
            className="text-xs text-[#DC2626] hover:text-[#DC2626]"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Supprimer ({selectedIds.size})
          </Button>
        )}
      </div>

      {filteredTeachers.length === 0 ? (
        <EmptyState
          title={search ? "Aucun résultat" : "Aucun enseignant"}
          description={search ? "Essayez un autre terme de recherche" : "Ajoutez votre premier enseignant pour commencer"}
          action={
            !search ? (
              <Button
                onClick={openCreate}
                variant="ghost"
                className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A]"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC] w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredTeachers.length && filteredTeachers.length > 0}
                    onChange={() => {
                      if (selectedIds.size === filteredTeachers.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredTeachers.map((t) => t.id)));
                      }
                    }}
                    className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                  />
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Nom</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Contact</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Spécialisation</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Matières</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Charge</th>
                <th className="p-2 text-xs font-bold text-right text-[#201D1D] dark:text-[#FDFCFC]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => {
                const assignedSlots = teacher.timetableSlots.length;
                const maxHours = teacher.maxHoursPerWeek || 0;
                const loadPct = maxHours > 0 ? Math.round((assignedSlots / maxHours) * 100) : 0;
                return (
                  <tr
                    key={teacher.id}
                    className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(teacher.id)}
                        onChange={() => toggleSelect(teacher.id)}
                        className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                      />
                    </td>
                    <td className="p-2 text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                      {teacher.firstName} {teacher.lastName}
                    </td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">
                      {teacher.email && <p>{teacher.email}</p>}
                      {teacher.phone && <p>{teacher.phone}</p>}
                    </td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">
                      {teacher.specialization || "—"}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjectAssignments.map((sa) => (
                          <span key={sa.subject.id} className="text-[10px] px-1.5 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898]">
                            {sa.subject.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#646262] dark:text-[#9A9898]">
                          {assignedSlots}h / {maxHours}h
                        </span>
                        <div className="w-12 h-1 bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                          <div
                            className={`h-full transition-all duration-500 ${
                              loadPct > 80 ? "bg-[#DC2626]" : loadPct > 50 ? "bg-[#D97706]" : "bg-[#201D1D] dark:bg-[#FDFCFC]"
                            }`}
                            style={{ width: `${Math.min(loadPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(teacher)}
                          className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          className="p-1.5 text-[#646262] hover:text-[#DC2626] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingTeacher ? "Modifier l'enseignant" : "Nouvel enseignant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">
                  Prénom <span className="text-[#DC2626]">*</span>
                </Label>
                <Input
                  ref={firstNameRef}
                  value={form.firstName}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, firstName: e.target.value }));
                    if (e.target.value) setValidationErrors((prev) => ({ ...prev, firstName: false }));
                  }}
                  placeholder="Prénom"
                  className={`mt-1 ${validationErrors.firstName ? "border-[#DC2626] focus:border-[#DC2626]" : ""}`}
                />
                {validationErrors.firstName && (
                  <p className="text-[10px] text-[#DC2626] mt-1">Requis</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-bold">
                  Nom <span className="text-[#DC2626]">*</span>
                </Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, lastName: e.target.value }));
                    if (e.target.value) setValidationErrors((prev) => ({ ...prev, lastName: false }));
                  }}
                  placeholder="Nom"
                  className={`mt-1 ${validationErrors.lastName ? "border-[#DC2626] focus:border-[#DC2626]" : ""}`}
                />
                {validationErrors.lastName && (
                  <p className="text-[10px] text-[#DC2626] mt-1">Requis</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemple.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+221 7X XXX XXXX"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Spécialisation</Label>
                <Input
                  value={form.specialization}
                  onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
                  placeholder="Informatique, Mathématiques..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Heures max / semaine</Label>
                <Input
                  type="number"
                  value={form.maxHoursPerWeek}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxHoursPerWeek: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold flex items-center gap-1 mb-2">
                <BookOpen className="h-3 w-3" />
                Matières enseignées
              </Label>
              <div className="flex flex-wrap gap-1">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => toggleSubject(subject.id)}
                    className={`text-[10px] px-2 py-1 border transition-all duration-150 ${
                      form.subjectIds.includes(subject.id)
                        ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold"
                        : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                    }`}
                  >
                    {subject.name}
                  </button>
                ))}
                {subjects.length === 0 && (
                  <p className="text-xs text-[#9A9898]">Créez d&apos;abord des matières</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-xs">
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            >
              {saving ? "Enregistrement..." : editingTeacher ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
