"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserX,
  Search,
  Plus,
  Check,
  X,
  Trash2,
  AlertTriangle,
  Stethoscope,
  GraduationCap,
  User,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────

interface Absence {
  id: string;
  institutionId: string;
  teacherId: string;
  teacherName?: string;
  substituteTeacherId?: string | null;
  substituteTeacherName?: string | null;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

// ─── Reason config ───────────────────────────────────────────────

const reasonConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  maladie: { label: "Maladie", color: "bg-[#DC2626]", icon: Stethoscope },
  formation: { label: "Formation", color: "bg-[#2563EB]", icon: GraduationCap },
  personnel: { label: "Personnel", color: "bg-[#D97706]", icon: User },
  autre: { label: "Autre", color: "bg-[#9A9898]", icon: HelpCircle },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-[#D97706] text-white" },
  approved: { label: "Approuvée", className: "bg-[#16A34A] text-white" },
  rejected: { label: "Rejetée", className: "bg-[#DC2626] text-white" },
};

// ─── Component ───────────────────────────────────────────────────

export default function AbsencesPage() {
  const { institutionId } = useAppStore();

  const [absences, setAbsences] = useState<Absence[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    teacherId: "",
    startDate: "",
    endDate: "",
    reason: "maladie",
    substituteTeacherId: "",
    notes: "",
  });

  // ─── Data loading ──────────────────────────────────────────────

