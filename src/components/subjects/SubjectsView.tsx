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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Users,
  LayoutGrid,
  List,
  BookOpen,
  Clock,
  AlertCircle,
  BarChart3,
  UserCheck,
  X,
  GraduationCap,
  Hash,
  Palette,
} from "lucide-react";
import { subjectTypes } from "@/lib/countries";
import { getSubjectColor } from "@/lib/subject-colors";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { Pagination } from "@/components/shared/Pagination";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";

// ── Type definitions ────────────────────────────────────────────────

interface TeacherData {
  id: string;
  firstName: string;
  lastName: string;
}

interface ClassData {
  id: string;
  name: string;
  level?: string | null;
}

interface SubjectData {
  id: string;
  name: string;
  code: string | null;
  hoursPerWeek: number | null;
  type: string | null;
  semester: string | null;
  coefficient: number | null;
  color: string | null;
  teacherAssignments: Array<{
    teacher: { id: string; firstName: string; lastName: string };
  }>;
  classSubjects: Array<{
    class: { id: string; name: string };
    hoursPerWeek?: number | null;
  }>;
}

interface SubjectsViewProps {
  institutionId: string;
}

// ── Type badge color map ────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  cours:  { bg: "#FEF3C7", text: "#92400E", darkBg: "#422006", darkText: "#FDE68A" },
  td:     { bg: "#D1FAE5", text: "#065F46", darkBg: "#064E3B", darkText: "#6EE7B7" },
  tp:     { bg: "#DBEAFE", text: "#1E40AF", darkBg: "#1E3A5F", darkText: "#93C5FD" },
  projet: { bg: "#F3E8FF", text: "#6B21A8", darkBg: "#3B0764", darkText: "#C4B5FD" },
  examen: { bg: "#FEE2E2", text: "#991B1B", darkBg: "#450A0A", darkText: "#FCA5A5" },
};

// ── Color palette for picker ────────────────────────────────────────

const COLOR_PALETTE = [
  "#D97706", "#DC2626", "#059669", "#2563EB", "#7C3AED",
  "#DB2777", "#0891B2", "#65A30D", "#EA580C", "#4F46E5",
  "#0D9488", "#CA8A04", "#E11D48", "#6D28D9", "#0284C7",
  "#16A34A", "#9333EA", "#F59E0B", "#EF4444", "#10B981",
];

// ── Helpers ─────────────────────────────────────────────────────────

