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
import { Plus, Pencil, Trash2, Upload, Download, Users } from "lucide-react";
import { subjectTypes } from "@/lib/countries";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { Pagination } from "@/components/shared/Pagination";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";

interface TeacherData {
  id: string;
  firstName: string;
  lastName: string;
}

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
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectData | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const [form, setForm] = useState({
    name: "",
    code: "",
    hoursPerWeek: 3,
    type: "cours",
    semester: "S1",
    coefficient: 1,
    teacherIds: [] as string[],
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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const loadSubjects = async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        fetch(`/api/subjects?institutionId=${institutionId}`),
        fetch(`/api/teachers?institutionId=${institutionId}`),
      ]);
      if (sRes.ok) setSubjects(await sRes.json());
      if (tRes.ok) {
        const tData = await tRes.json();
        setTeachers(tData.map((t: TeacherData & { firstName: string; lastName: string }) => ({
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingSubject(null);
    setForm({ name: "", code: "", hoursPerWeek: 3, type: "cours", semester: "S1", coefficient: 1, teacherIds: [] });
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
      teacherIds: subject.teacherAssignments.map((ta) => ta.teacher.id),
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
        name: form.name,
        code: form.code || null,
        hoursPerWeek: form.hoursPerWeek || null,
        coefficient: form.coefficient || null,
        semester: form.semester || null,
        type: form.type,
        teacherIds: form.teacherIds,
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

  const handleDelete = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer la matière",
      description: "Êtes-vous sûr de vouloir supprimer cette matière ? Cette action est irréversible.",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/subjects?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Matière supprimée ✓");
            loadSubjects();
          }
        } catch {
          toast.error("Erreur lors de la suppression");
        }
      },
    });
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      open: true,
      title: `Supprimer ${selectedIds.size} matière(s)`,
      description: `Êtes-vous sûr de vouloir supprimer ${selectedIds.size} matière(s) ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
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
      },
    });
  };

  const getTypeLabel = (type: string | null) => {
    return subjectTypes.find((st) => st.value === type)?.label || type || "—";
  };

  const toggleTeacher = (teacherId: string) => {
    setForm((prev) => ({
      ...prev,
      teacherIds: prev.teacherIds.includes(teacherId)
        ? prev.teacherIds.filter((id) => id !== teacherId)
        : [...prev.teacherIds, teacherId],
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

  const filteredSubjects = subjects.filter((s) =>
    `${s.name} ${s.code || ""} ${getTypeLabel(s.type)}`.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSubjects = filteredSubjects.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    exportToCSV(filteredSubjects, [
      { header: "Nom", accessor: (s) => s.name },
      { header: "Code", accessor: (s) => s.code || "" },
      { header: "Type", accessor: (s) => getTypeLabel(s.type) },
      { header: "Semestre", accessor: (s) => s.semester || "" },
      { header: "Coefficient", accessor: (s) => s.coefficient || "" },
      { header: "Heures/Semaine", accessor: (s) => s.hoursPerWeek || "" },
    ], "matieres");
    toast.success("CSV exporté ✓");
  };

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
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="ghost"
            className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
            disabled={filteredSubjects.length === 0}
          >
            <Download className="h-3 w-3 mr-1" />
            Exporter
          </Button>
          <Button
            onClick={() => setImportOpen(true)}
            variant="ghost"
            className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
          >
            <Upload className="h-3 w-3 mr-1" />
            Importer
          </Button>
          <Button
            onClick={openCreate}
            className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter une matière
          </Button>
        </div>
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
          step={3}
          action={
            !search ? (
              <Button onClick={openCreate} variant="ghost" className="text-xs border border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#201D1D] hover:text-[#FDFCFC] dark:hover:bg-[#FDFCFC] dark:hover:text-[#0A0A0A] px-4 py-2">
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
                    checked={selectedIds.size === paginatedSubjects.length && paginatedSubjects.length > 0}
                    onChange={() => {
                      if (selectedIds.size === paginatedSubjects.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(paginatedSubjects.map((s) => s.id)));
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
              {paginatedSubjects.map((subject) => (
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
          <Pagination
            currentPage={safePage}
            pageSize={pageSize}
            totalItems={filteredSubjects.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
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
            {/* Teacher Assignment Section */}
            <div>
              <Label className="text-xs font-bold flex items-center gap-1 mb-2">
                <Users className="h-3 w-3" />
                Enseignants
              </Label>
              <div className="flex flex-wrap gap-1">
                {teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => toggleTeacher(teacher.id)}
                    className={`text-[10px] px-2 py-1 border transition-all duration-150 ${
                      form.teacherIds.includes(teacher.id)
                        ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold"
                        : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                    }`}
                  >
                    {teacher.firstName} {teacher.lastName}
                  </button>
                ))}
                {teachers.length === 0 && (
                  <p className="text-xs text-[#9A9898]">Créez d&apos;abord des enseignants</p>
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
              {saving ? "Enregistrement..." : editingSubject ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="subjects"
        institutionId={institutionId}
        onImported={() => loadSubjects()}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={confirmDialog.onConfirm}
        variant="danger"
      />
    </div>
  );
}
