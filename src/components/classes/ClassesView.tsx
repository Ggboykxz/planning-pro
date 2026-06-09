"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Users,
  BookOpen,
  LayoutGrid,
  List,
  GraduationCap,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { Pagination } from "@/components/shared/Pagination";
import { exportToCSV } from "@/lib/export-utils";
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

// Level badge color map
const LEVEL_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  L1:    { bg: "#FEF3C7", text: "#92400E", darkBg: "#422006", darkText: "#FDE68A" },
  L2:    { bg: "#D1FAE5", text: "#065F46", darkBg: "#064E3B", darkText: "#6EE7B7" },
  L3:    { bg: "#DBEAFE", text: "#1E40AF", darkBg: "#1E3A5F", darkText: "#93C5FD" },
  M1:    { bg: "#F3E8FF", text: "#6B21A8", darkBg: "#3B0764", darkText: "#C4B5FD" },
  M2:    { bg: "#FEE2E2", text: "#991B1B", darkBg: "#450A0A", darkText: "#FCA5A5" },
};

function isDarkMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
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
  const [importOpen, setImportOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Auto-select view mode based on count
  useEffect(() => {
    if (classes.length >= 10 && viewMode === "cards") {
      setViewMode("table");
    } else if (classes.length < 10 && classes.length > 0 && viewMode === "table") {
      setViewMode("cards");
    }
  }, [classes.length]);

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
    // Validate hoursPerWeek is positive
    const invalidHours = form.subjectIds.some((s) => s.hoursPerWeek <= 0);
    if (invalidHours) errors.hoursPerWeek = true;
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (errors.name) toast.error("Le nom de la classe est requis");
      if (errors.hoursPerWeek) toast.error("Les heures par semaine doivent être positives");
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

  const handleDelete = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer la classe",
      description: "Êtes-vous sûr de vouloir supprimer cette classe ? Cette action est irréversible.",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/classes?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Classe supprimée ✓");
            loadData();
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
      title: `Supprimer ${selectedIds.size} classe(s)`,
      description: `Êtes-vous sûr de vouloir supprimer ${selectedIds.size} classe(s) ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          await Promise.all(
            Array.from(selectedIds).map((id) =>
              fetch(`/api/classes?id=${id}`, { method: "DELETE" })
            )
          );
          toast.success(`${selectedIds.size} classe(s) supprimée(s) ✓`);
          setSelectedIds(new Set());
          loadData();
        } catch {
          toast.error("Erreur lors de la suppression");
        }
      },
    });
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
        s.subjectId === subjectId ? { ...s, hoursPerWeek: Math.max(1, hours) } : s
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

  const filteredClasses = useMemo(() =>
    classes.filter((c) =>
      `${c.name} ${c.level || ""} ${c.department || ""}`.toLowerCase().includes(search.toLowerCase())
    ),
    [classes, search]
  );

  // Stats
  const stats = useMemo(() => {
    const total = classes.length;
    const totalStudents = classes.reduce((acc, c) => acc + (c.studentCount || 0), 0);
    const avgSubjects = total > 0
      ? (classes.reduce((acc, c) => acc + c.subjects.length, 0) / total).toFixed(1)
      : "0";
    const timetableCoverage = total > 0
      ? Math.round((classes.filter((c) => c.timetables.length > 0).length / total) * 100)
      : 0;
    return { total, totalStudents, avgSubjects, timetableCoverage };
  }, [classes]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedClasses = filteredClasses.slice(
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
    exportToCSV(filteredClasses, [
      { header: "Nom", accessor: (c: ClassData) => c.name },
      { header: "Niveau", accessor: (c: ClassData) => c.level || "" },
      { header: "Effectif", accessor: (c: ClassData) => c.studentCount || "" },
      { header: "Matières", accessor: (c: ClassData) => c.subjects.map((s) => s.subject.name).join(", ") },
      { header: "Statut emploi du temps", accessor: (c: ClassData) => c.timetables.length > 0 ? "Configuré" : "Non configuré" },
    ], "classes");
    toast.success("CSV exporté ✓");
  };

  // ── Render: Level badge ──────────────────────────────────────────────

  const renderLevelBadge = (level: string | null) => {
    if (!level) return null;
    const tc = LEVEL_COLORS[level] || { bg: "#F3F4F6", text: "#374151", darkBg: "#1F2937", darkText: "#D1D5DB" };
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{
          backgroundColor: isDarkMode() ? tc.darkBg : tc.bg,
          color: isDarkMode() ? tc.darkText : tc.text,
          borderRadius: 0,
        }}
      >
        {level}
      </span>
    );
  };

  // ── Render: Stats bar ────────────────────────────────────────────────

  const renderStatsBar = () => (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <GraduationCap className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Classes</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.total}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <Users className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Étudiants total</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.totalStudents}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <BookOpen className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Matières moy.</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.avgSubjects}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Couverture EDT</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.timetableCoverage}%
          </p>
        </div>
      </div>
    </div>
  );

  // ── Render: Class card ───────────────────────────────────────────────

  const renderClassCard = (cls: ClassData) => {
    const totalHours = cls.subjects.reduce((acc, s) => acc + (s.hoursPerWeek || 0), 0);
    const hasTimetable = cls.timetables.length > 0;
    return (
      <div
        className="border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FDFCFC] dark:bg-[#0A0A0A] p-4 transition-all duration-150 hover:border-[#D97706] dark:hover:border-[#D97706] cursor-pointer group relative"
        style={{ borderRadius: 0 }}
      >
        {/* Checkbox for bulk selection */}
        <div
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(cls.id)}
            onChange={() => toggleSelect(cls.id)}
            className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
          />
        </div>

        {/* Header: Name + Level badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] leading-tight flex-1">
            {cls.name}
          </h3>
          {renderLevelBadge(cls.level)}
        </div>

        {/* Student count */}
        <div className="flex items-center gap-1.5 text-xs text-[#646262] dark:text-[#9A9898] mb-2">
          <Users className="h-3 w-3 text-[#D97706]" />
          <span className="font-mono font-bold">{cls.studentCount || "—"}</span>
          <span>étudiants</span>
        </div>

        {/* Subject count */}
        <div className="flex items-center gap-1.5 text-xs text-[#646262] dark:text-[#9A9898] mb-2">
          <BookOpen className="h-3 w-3 text-[#D97706]" />
          <span className="font-mono font-bold">{cls.subjects.length}</span>
          <span>matière{cls.subjects.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Total hours/week */}
        <div className="flex items-center gap-1.5 text-xs text-[#646262] dark:text-[#9A9898] mb-3">
          <Clock className="h-3 w-3 text-[#D97706]" />
          <span className="font-mono font-bold">{totalHours}</span>
          <span>h/sem</span>
        </div>

        {/* Subject tags (show first 4) */}
        {cls.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cls.subjects.slice(0, 4).map((s) => (
              <span
                key={s.subject.id}
                className="text-[9px] px-1.5 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] font-mono"
                style={{ borderRadius: 0 }}
              >
                {s.subject.name}
              </span>
            ))}
            {cls.subjects.length > 4 && (
              <span className="text-[9px] text-[#9A9898] font-mono">
                +{cls.subjects.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Timetable status indicator */}
        <div className="flex items-center gap-1.5 text-[10px]">
          {hasTimetable ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-[#059669]" />
              <span className="font-bold text-[#059669]">Emploi du temps configuré</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 text-[#D97706]" />
              <span className="text-[#D97706]">En attente</span>
            </>
          )}
        </div>

        {/* Actions (show on hover) */}
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(cls);
            }}
            className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
            title="Modifier"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(cls.id);
            }}
            className="p-1.5 text-[#646262] hover:text-[#DC2626] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  // ── Loading skeleton ─────────────────────────────────────────────────

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

  // ── Compute total hours for selected subjects in form ──────────────
  const formTotalHours = form.subjectIds.reduce((acc, s) => acc + s.hoursPerWeek, 0);

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
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 transition-colors ${
                viewMode === "cards"
                  ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]"
                  : "text-[#646262] dark:text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
              }`}
              title="Cartes"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]"
                  : "text-[#646262] dark:text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
              }`}
              title="Tableau"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            onClick={handleExportCSV}
            variant="ghost"
            className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
            disabled={filteredClasses.length === 0}
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
            Ajouter une classe
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {classes.length > 0 && renderStatsBar()}

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
          step={4}
          action={
            !search ? (
              <Button onClick={openCreate} variant="ghost" className="text-xs border border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#201D1D] hover:text-[#FDFCFC] dark:hover:bg-[#FDFCFC] dark:hover:text-[#0A0A0A] px-4 py-2">
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedClasses.map((cls) => (
            <div key={cls.id}>{renderClassCard(cls)}</div>
          ))}
          {filteredClasses.length > pageSize && (
            <div className="col-span-full">
              <Pagination
                currentPage={safePage}
                pageSize={pageSize}
                totalItems={filteredClasses.length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC] w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === paginatedClasses.length && paginatedClasses.length > 0}
                    onChange={() => {
                      if (selectedIds.size === paginatedClasses.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(paginatedClasses.map((c) => c.id)));
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
              {paginatedClasses.map((cls) => (
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
                  <td className="p-2 text-xs">{renderLevelBadge(cls.level) || <span className="text-[#9A9898]">—</span>}</td>
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
          <Pagination
            currentPage={safePage}
            pageSize={pageSize}
            totalItems={filteredClasses.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-[#E5E5E5] dark:border-[#2A2A2A] max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingClass ? "Modifier la classe" : "Nouvelle classe"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Section: Informations */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Informations
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
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
                    style={{ borderRadius: 0 }}
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
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <Label className="text-xs font-bold">Département</Label>
                  <Input
                    value={form.department}
                    onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="Ex: Informatique"
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Nombre d&apos;étudiants</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.studentCount}
                    onChange={(e) => setForm((prev) => ({ ...prev, studentCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Année académique</Label>
                  <Input
                    value={form.academicYear}
                    onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                    placeholder="2025-2026"
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>

            {/* Section: Matières associées */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Matières associées
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
                {form.subjectIds.length > 0 && (
                  <span className="text-[10px] font-mono text-[#D97706] font-bold">
                    {formTotalHours}h/sem
                  </span>
                )}
              </div>

              {validationErrors.hoursPerWeek && (
                <p className="text-[10px] text-[#DC2626] mb-2">Les heures par semaine doivent être positives</p>
              )}

              {subjects.length === 0 ? (
                <p className="text-xs text-[#9A9898] italic">Créez d&apos;abord des matières</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
                  {subjects.map((subject) => {
                    const isSelected = form.subjectIds.some((s) => s.subjectId === subject.id);
                    const entry = form.subjectIds.find((s) => s.subjectId === subject.id);
                    return (
                      <div
                        key={subject.id}
                        className={`flex items-center gap-3 p-2 border transition-colors ${
                          isSelected
                            ? "border-[#D97706] bg-[#D97706]/5"
                            : "border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#201D1D] dark:hover:border-[#FDFCFC]"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSubject(subject.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className={`text-xs flex-1 font-mono ${isSelected ? "font-bold text-[#201D1D] dark:text-[#FDFCFC]" : "text-[#646262] dark:text-[#9A9898]"}`}>
                          {subject.name}
                        </span>
                        {isSelected && entry && (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={1}
                              className="w-16 h-7 text-xs text-center font-mono"
                              value={entry.hoursPerWeek}
                              onChange={(e) => updateSubjectHours(subject.id, parseInt(e.target.value) || 1)}
                              style={{ borderRadius: 0 }}
                            />
                            <span className="text-[10px] text-[#9A9898]">h/sem</span>
                          </div>
                        )}
                        {isSelected && entry && entry.hoursPerWeek <= 0 && (
                          <span className="text-[9px] text-[#DC2626] font-bold">!</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {form.subjectIds.length > 0 && (
                <div className="mt-3 flex items-center justify-between px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                  <span className="text-[10px] text-[#9A9898] font-mono">TOTAL</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">{formTotalHours}</span>
                    <span className="text-[10px] text-[#9A9898]">heures/sem</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-xs" style={{ borderRadius: 0 }}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
              style={{ borderRadius: 0 }}
            >
              {saving ? "Enregistrement..." : editingClass ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="classes"
        institutionId={institutionId}
        onImported={() => loadData()}
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
