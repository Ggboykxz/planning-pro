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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { subjectTypes } from "@/lib/countries";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
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
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const nameRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => nameRef.current?.focus(), 100);
      setValidationErrors({});
    }
  }, [dialogOpen]);

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
    setValidationErrors({});
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
    setValidationErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    if (!form.name) errors.name = true;
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
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
        toast.success(editingSubject ? "Matière mise à jour ✓" : "Matière créée ✓");
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
        toast.success("Matière supprimée ✓");
        loadSubjects();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.size} matière(s) ?`)) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/subjects?id=${id}`, { method: "DELETE" });
      }
      toast.success(`${selectedIds.size} matière(s) supprimée(s) ✓`);
      setSelectedIds(new Set());
      loadSubjects();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getTypeLabel = (type: string | null) => {
    return subjectTypes.find((st) => st.value === type)?.label || type || "—";
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSubjects = subjects.filter((s) =>
    `${s.name} ${s.code || ""} ${getTypeLabel(s.type)}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Matières</h1>
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
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Matières</h1>
          <p className="text-xs text-[#9A9898] mt-1">
            Gérez les matières et unités d&apos;enseignement
            {subjects.length > 0 && <span className="ml-1">({subjects.length})</span>}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
        >
          <Plus className="h-3 w-3 mr-1" />
          Ajouter une matière
        </Button>
      </div>

      {/* Search & Bulk actions */}
      <div className="flex items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une matière..." />
        </div>
        {selectedIds.size > 0 && (
          <Button variant="ghost" onClick={handleBulkDelete} className="text-xs text-[#DC2626] hover:text-[#DC2626]">
            <Trash2 className="h-3 w-3 mr-1" />
            Supprimer ({selectedIds.size})
          </Button>
        )}
      </div>

      {filteredSubjects.length === 0 ? (
        <EmptyState
          title={search ? "Aucun résultat" : "Aucune matière"}
          description={search ? "Essayez un autre terme de recherche" : "Ajoutez votre première matière"}
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
                    checked={selectedIds.size === filteredSubjects.length && filteredSubjects.length > 0}
                    onChange={() => {
                      if (selectedIds.size === filteredSubjects.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredSubjects.map((s) => s.id)));
                      }
                    }}
                    className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                  />
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Nom</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Code</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Type</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">H/sem</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Semestre</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Coef.</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Enseignants</th>
                <th className="p-2 text-xs font-bold text-right text-[#201D1D] dark:text-[#FDFCFC]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject) => (
                <tr
                  key={subject.id}
                  className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(subject.id)}
                      onChange={() => toggleSelect(subject.id)}
                      className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                    />
                  </td>
                  <td className="p-2 text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">{subject.name}</td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">
                    <code className="text-[10px] bg-[#F8F7F7] dark:bg-[#1A1A1A] px-1 py-0.5">
                      {subject.code || "—"}
                    </code>
                  </td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{getTypeLabel(subject.type)}</td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{subject.hoursPerWeek || "—"}</td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{subject.semester || "—"}</td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{subject.coefficient || "—"}</td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">
                    {subject.teacherAssignments.map((ta) => (
                      <span key={ta.teacher.id} className="block">
                        {ta.teacher.firstName} {ta.teacher.lastName}
                      </span>
                    ))}
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(subject)}
                        className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingSubject ? "Modifier la matière" : "Nouvelle matière"}
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
                  placeholder="Ex: Algorithmique"
                  className={`mt-1 ${validationErrors.name ? "border-[#DC2626] focus:border-[#DC2626]" : ""}`}
                />
                {validationErrors.name && (
                  <p className="text-[10px] text-[#DC2626] mt-1">Requis</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-bold">Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Ex: INF201"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-bold">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjectTypes.map((st) => (
                      <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Heures/sem</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.hoursPerWeek}
                  onChange={(e) => setForm((prev) => ({ ...prev, hoursPerWeek: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Coefficient</Label>
                <Input
                  type="number"
                  value={form.coefficient}
                  onChange={(e) => setForm((prev) => ({ ...prev, coefficient: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Semestre</Label>
              <Select value={form.semester} onValueChange={(v) => setForm((prev) => ({ ...prev, semester: v }))}>
                <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["S1", "S2", "S3", "S4", "S5", "S6", "Annuel"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-xs">Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            >
              {saving ? "Enregistrement..." : editingSubject ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