  const loadAbsences = useCallback(async () => {
    if (!institutionId) return;
    try {
      const res = await fetch(`/api/absences?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setAbsences(data);
      }
    } catch {
      toast.error("Erreur lors du chargement des absences");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  const loadTeachers = useCallback(async () => {
    if (!institutionId) return;
    try {
      const res = await fetch(`/api/teachers?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch {
      // Silently fail
    }
  }, [institutionId]);

  useEffect(() => {
    loadAbsences();
    loadTeachers();
  }, [loadAbsences, loadTeachers]);

  // ─── Filtering ─────────────────────────────────────────────────

  const filtered = absences.filter((a) => {
    // Search by teacher name
    if (search) {
      const name = a.teacherName || "";
      if (!name.toLowerCase().includes(search.toLowerCase())) return false;
    }
    // Status filter
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    // Period filter
    if (periodFilter !== "all") {
      const now = new Date();
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      if (periodFilter === "month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        if (end < monthStart || start > monthEnd) return false;
      } else if (periodFilter === "week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        if (end < weekStart || start > weekEnd) return false;
      }
    }
    return true;
  });

  // ─── Stats ─────────────────────────────────────────────────────

  const pendingCount = absences.filter((a) => a.status === "pending").length;
  const approvedThisMonth = absences.filter((a) => {
    if (a.status !== "approved") return false;
    const now = new Date();
    const d = new Date(a.startDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const replacementRate = absences.length > 0
    ? Math.round((absences.filter((a) => a.substituteTeacherId).length / absences.length) * 100)
    : 0;

  // ─── Actions ───────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.teacherId || !form.startDate || !form.endDate || !form.reason) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          teacherId: form.teacherId,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          substituteTeacherId: form.substituteTeacherId || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Absence signalée ✓");
        setDialogOpen(false);
        setForm({ teacherId: "", startDate: "", endDate: "", reason: "maladie", substituteTeacherId: "", notes: "" });
        loadAbsences();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la création");
      }
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/absences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(status === "approved" ? "Absence approuvée ✓" : "Absence rejetée");
        loadAbsences();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/absences?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Absence supprimée ✓");
        loadAbsences();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getTeacherName = (teacherId: string) => {
    const t = teachers.find((t) => t.id === teacherId);
    return t ? `${t.firstName} ${t.lastName}` : teacherId;
  };

  // ─── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-48 skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
              <div className="h-8 skeleton-shimmer w-12 mb-2" />
              <div className="h-3 skeleton-shimmer w-24" />
            </div>
          ))}
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <div className="h-32 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserX className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
          <div>
            <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              Gestion des absences
            </h1>
            <p className="text-xs text-[#9A9898] mt-0.5">
              Suivi et gestion des absences des enseignants
            </p>
          </div>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
        >
          <Plus className="h-3 w-3" />
          Signaler une absence
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{pendingCount}</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Absences en cours</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{approvedThisMonth}</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Approuvées ce mois</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{replacementRate}%</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Taux de remplacement</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom d'enseignant..."
            className="pl-9 text-xs font-mono"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="approved">Approuvées</SelectItem>
            <SelectItem value="rejected">Rejetées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-full sm:w-36 text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-12 text-center">
          <UserX className="h-10 w-10 text-[#9A9898] mx-auto mb-3 opacity-30" />
          <p className="text-xs text-[#9A9898]">Aucune absence signalée</p>
          <p className="text-[10px] text-[#9A9898] mt-1">
            Cliquez sur &quot;Signaler une absence&quot; pour commencer
          </p>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Enseignant</th>
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Dates</th>
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Raison</th>
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Remplaçant</th>
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Statut</th>
                <th className="text-right p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((absence) => {
                const reason = reasonConfig[absence.reason] || reasonConfig.autre;
                const status = statusConfig[absence.status] || statusConfig.pending;
                const ReasonIcon = reason.icon;
                const isActionLoading = actionLoading === absence.id;

                return (
                  <tr
                    key={absence.id}
                    className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                  >
                    <td className="p-3">
                      <span className="text-[#201D1D] dark:text-[#FDFCFC] font-bold">
                        {absence.teacherName || getTeacherName(absence.teacherId)}
                      </span>
                    </td>
                    <td className="p-3 text-[#646262] dark:text-[#9A9898]">
                      {formatDate(absence.startDate)} → {formatDate(absence.endDate)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 shrink-0", reason.color)} />
                        <ReasonIcon className="h-3 w-3 text-[#9A9898] shrink-0" />
                        <span className="text-[#201D1D] dark:text-[#FDFCFC]">{reason.label}</span>
                      </div>
                    </td>
                    <td className="p-3 text-[#646262] dark:text-[#9A9898]">
                      {absence.substituteTeacherName || absence.substituteTeacherId
                        ? absence.substituteTeacherName || getTeacherName(absence.substituteTeacherId!)
                        : <span className="text-[#9A9898]">—</span>}
                    </td>
                    <td className="p-3">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5", status.className)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isActionLoading && <Loader2 className="h-3 w-3 animate-spin text-[#9A9898]" />}
                        {absence.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-7 gap-1 text-[#16A34A] hover:text-[#16A34A]"
                              disabled={isActionLoading}
                              onClick={() => handleUpdateStatus(absence.id, "approved")}
                            >
                              <Check className="h-3 w-3" />
                              Approuver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-7 gap-1 text-[#DC2626] hover:text-[#DC2626]"
                              disabled={isActionLoading}
                              onClick={() => handleUpdateStatus(absence.id, "rejected")}
                            >
                              <X className="h-3 w-3" />
                              Rejeter
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-7 gap-1 text-[#9A9898] hover:text-[#DC2626]"
                          disabled={isActionLoading}
                          onClick={() => handleDelete(absence.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Signaler une absence dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Signaler une absence
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Enseignant *</Label>
              <Select
                value={form.teacherId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, teacherId: v }))}
              >
                <SelectTrigger className="mt-1 text-xs font-mono">
                  <SelectValue placeholder="Sélectionner un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Date de début *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Date de fin *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Raison *</Label>
              <Select
                value={form.reason}
                onValueChange={(v) => setForm((prev) => ({ ...prev, reason: v }))}
              >
                <SelectTrigger className="mt-1 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maladie">Maladie</SelectItem>
                  <SelectItem value="formation">Formation</SelectItem>
                  <SelectItem value="personnel">Personnel</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Enseignant remplaçant</Label>
              <Select
                value={form.substituteTeacherId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, substituteTeacherId: v }))}
              >
                <SelectTrigger className="mt-1 text-xs font-mono">
                  <SelectValue placeholder="Aucun remplaçant" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter((t) => t.id !== form.teacherId)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Notes</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Informations complémentaires..."
                rows={3}
                className="mt-1 w-full border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A] text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#201D1D] dark:focus:ring-[#FDFCFC]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.teacherId || !form.startDate || !form.endDate}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Signaler l'absence"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
