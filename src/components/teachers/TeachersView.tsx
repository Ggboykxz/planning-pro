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
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Upload,
  Clock,
  Download,
  LayoutGrid,
  List,
  Users,
  Mail,
  Phone,
  GraduationCap,
  BarChart3,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { AvailabilityEditor } from "@/components/teachers/AvailabilityEditor";
import { Pagination } from "@/components/shared/Pagination";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";

interface TeacherData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  maxHoursPerWeek: number | null;
  unavailableSlots: string | null;
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

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function TeachersView({ institutionId }: TeachersViewProps) {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherData | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const firstNameRef = useRef<HTMLInputElement>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);

  // Availability dialog
  const [availOpen, setAvailOpen] = useState(false);
  const [availTeacherId, setAvailTeacherId] = useState<string>("");
  const [availTeacherName, setAvailTeacherName] = useState<string>("");
  const [availUnavailable, setAvailUnavailable] = useState<Array<{ day: number; startTime: string }>>([]);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

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
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [institutionId]);

  // Focus first input when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => firstNameRef.current?.focus(), 100);
      setValidationErrors({});
    }
  }, [dialogOpen]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Auto-select view mode based on count
  useEffect(() => {
    if (teachers.length >= 10 && viewMode === "cards") {
      setViewMode("table");
    } else if (teachers.length < 10 && teachers.length > 0 && viewMode === "table") {
      setViewMode("cards");
    }
  }, [teachers.length]);

  const loadData = async (signal?: AbortSignal) => {
    try {
      setError(false);
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/teachers?institutionId=${institutionId}`, { signal }),
        fetch(`/api/subjects?institutionId=${institutionId}`, { signal }),
      ]);
      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) setTeachers(tData);
      } else {
        setError(true);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData)) setSubjects(sData.map((s: SubjectData) => s));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(true);
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

  const openAvailability = (teacher: TeacherData) => {
    setAvailTeacherId(teacher.id);
    setAvailTeacherName(`${teacher.firstName} ${teacher.lastName}`);
    let unavail: Array<{ day: number; startTime: string }> = [];
    if (teacher.unavailableSlots) {
      try {
        unavail = JSON.parse(teacher.unavailableSlots);
      } catch {
        // ignore
      }
    }
    setAvailUnavailable(unavail);
    setAvailOpen(true);
  };

  const isValidEmail = (email: string) => {
    if (!email) return true; // optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    if (!form.firstName) errors.firstName = true;
    if (!form.lastName) errors.lastName = true;
    if (form.email && !isValidEmail(form.email)) errors.email = true;
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (errors.email) {
        toast.error("L'adresse email n'est pas valide");
      } else {
        toast.error("Le prénom et le nom sont requis");
      }
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

  const handleDelete = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer l'enseignant",
      description: "Êtes-vous sûr de vouloir supprimer cet enseignant ? Cette action est irréversible.",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/teachers?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Enseignant supprimé ✓");
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
      title: `Supprimer ${selectedIds.size} enseignant(s)`,
      description: `Êtes-vous sûr de vouloir supprimer ${selectedIds.size} enseignant(s) ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          await Promise.all(
            Array.from(selectedIds).map((id) =>
              fetch(`/api/teachers?id=${id}`, { method: "DELETE" })
            )
          );
          toast.success(`${selectedIds.size} enseignant(s) supprimé(s) ✓`);
          setSelectedIds(new Set());
          loadData();
        } catch {
          toast.error("Erreur lors de la suppression");
        }
      },
    });
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

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) =>
      `${t.firstName} ${t.lastName} ${t.specialization || ""}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [teachers, search]);

  // Stats
  const stats = useMemo(() => {
    const total = teachers.length;
    // Unique subjects that have at least 1 teacher
    const subjectsWithTeachers = new Set<string>();
    teachers.forEach((t) => t.subjectAssignments.forEach((sa) => subjectsWithTeachers.add(sa.subject.id)));
    const subjectsCovered = subjectsWithTeachers.size;
    // Average workload
    const teachersWithHours = teachers.filter((t) => t.maxHoursPerWeek && t.maxHoursPerWeek > 0);
    const avgWorkload = teachersWithHours.length > 0
      ? Math.round(
          teachersWithHours.reduce((acc, t) => {
            const assigned = t.timetableSlots.length;
            const max = t.maxHoursPerWeek || 1;
            return acc + Math.round((assigned / max) * 100);
          }, 0) / teachersWithHours.length
        )
      : 0;
    // Availability rate (% with availability set)
    const withAvailability = teachers.filter((t) => t.unavailableSlots && t.unavailableSlots !== "[]").length;
    const availabilityRate = total > 0 ? Math.round((withAvailability / total) * 100) : 0;
    return { total, subjectsCovered, avgWorkload, availabilityRate };
  }, [teachers]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTeachers = filteredTeachers.slice(
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
    exportToCSV(filteredTeachers, [
      { header: "Prénom", accessor: (t) => t.firstName },
      { header: "Nom", accessor: (t) => t.lastName },
      { header: "Email", accessor: (t) => t.email || "" },
      { header: "Téléphone", accessor: (t) => t.phone || "" },
      { header: "Spécialisation", accessor: (t) => t.specialization || "" },
      { header: "Heures Max", accessor: (t) => t.maxHoursPerWeek || "" },
      { header: "Matières", accessor: (t) => t.subjectAssignments.map((sa) => sa.subject.name).join(", ") },
    ], "enseignants");
    toast.success("CSV exporté ✓");
  };

  // ── Render: Teacher card ──
  const renderTeacherCard = (teacher: TeacherData) => {
    const assignedSlots = teacher.timetableSlots.length;
    const maxHours = teacher.maxHoursPerWeek || 0;
    const loadPct = maxHours > 0 ? Math.round((assignedSlots / maxHours) * 100) : 0;
    const hasAvailability = !!teacher.unavailableSlots && teacher.unavailableSlots !== "[]";
    const initials = getInitials(teacher.firstName, teacher.lastName);
    const subjectList = teacher.subjectAssignments.map((sa) => sa.subject.name);
    const visibleSubjects = subjectList.slice(0, 3);
    const extraCount = subjectList.length - 3;

    return (
      <div
        key={teacher.id}
        className="border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FDFCFC] dark:bg-[#0A0A0A] p-4 transition-all duration-200 hover:border-[#D97706] dark:hover:border-[#D97706] group relative"
        style={{ borderRadius: 0 }}
      >
        {/* Checkbox for bulk selection */}
        <div
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(teacher.id)}
            onChange={() => toggleSelect(teacher.id)}
            className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
          />
        </div>

        {/* Header: Avatar + Name */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 flex items-center justify-center border border-[#201D1D] dark:border-[#FDFCFC] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-bold font-mono text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">
              {teacher.firstName} {teacher.lastName}
            </p>
            <div className="flex items-center gap-2">
              {teacher.email && (
                <span className="text-[10px] text-[#9A9898] truncate">{teacher.email}</span>
              )}
              {/* Availability indicator */}
              <span className={`h-2 w-2 shrink-0 ${hasAvailability ? "bg-emerald-500" : "bg-[#9A9898]"}`} title={hasAvailability ? "Disponibilité configurée" : "Disponibilité non configurée"} />
            </div>
          </div>
        </div>

        {/* Subject badges */}
        {subjectList.length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-3">
            {visibleSubjects.map((name) => (
              <span
                key={name}
                className="text-[10px] px-1.5 py-0.5 border border-[#D97706]/30 bg-[#D97706]/5 text-[#D97706] font-bold"
              >
                {name}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#9A9898] font-bold">
                +{extraCount}
              </span>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-[#9A9898] italic mb-3">Aucune matière assignée</p>
        )}

        {/* Workload bar */}
        {maxHours > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-[#9A9898] font-mono w-16">
              {assignedSlots}h / {maxHours}h
            </span>
            <div className="flex-1 h-1.5 bg-[#F8F7F7] dark:bg-[#1A1A1A]">
              <div
                className={`h-full transition-all duration-300 ${
                  loadPct > 80 ? "bg-[#DC2626]" : loadPct > 50 ? "bg-[#D97706]" : "bg-[#201D1D] dark:bg-[#FDFCFC]"
                }`}
                style={{ width: `${Math.min(loadPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Specialization */}
        {teacher.specialization && (
          <p className="text-[10px] text-[#646262] dark:text-[#9A9898] mb-2">
            {teacher.specialization}
          </p>
        )}

        {/* Actions (show on hover) */}
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => openAvailability(teacher)}
            className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
            title="Disponibilité"
          >
            <Clock className="h-3 w-3" />
          </button>
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
      </div>
    );
  };

  // ── Render: Stats bar ──
  const renderStatsBar = () => (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <Users className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Enseignants</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.total}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <GraduationCap className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Matières couvertes</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.subjectsCovered}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <BarChart3 className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Charge moyenne</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.avgWorkload}%
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <UserCheck className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Disponibilités</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.availabilityRate}%
          </p>
        </div>
      </div>
    </div>
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

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Enseignants</h1>
        <div className="border border-[#DC2626] p-6 flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 text-[#DC2626]" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] text-center">Impossible de charger les enseignants.</p>
          <button
            onClick={() => { setLoading(true); loadData(); }}
            className="text-xs px-4 py-2 border border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#201D1D] hover:text-[#FDFCFC] dark:hover:bg-[#FDFCFC] dark:hover:text-[#0A0A0A] transition-colors"
          >
            Réessayer
          </button>
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
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 transition-colors ${viewMode === "cards" ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]" : "text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"}`}
              title="Cartes"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]" : "text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"}`}
              title="Tableau"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            onClick={handleExportCSV}
            variant="ghost"
            className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
            disabled={filteredTeachers.length === 0}
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
            Ajouter un enseignant
          </Button>
        </div>
      </div>

      {/* Stats summary bar */}
      {teachers.length > 0 && renderStatsBar()}

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
          step={1}
          action={
            !search ? (
              <Button
                onClick={openCreate}
                variant="ghost"
                className="text-xs border border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#201D1D] hover:text-[#FDFCFC] dark:hover:bg-[#FDFCFC] dark:hover:text-[#0A0A0A] px-4 py-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "cards" ? (
        /* ═══ CARD VIEW ═══ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTeachers.map((teacher) => renderTeacherCard(teacher))}
        </div>
      ) : (
        /* ═══ TABLE VIEW ═══ */
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC] w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === paginatedTeachers.length && paginatedTeachers.length > 0}
                    onChange={() => {
                      if (selectedIds.size === paginatedTeachers.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(paginatedTeachers.map((t) => t.id)));
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
              {paginatedTeachers.map((teacher) => {
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
                        {teacher.subjectAssignments.slice(0, 3).map((sa) => (
                          <span key={sa.subject.id} className="text-[10px] px-1.5 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898]">
                            {sa.subject.name}
                          </span>
                        ))}
                        {teacher.subjectAssignments.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#9A9898]">
                            +{teacher.subjectAssignments.length - 3}
                          </span>
                        )}
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
                          onClick={() => openAvailability(teacher)}
                          className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                          title="Disponibilité"
                        >
                          <Clock className="h-3 w-3" />
                        </button>
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

      {/* Pagination (only in table mode or when many cards) */}
      {filteredTeachers.length > pageSize && (
        <Pagination
          currentPage={safePage}
          pageSize={pageSize}
          totalItems={filteredTeachers.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl border-[#E5E5E5] dark:border-[#2A2A2A] max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingTeacher ? "Modifier l'enseignant" : "Nouvel enseignant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Section: Identité */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Identité
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
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
                    style={{ borderRadius: 0 }}
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
                    style={{ borderRadius: 0 }}
                  />
                  {validationErrors.lastName && (
                    <p className="text-[10px] text-[#DC2626] mt-1">Requis</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Contact */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Contact
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, email: e.target.value }));
                      if (isValidEmail(e.target.value)) setValidationErrors((prev) => ({ ...prev, email: false }));
                    }}
                    placeholder="email@exemple.com"
                    className={`mt-1 ${validationErrors.email ? "border-[#DC2626] focus:border-[#DC2626]" : ""}`}
                    style={{ borderRadius: 0 }}
                  />
                  {validationErrors.email && (
                    <p className="text-[10px] text-[#DC2626] mt-1 flex items-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5" />
                      Adresse email invalide
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Téléphone
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+221 7X XXX XXXX"
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>

            {/* Section: Professionnel */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Professionnel
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold">Spécialisation</Label>
                  <Input
                    value={form.specialization}
                    onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
                    placeholder="Informatique, Mathématiques..."
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Heures max / semaine</Label>
                  <Input
                    type="number"
                    value={form.maxHoursPerWeek}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxHoursPerWeek: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>

            {/* Section: Matières enseignées */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Matières enseignées
                </span>
                {form.subjectIds.length > 0 && (
                  <span className="text-[10px] font-bold text-[#D97706] font-mono">{form.subjectIds.length} sélectionnée(s)</span>
                )}
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
              {subjects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((subject) => {
                    const isSelected = form.subjectIds.includes(subject.id);
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubject(subject.id)}
                        className={`text-[10px] px-2.5 py-1.5 border transition-all duration-150 font-bold ${
                          isSelected
                            ? "border-[#D97706] bg-[#D97706]/10 text-[#D97706]"
                            : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:border-[#201D1D] dark:hover:border-[#FDFCFC]"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        {subject.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#9A9898]">Créez d&apos;abord des matières dans la section Matières</p>
              )}
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

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="teachers"
        institutionId={institutionId}
        onImported={() => loadData()}
      />

      {/* Availability Editor */}
      <AvailabilityEditor
        open={availOpen}
        onOpenChange={setAvailOpen}
        teacherId={availTeacherId}
        teacherName={availTeacherName}
        institutionId={institutionId}
        currentUnavailable={availUnavailable}
        onSave={() => loadData()}
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
