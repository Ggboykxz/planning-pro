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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
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
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const nameRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => nameRef.current?.focus(), 100);
      setValidationErrors({});
    }
  }, [dialogOpen]);

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
    setValidationErrors({});
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
        hoursPerWeek: s.hoursPerWeek || 3,
      })),
    });
    setValidationErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    if (!form.name) errors.name = true;
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
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
        toast.success(editingClass ? "Classe mise à jour ✓" : "Classe créée ✓");
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
        toast.success("Classe supprimée ✓");
        loadData();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.size} classe(s) ?`)) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/classes?id=${id}`, { method: "DELETE" });
      }
      toast.success(`${selectedIds.size} classe(s) supprimée(s) ✓`);
      setSelectedIds(new Set());
      loadData();
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredClasses = classes.filter((c) =>
    `${c.name} ${c.level || ""} ${c.department || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Classes</h1>
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
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Classes</h1>
          <p className="text-xs text-[#9A9898] mt-1">
            Gérez les classes et groupes d&apos;étudiants
            {classes.length > 0 && <span className="ml-1">({classes.length})</span>}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
        >
          <Plus className="h-3 w-3 mr-1" />
          Ajouter une classe
        </Button>
      </div>

      {/* Search & Bulk actions */}
      <div className="flex items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une classe..." />
        </div>
        {selectedIds.size > 0 && (
          <Button variant="ghost" onClick={handleBulkDelete} className="text-xs text-[#DC2626] hover:text-[#DC2626]">
            <Trash2 className="h-3 w-3 mr-1" />
            Supprimer ({selectedIds.size})
          </Button>
        )}
      </div>

      {filteredClasses.length === 0 ? (
        <EmptyState
          title={search ? "Aucun résultat" : "Aucune classe"}
          description={search ? "Essayez un autre terme de recherche" : "Ajoutez votre première classe"}
          action={
            !search ? (
              <Button onClick={openCreate} variant="ghost" className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A]">
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC] w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredClasses.length && filteredClasses.length > 0}
                    onChange={() => {
                      if (selectedIds.size === filteredClasses.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredClasses.map((c) => c.id)));
                      }
                    }}
                    className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                  />
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Nom</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Niveau</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Département</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Étudiants</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Matières</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Emploi du temps</th>
                <th className="p-2 text-xs font-bold text-right text-[#201D1D] dark:text-[#FDFCFC]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls) => (
                <tr
                  key={cls.id}
                  className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(cls.id)}
                      onChange={() => toggleSelect(cls.id)}
                      className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                    />
                  </td>
                  <td className="p-2 text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">{cls.name}</td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{cls.level || "—"}</td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{cls.department || "—"}</td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{cls.studentCount || "—"}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {cls.subjects.slice(0, 3).map((s) => (
                        <span key={s.subject.id} className="text-[10px] px-1.5 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898]">
                          {s.subject.name}
                        </span>
                      ))}
                      {cls.subjects.length > 3 && (
                        <span className="text-[10px] text-[#9A9898]">+{cls.subjects.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <span className={`text-[10px] px-1.5 py-0.5 ${
                      cls.timetables.length > 0
                        ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold"
                        : "border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#9A9898]"
                    }`}>
                      {cls.timetables.length > 0 ? "Configuré" : "Non configuré"}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(cls)}
                        className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="p-1.5 text-[#646262] hover:text-[#DC2626] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingClass ? "Modifier la classe" : "Nouvelle classe"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">
                  Nom <span className="text-[#DC2626]">*</span>
                </Label>
                <Input
                  ref={nameRef}
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    if (e.target.value) setValidationErrors((prev) => ({ ...prev, name: false }));
                  }}
                  placeholder="Ex: L1 Informatique"
                  className={`mt-1 ${validationErrors.name ? "border-[#DC2626] focus:border-[#DC2626]" : ""}`}
                />
                {validationErrors.name && (
                  <p className="text-[10px] text-[#DC2626] mt-1">Requis</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-bold">Niveau</Label>
                <Input
                  value={form.level}
                  onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                  placeholder="Ex: L1, L2, Terminale"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Département</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="Ex: Informatique"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Nombre d&apos;étudiants</Label>
                <Input
                  type="number"
                  value={form.studentCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentCount: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Année académique</Label>
              <Input
                value={form.academicYear}
                onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                placeholder="2025-2026"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-2 block">Matières associées</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {subjects.map((subject) => {
                  const isSelected = form.subjectIds.some((s) => s.subjectId === subject.id);
                  const entry = form.subjectIds.find((s) => s.subjectId === subject.id);
                  return (
                    <div key={subject.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSubject(subject.id)}
                      />
                      <span className="text-xs flex-1 text-[#201D1D] dark:text-[#FDFCFC]">{subject.name}</span>
                      {isSelected && (
                        <Input
                          type="number"
                          className="w-20 h-7 text-xs"
                          value={entry?.hoursPerWeek || 3}
                          onChange={(e) => updateSubjectHours(subject.id, parseInt(e.target.value) || 3)}
                        />
                      )}
                    </div>
                  );
                })}
                {subjects.length === 0 && (
                  <p className="text-xs text-[#9A9898]">Créez d&apos;abord des matières</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-xs">Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            >
              {saving ? "Enregistrement..." : editingClass ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