function getTypeLabel(type: string | null) {
  return subjectTypes.find((st) => st.value === type)?.label || type || "—";
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function isDarkMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

// ── Main component ──────────────────────────────────────────────────

export function SubjectsView({ institutionId }: SubjectsViewProps) {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectData | null>(null);
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

  // Filter state
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterSemester, setFilterSemester] = useState<string | null>(null);
  const [filterTeacher, setFilterTeacher] = useState<string | null>(null);

  // Detail dialog
  const [detailSubject, setDetailSubject] = useState<SubjectData | null>(null);

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
    color: "",
    teacherIds: [] as string[],
    classAssignments: [] as Array<{ classId: string; hoursPerWeek: number }>,
  });

  useEffect(() => {
    const controller = new AbortController();
    loadSubjects(controller.signal);
    return () => controller.abort();
  }, [institutionId]);

  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => nameRef.current?.focus(), 100);
      setValidationErrors({});
    }
  }, [dialogOpen]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterSemester, filterTeacher]);

  // Auto-select view mode based on count
  useEffect(() => {
    if (subjects.length >= 10 && viewMode === "cards") {
      setViewMode("table");
    } else if (subjects.length < 10 && subjects.length > 0 && viewMode === "table") {
      setViewMode("cards");
    }
  }, [subjects.length]);

  const loadSubjects = async (signal?: AbortSignal) => {
    try {
      setError(false);
      const [sRes, tRes, cRes] = await Promise.all([
        fetch(`/api/subjects?institutionId=${institutionId}`, { signal }),
        fetch(`/api/teachers?institutionId=${institutionId}`, { signal }),
        fetch(`/api/classes?institutionId=${institutionId}`, { signal }),
      ]);
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData)) setSubjects(sData);
      } else {
        setError(true);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) {
          setTeachers(
            tData.map((t: TeacherData & { firstName: string; lastName: string }) => ({
              id: t.id,
              firstName: t.firstName,
              lastName: t.lastName,
            }))
          );
        }
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData)) {
          setClasses(
            cData.map((c: ClassData & { name: string; level?: string | null }) => ({
              id: c.id,
              name: c.name,
              level: c.level,
            }))
          );
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingSubject(null);
    setForm({
      name: "",
      code: "",
      hoursPerWeek: 3,
      type: "cours",
      semester: "S1",
      coefficient: 1,
      color: "",
      teacherIds: [],
      classAssignments: [],
    });
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
      color: subject.color || "",
      teacherIds: subject.teacherAssignments.map((ta) => ta.teacher.id),
      classAssignments: subject.classSubjects.map((cs) => ({
        classId: cs.class.id,
        hoursPerWeek: cs.hoursPerWeek || subject.hoursPerWeek || 3,
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
        color: form.color || null,
        teacherIds: form.teacherIds,
        classIds: form.classAssignments.map((ca) => ({
          classId: ca.classId,
          hoursPerWeek: ca.hoursPerWeek,
        })),
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
      description:
        "Êtes-vous sûr de vouloir supprimer cette matière ? Cette action est irréversible.",
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

  const toggleTeacher = (teacherId: string) => {
    setForm((prev) => ({
      ...prev,
      teacherIds: prev.teacherIds.includes(teacherId)
        ? prev.teacherIds.filter((id) => id !== teacherId)
        : [...prev.teacherIds, teacherId],
    }));
  };

  const toggleClassAssignment = (classId: string) => {
    setForm((prev) => {
      const exists = prev.classAssignments.find((ca) => ca.classId === classId);
      if (exists) {
        return {
          ...prev,
          classAssignments: prev.classAssignments.filter((ca) => ca.classId !== classId),
        };
      }
      return {
        ...prev,
        classAssignments: [
          ...prev.classAssignments,
          { classId, hoursPerWeek: prev.hoursPerWeek || 3 },
        ],
      };
    });
  };

  const updateClassHours = (classId: string, hours: number) => {
    setForm((prev) => ({
      ...prev,
      classAssignments: prev.classAssignments.map((ca) =>
        ca.classId === classId ? { ...ca, hoursPerWeek: hours } : ca
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

  // ── Computed values ──────────────────────────────────────────────

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchSearch = `${s.name} ${s.code || ""} ${getTypeLabel(s.type)}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchType = !filterType || s.type === filterType;
      const matchSemester = !filterSemester || s.semester === filterSemester;
      const matchTeacher =
        !filterTeacher ||
        s.teacherAssignments.some((ta) => ta.teacher.id === filterTeacher);
      return matchSearch && matchType && matchSemester && matchTeacher;
    });
  }, [subjects, search, filterType, filterSemester, filterTeacher]);

  // Stats
  const stats = useMemo(() => {
    const total = subjects.length;
    const totalHours = subjects.reduce(
      (acc, s) => acc + (s.hoursPerWeek || 0),
      0
    );
    const avgCoef =
      total > 0
        ? (
            subjects.reduce((acc, s) => acc + (s.coefficient || 0), 0) / total
          ).toFixed(1)
        : "0";
    const teacherCoverage =
      total > 0
        ? Math.round(
            (subjects.filter((s) => s.teacherAssignments.length > 0).length /
              total) *
              100
          )
        : 0;
    return { total, totalHours, avgCoef, teacherCoverage };
  }, [subjects]);

  // Unique semesters from data
  const availableSemesters = useMemo(() => {
    const semesters = new Set(subjects.map((s) => s.semester).filter(Boolean));
    return Array.from(semesters).sort() as string[];
  }, [subjects]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSubjects = filteredSubjects.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    exportToCSV(
      filteredSubjects,
      [
        { header: "Nom", accessor: (s: SubjectData) => s.name },
        { header: "Code", accessor: (s: SubjectData) => s.code || "" },
        { header: "Type", accessor: (s: SubjectData) => getTypeLabel(s.type) },
        { header: "Semestre", accessor: (s: SubjectData) => s.semester || "" },
        { header: "Coefficient", accessor: (s: SubjectData) => s.coefficient || "" },
        { header: "Heures/Semaine", accessor: (s: SubjectData) => s.hoursPerWeek || "" },
      ],
      "matieres"
    );
    toast.success("CSV exporté ✓");
  };

  // ── Render: Type badge ───────────────────────────────────────────

  const renderTypeBadge = (type: string | null) => {
    const label = getTypeLabel(type);
    const tc = TYPE_COLORS[type || ""] || TYPE_COLORS.cours;
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{
          backgroundColor: isDarkMode() ? tc.darkBg : tc.bg,
          color: isDarkMode() ? tc.darkText : tc.text,
          borderRadius: 0,
        }}
      >
        {label}
      </span>
    );
  };

  // ── Render: Teacher avatars ──────────────────────────────────────

  const renderTeacherAvatars = (
    teacherAssignments: SubjectData["teacherAssignments"],
    maxShow: number = 3
  ) => {
    if (teacherAssignments.length === 0) {
      return (
        <span className="text-[10px] text-[#9A9898] italic">Aucun</span>
      );
    }
    const shown = teacherAssignments.slice(0, maxShow);
    const remaining = teacherAssignments.length - maxShow;
    return (
      <div className="flex items-center -space-x-1">
        {shown.map((ta) => (
          <span
            key={ta.teacher.id}
            className="inline-flex items-center justify-center w-6 h-6 text-[9px] font-bold border border-[#201D1D] dark:border-[#FDFCFC] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC]"
            style={{ borderRadius: 0 }}
            title={`${ta.teacher.firstName} ${ta.teacher.lastName}`}
          >
            {getInitials(ta.teacher.firstName, ta.teacher.lastName)}
          </span>
        ))}
        {remaining > 0 && (
          <span
            className="inline-flex items-center justify-center w-6 h-6 text-[9px] font-bold border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]"
            style={{ borderRadius: 0 }}
          >
            +{remaining}
          </span>
        )}
      </div>
    );
  };

  // ── Render: Hours bar indicator ──────────────────────────────────

  const renderHoursBar = (hours: number | null, maxHours: number = 10) => {
    const h = hours || 0;
    const pct = Math.min((h / maxHours) * 100, 100);
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC]">
          {h}h
        </span>
        <div className="flex-1 h-1.5 bg-[#E5E5E5] dark:bg-[#2A2A2A] relative">
          <div
            className="absolute left-0 top-0 h-full bg-[#D97706] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  // ── Loading skeleton ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
          Matières
        </h1>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
          Matières
        </h1>
        <div className="border border-[#DC2626] p-6 flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 text-[#DC2626]" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] text-center">Impossible de charger les matières.</p>
          <button
            onClick={() => { setLoading(true); loadSubjects(); }}
            className="text-xs px-4 py-2 border border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#201D1D] hover:text-[#FDFCFC] dark:hover:bg-[#FDFCFC] dark:hover:text-[#0A0A0A] transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Subject card ─────────────────────────────────────────

  const renderSubjectCard = (subject: SubjectData) => {
    const subColor = getSubjectColor(subject.name, isDarkMode());
    return (
      <div
        className="border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FDFCFC] dark:bg-[#0A0A0A] p-4 transition-all duration-150 hover:border-[#D97706] dark:hover:border-[#D97706] cursor-pointer group relative"
        style={{ borderRadius: 0 }}
        onClick={() => setDetailSubject(subject)}
      >
        {/* Color strip */}
        {subject.color && (
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{ backgroundColor: subject.color }}
          />
        )}

        {/* Header: Name + Type badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] leading-tight flex-1">
            {subject.name}
          </h3>
          {renderTypeBadge(subject.type)}
        </div>

        {/* Code tag */}
        {subject.code && (
          <code className="inline-block text-[10px] font-mono bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#646262] dark:text-[#9A9898] px-1.5 py-0.5 mb-3 border border-[#E5E5E5] dark:border-[#2A2A2A]">
            {subject.code}
          </code>
        )}

        {/* Hours bar */}
        <div className="mb-3">{renderHoursBar(subject.hoursPerWeek)}</div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
          <div>
            <span className="text-[#9A9898]">Coef.</span>
            <span className="ml-1 font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              {subject.coefficient || "—"}
            </span>
          </div>
          <div>
            <span className="text-[#9A9898]">Semestre</span>
            <span className="ml-1 font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              {subject.semester || "—"}
            </span>
          </div>
        </div>

        {/* Teachers */}
        <div className="mb-3">
          <span className="text-[10px] text-[#9A9898] block mb-1">Enseignants</span>
          {renderTeacherAvatars(subject.teacherAssignments)}
        </div>

        {/* Classes count */}
        <div className="flex items-center gap-1 text-[10px] text-[#646262] dark:text-[#9A9898] mb-3">
          <GraduationCap className="h-3 w-3" />
          <span>
            {subject.classSubjects.length} classe
            {subject.classSubjects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Actions (show on hover) */}
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(subject);
            }}
            className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
            title="Modifier"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(subject.id);
            }}
            className="p-1.5 text-[#646262] hover:text-[#DC2626] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Checkbox for bulk selection */}
        <div
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(subject.id)}
            onChange={() => toggleSelect(subject.id)}
            className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
          />
        </div>
      </div>
    );
  };

  // ── Render: Stats bar ────────────────────────────────────────────

  const renderStatsBar = () => (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <BookOpen className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Matières</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.total}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <Clock className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">H/sem total</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.totalHours}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <BarChart3 className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Coef. moyen</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.avgCoef}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <UserCheck className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Couverture ens.</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.teacherCoverage}%
          </p>
        </div>
      </div>
    </div>
  );

  // ── Render: Filter bar ───────────────────────────────────────────

  const renderFilterBar = () => {
    const activeFilters =
      (filterType ? 1 : 0) +
      (filterSemester ? 1 : 0) +
      (filterTeacher ? 1 : 0);

    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#9A9898] font-mono mr-1">TYPE:</span>
          {subjectTypes.map((st) => (
            <button
              key={st.value}
              onClick={() =>
                setFilterType(filterType === st.value ? null : st.value)
              }
              className={`text-[10px] px-2 py-1 border transition-all duration-150 font-mono ${
                filterType === st.value
                  ? "border-[#D97706] bg-[#D97706]/10 text-[#D97706] font-bold"
                  : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:border-[#201D1D] dark:hover:border-[#FDFCFC]"
              }`}
              style={{ borderRadius: 0 }}
            >
              {st.label}
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-4" />

        {/* Semester filter */}
        {availableSemesters.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#9A9898] font-mono mr-1">SEM:</span>
            {availableSemesters.map((sem) => (
              <button
                key={sem}
                onClick={() =>
                  setFilterSemester(filterSemester === sem ? null : sem)
                }
                className={`text-[10px] px-2 py-1 border transition-all duration-150 font-mono ${
                  filterSemester === sem
                    ? "border-[#D97706] bg-[#D97706]/10 text-[#D97706] font-bold"
                    : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:border-[#201D1D] dark:hover:border-[#FDFCFC]"
                }`}
                style={{ borderRadius: 0 }}
              >
                {sem}
              </button>
            ))}
          </div>
        )}

        {availableSemesters.length > 0 && (
          <Separator orientation="vertical" className="h-4" />
        )}

        {/* Teacher filter */}
        {teachers.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#9A9898] font-mono mr-1">ENS:</span>
            <select
              value={filterTeacher || ""}
              onChange={(e) =>
                setFilterTeacher(e.target.value || null)
              }
              className="text-[10px] font-mono bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] px-2 py-1 focus:outline-none focus:border-[#D97706]"
              style={{ borderRadius: 0 }}
            >
              <option value="">Tous</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeFilters > 0 && (
          <button
            onClick={() => {
              setFilterType(null);
              setFilterSemester(null);
              setFilterTeacher(null);
            }}
            className="text-[10px] px-2 py-1 border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-colors font-mono flex items-center gap-1"
            style={{ borderRadius: 0 }}
          >
            <X className="h-2.5 w-2.5" />
            Réinitialiser
          </button>
        )}
      </div>
    );
  };

  // ── Render: Detail dialog ────────────────────────────────────────

  const renderDetailDialog = () => {
    if (!detailSubject) return null;
    const s = detailSubject;
    const subColor = getSubjectColor(s.name, isDarkMode());

    return (
      <Dialog open={!!detailSubject} onOpenChange={() => setDetailSubject(null)}>
        <DialogContent className="sm:max-w-lg border-[#E5E5E5] dark:border-[#2A2A2A]" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              {s.color && (
                <span
                  className="w-3 h-3 inline-block border border-[#E5E5E5] dark:border-[#2A2A2A]"
                  style={{ backgroundColor: s.color, borderRadius: 0 }}
                />
              )}
              {s.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9A9898]">
              Détails de la matière
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Main info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
                <p className="text-[10px] text-[#9A9898] mb-1">Type</p>
                {renderTypeBadge(s.type)}
              </div>
              <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
                <p className="text-[10px] text-[#9A9898] mb-1">Semestre</p>
                <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                  {s.semester || "—"}
                </p>
              </div>
              <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
                <p className="text-[10px] text-[#9A9898] mb-1">Heures/sem</p>
                <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                  {s.hoursPerWeek || "—"}h
                </p>
              </div>
              <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
                <p className="text-[10px] text-[#9A9898] mb-1">Coefficient</p>
                <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                  {s.coefficient || "—"}
                </p>
              </div>
            </div>

            {/* Code */}
            {s.code && (
              <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
                <p className="text-[10px] text-[#9A9898] mb-1">Code</p>
                <code className="text-xs font-mono bg-[#F8F7F7] dark:bg-[#1A1A1A] px-2 py-1 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC]">
                  {s.code}
                </code>
              </div>
            )}

            {/* Teachers */}
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
              <p className="text-[10px] text-[#9A9898] mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Enseignants ({s.teacherAssignments.length})
              </p>
              {s.teacherAssignments.length === 0 ? (
                <p className="text-xs text-[#9A9898] italic">Aucun enseignant assigné</p>
              ) : (
                <div className="space-y-1.5">
                  {s.teacherAssignments.map((ta) => (
                    <div
                      key={ta.teacher.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 text-[9px] font-bold border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC]"
                        style={{ borderRadius: 0 }}
                      >
                        {getInitials(ta.teacher.firstName, ta.teacher.lastName)}
                      </span>
                      <span className="text-[#201D1D] dark:text-[#FDFCFC]">
                        {ta.teacher.firstName} {ta.teacher.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Classes */}
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
              <p className="text-[10px] text-[#9A9898] mb-2 flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                Classes ({s.classSubjects.length})
              </p>
              {s.classSubjects.length === 0 ? (
                <p className="text-xs text-[#9A9898] italic">Aucune classe assignée</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {s.classSubjects.map((cs) => (
                    <span
                      key={cs.class.id}
                      className="text-[10px] px-2 py-1 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-mono"
                      style={{ borderRadius: 0 }}
                    >
                      {cs.class.name}
                      {cs.hoursPerWeek ? ` (${cs.hoursPerWeek}h)` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDetailSubject(null)}
              className="text-xs"
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                setDetailSubject(null);
                openEdit(s);
              }}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
              style={{ borderRadius: 0 }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Render: Create/Edit dialog ───────────────────────────────────

  const renderFormDialog = () => {
    // Preview color
    const previewColor = form.color || getSubjectColor(form.name || "X", isDarkMode());

    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-2xl border-[#E5E5E5] dark:border-[#2A2A2A] max-h-[90vh] overflow-y-auto"
          style={{ borderRadius: 0 }}
        >
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingSubject ? "Modifier la matière" : "Nouvelle matière"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Preview card */}
            {(form.name || form.code) && (
              <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <p className="text-[10px] text-[#9A9898] mb-2 font-mono">APERÇU</p>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                      {form.name || "Nom de la matière"}
                    </h4>
                    {form.code && (
                      <code className="text-[10px] font-mono bg-[#FDFCFC] dark:bg-[#0A0A0A] text-[#646262] dark:text-[#9A9898] px-1 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A]">
                        {form.code}
                      </code>
                    )}
                  </div>
                  {renderTypeBadge(form.type)}
                </div>
              </div>
            )}

            {/* Section: Informations */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-3.5 w-3.5 text-[#D97706]" />
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
                      if (e.target.value)
                        setValidationErrors((prev) => ({ ...prev, name: false }));
                    }}
                    placeholder="Ex: Algorithmique"
                    className={`mt-1 ${validationErrors.name ? "border-[#DC2626] focus:border-[#DC2626]" : ""}`}
                    style={{ borderRadius: 0 }}
                  />
                  {validationErrors.name && (
                    <p className="text-[10px] text-[#DC2626] mt-1">Requis</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-bold">Code</Label>
                  <Input
                    value={form.code}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="Ex: INF201"
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs font-bold">Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger className="mt-1" style={{ borderRadius: 0 }}>
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
                  <Label className="text-xs font-bold">Semestre</Label>
                  <Select
                    value={form.semester}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, semester: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 w-full" style={{ borderRadius: 0 }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["S1", "S2", "S3", "S4", "S5", "S6", "Annuel"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section: Horaires & Coefficients */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Horaires &amp; Coefficients
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold">Heures/sem</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={form.hoursPerWeek}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hoursPerWeek: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Coefficient</Label>
                  <Input
                    type="number"
                    value={form.coefficient}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        coefficient: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>

            {/* Section: Color */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Couleur
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        color: prev.color === c ? "" : c,
                      }))
                    }
                    className={`w-7 h-7 border-2 transition-all ${
                      form.color === c
                        ? "border-[#201D1D] dark:border-[#FDFCFC] scale-110"
                        : "border-[#E5E5E5] dark:border-[#2A2A2A] hover:scale-105"
                    }`}
                    style={{ backgroundColor: c, borderRadius: 0 }}
                    title={c}
                  />
                ))}
                {form.color && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, color: "" }))}
                    className="w-7 h-7 border border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-center text-[#9A9898] hover:text-[#DC2626]"
                    style={{ borderRadius: 0 }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Section: Enseignants */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Enseignants
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
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
                    style={{ borderRadius: 0 }}
                  >
                    {teacher.firstName} {teacher.lastName}
                  </button>
                ))}
                {teachers.length === 0 && (
                  <p className="text-xs text-[#9A9898]">
                    Créez d&apos;abord des enseignants
                  </p>
                )}
              </div>
            </div>

            {/* Section: Classes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Classes
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
              {classes.length === 0 ? (
                <p className="text-xs text-[#9A9898]">
                  Créez d&apos;abord des classes
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {classes.map((cls) => {
                    const assigned = form.classAssignments.find(
                      (ca) => ca.classId === cls.id
                    );
                    return (
                      <div
                        key={cls.id}
                        className={`flex items-center gap-3 p-2 border transition-all duration-150 cursor-pointer ${
                          assigned
                            ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D]/5 dark:bg-[#FDFCFC]/5"
                            : "border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#9A9898]"
                        }`}
                        style={{ borderRadius: 0 }}
                        onClick={() => toggleClassAssignment(cls.id)}
                      >
                        <input
                          type="checkbox"
                          checked={!!assigned}
                          onChange={() => toggleClassAssignment(cls.id)}
                          className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] flex-1">
                          {cls.name}
                        </span>
                        {assigned && (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="number"
                              step="0.5"
                              value={assigned.hoursPerWeek}
                              onChange={(e) =>
                                updateClassHours(
                                  cls.id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 h-6 text-[10px] px-1"
                              style={{ borderRadius: 0 }}
                            />
                            <span className="text-[10px] text-[#9A9898]">h/sem</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-xs"
              style={{ borderRadius: 0 }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
              style={{ borderRadius: 0 }}
            >
              {saving
                ? "Enregistrement..."
                : editingSubject
                ? "Mettre à jour"
                : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Main render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
            Matières
          </h1>
          <p className="text-xs text-[#9A9898] mt-1">
            Gérez les matières et unités d&apos;enseignement
            {subjects.length > 0 && (
              <span className="ml-1">({subjects.length})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="ghost"
            className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
            disabled={filteredSubjects.length === 0}
            style={{ borderRadius: 0 }}
          >
            <Download className="h-3 w-3 mr-1" />
            Exporter
          </Button>
          <Button
            onClick={() => setImportOpen(true)}
            variant="ghost"
            className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
            style={{ borderRadius: 0 }}
          >
            <Upload className="h-3 w-3 mr-1" />
            Importer
          </Button>
          <Button
            onClick={openCreate}
            className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            style={{ borderRadius: 0 }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter une matière
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {subjects.length > 0 && renderStatsBar()}

      {/* Search, Filters, View toggle, Bulk actions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher une matière..."
            />
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              onClick={handleBulkDelete}
              className="text-xs text-[#DC2626] hover:text-[#DC2626]"
              style={{ borderRadius: 0 }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Supprimer ({selectedIds.size})
            </Button>
          )}
          <div className="flex-1" />
          {/* View toggle */}
          <div className="flex border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 transition-colors ${
                viewMode === "cards"
                  ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]"
                  : "text-[#646262] dark:text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
              }`}
              style={{ borderRadius: 0 }}
              title="Vue cartes"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 transition-colors border-l border-[#E5E5E5] dark:border-[#2A2A2A] ${
                viewMode === "table"
                  ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]"
                  : "text-[#646262] dark:text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
              }`}
              style={{ borderRadius: 0 }}
              title="Vue tableau"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {renderFilterBar()}
      </div>

      {/* Content */}
      {filteredSubjects.length === 0 ? (
        <EmptyState
          title={search ? "Aucun résultat" : "Aucune matière"}
          description={
            search
              ? "Essayez un autre terme de recherche"
              : "Ajoutez votre première matière"
          }
          step={3}
          action={
            !search ? (
              <Button
                onClick={openCreate}
                variant="ghost"
                className="text-xs border border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#201D1D] hover:text-[#FDFCFC] dark:hover:bg-[#FDFCFC] dark:hover:text-[#0A0A0A] px-4 py-2"
                style={{ borderRadius: 0 }}
              >
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "cards" ? (
        /* Card view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedSubjects.map((subject) => renderSubjectCard(subject))}
        </div>
      ) : (
        /* Table view */
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC] w-8">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === paginatedSubjects.length &&
                      paginatedSubjects.length > 0
                    }
                    onChange={() => {
                      if (selectedIds.size === paginatedSubjects.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(
                          new Set(paginatedSubjects.map((s) => s.id))
                        );
                      }
                    }}
                    className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                  />
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">
                  Nom
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">
                  Code
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">
                  Type
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">
                  H/sem
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">
                  Semestre
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">
                  Coef.
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">
                  Enseignants
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">
                  Classes
                </th>
                <th className="p-2 text-xs font-bold text-right text-[#201D1D] dark:text-[#FDFCFC]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedSubjects.map((subject) => (
                <tr
                  key={subject.id}
                  className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                  onClick={() => setDetailSubject(subject)}
                >
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(subject.id)}
                      onChange={() => toggleSelect(subject.id)}
                      className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {subject.color && (
                        <span
                          className="w-2.5 h-2.5 inline-block border border-[#E5E5E5] dark:border-[#2A2A2A] flex-shrink-0"
                          style={{ backgroundColor: subject.color, borderRadius: 0 }}
                        />
                      )}
                      <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                        {subject.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">
                    <code className="text-[10px] bg-[#F8F7F7] dark:bg-[#1A1A1A] px-1 py-0.5 font-mono">
                      {subject.code || "—"}
                    </code>
                  </td>
                  <td className="p-2">{renderTypeBadge(subject.type)}</td>
                  <td className="p-2 text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                    {subject.hoursPerWeek || "—"}h
                  </td>
                  <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898] font-mono">
                    {subject.semester || "—"}
                  </td>
                  <td className="p-2 text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] font-bold">
                    {subject.coefficient || "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-[#9A9898]" />
                      <span className="text-xs text-[#646262] dark:text-[#9A9898]">
                        {subject.teacherAssignments.length}
                      </span>
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3 w-3 text-[#9A9898]" />
                      <span className="text-xs text-[#646262] dark:text-[#9A9898]">
                        {subject.classSubjects.length}
                      </span>
                    </div>
                  </td>
                  <td
                    className="p-2 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
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

      {/* Card view pagination */}
      {viewMode === "cards" && filteredSubjects.length > 0 && (
        <Pagination
          currentPage={safePage}
          pageSize={pageSize}
          totalItems={filteredSubjects.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Create/Edit Dialog */}
      {renderFormDialog()}

      {/* Detail Dialog */}
      {renderDetailDialog()}

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
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
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
