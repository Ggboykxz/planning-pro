"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Printer, AlertTriangle, ZoomIn, ZoomOut, Clock, Download, FileText, Image, Zap, ExternalLink, Pencil, Trash2, Share2, History, RotateCcw } from "lucide-react";
import { dayNames } from "@/lib/countries";
import { useAppStore, type TimetableViewMode } from "@/lib/store";
import { ContextBar } from "@/components/layout/ContextBar";
import { ConflictPanel } from "./ConflictPanel";
import { toast } from "sonner";

// Subject color palette - subtle tints with colored left border
const subjectColorPalette = [
  { border: "border-l-emerald-500", bg: "bg-emerald-50/50 dark:bg-emerald-950/20" },
  { border: "border-l-amber-500", bg: "bg-amber-50/50 dark:bg-amber-950/20" },
  { border: "border-l-rose-500", bg: "bg-rose-50/50 dark:bg-rose-950/20" },
  { border: "border-l-violet-500", bg: "bg-violet-50/50 dark:bg-violet-950/20" },
  { border: "border-l-cyan-500", bg: "bg-cyan-50/50 dark:bg-cyan-950/20" },
  { border: "border-l-orange-500", bg: "bg-orange-50/50 dark:bg-orange-950/20" },
  { border: "border-l-teal-500", bg: "bg-teal-50/50 dark:bg-teal-950/20" },
  { border: "border-l-pink-500", bg: "bg-pink-50/50 dark:bg-pink-950/20" },
  { border: "border-l-indigo-500", bg: "bg-indigo-50/50 dark:bg-indigo-950/20" },
  { border: "border-l-lime-500", bg: "bg-lime-50/50 dark:bg-lime-950/20" },
];

interface TimetableSlotData {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { id: string; name: string; code: string | null; type: string | null } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
  room: { id: string; name: string; type: string | null } | null;
}

interface TimetableVersion {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  _count?: { slots: number };
}

interface TimetableData {
  id: string;
  name: string;
  version: number;
  slots: TimetableSlotData[];
  class: { id: string; name: string };
}

interface ClassData {
  id: string;
  name: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface RoomOption {
  id: string;
  name: string;
}

interface ConflictData {
  teacherConflicts: Array<{ teacherName: string; dayOfWeek: number; time: string; classes: string[] }>;
  roomConflicts: Array<{ roomName: string; dayOfWeek: number; time: string; classes: string[] }>;
}

interface TimetableViewProps {
  institutionId: string;
}

export function TimetableView({ institutionId }: TimetableViewProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0 });
  const [conflicts, setConflicts] = useState<ConflictData | null>(null);
  const [zoom, setZoom] = useState(100);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlotData | null>(null);
  const [versions, setVersions] = useState<TimetableVersion[]>([]);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  const [editSlotOpen, setEditSlotOpen] = useState(false);
  const [editSlotData, setEditSlotData] = useState<{ teacherId: string; roomId: string }>({ teacherId: "", roomId: "" });
  const timetableRef = useRef<HTMLDivElement>(null);

  const {
    timetableViewMode,
    setTimetableViewMode,
    selectedClassId,
    setSelectedClassId,
    selectedTeacherId,
    setSelectedTeacherId,
    selectedRoomId,
    setSelectedRoomId,
    setCurrentSection,
    addNotification,
  } = useAppStore();

  useEffect(() => {
    loadData();
  }, [institutionId]);

  const loadData = async () => {
    try {
      const [cRes, tRes, rRes] = await Promise.all([
        fetch(`/api/classes?institutionId=${institutionId}`),
        fetch(`/api/teachers?institutionId=${institutionId}`),
        fetch(`/api/rooms?institutionId=${institutionId}`),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setClasses(cData);
        if (cData.length > 0 && !selectedClassId) {
          setSelectedClassId(cData[0].id);
        }
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTeachers(tData.map((t: TeacherOption) => ({ id: t.id, firstName: t.firstName, lastName: t.lastName })));
        if (tData.length > 0 && !selectedTeacherId) {
          setSelectedTeacherId(tData[0].id);
        }
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRooms(rData.map((r: RoomOption) => ({ id: r.id, name: r.name })));
        if (rData.length > 0 && !selectedRoomId) {
          setSelectedRoomId(rData[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Load timetable based on view mode
  useEffect(() => {
    if (timetableViewMode === "class" && selectedClassId) {
      loadTimetable();
    } else if (timetableViewMode === "teacher" && selectedTeacherId) {
      loadTimetable();
    } else if (timetableViewMode === "room" && selectedRoomId) {
      loadTimetable();
    }
  }, [timetableViewMode, selectedClassId, selectedTeacherId, selectedRoomId]);

  // Load conflicts
  useEffect(() => {
    loadConflicts();
  }, [institutionId]);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/timetables?";
      if (timetableViewMode === "class" && selectedClassId) {
        url += `classId=${selectedClassId}`;
      } else if (timetableViewMode === "teacher" && selectedTeacherId) {
        url += `teacherId=${selectedTeacherId}`;
      } else if (timetableViewMode === "room" && selectedRoomId) {
        url += `roomId=${selectedRoomId}`;
      } else {
        setLoading(false);
        return;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        // Load versions if class view
        if (timetableViewMode === "class" && selectedClassId) {
          loadVersions();
        }
      } else {
        setTimetable(null);
      }
    } catch {
      setTimetable(null);
    } finally {
      setLoading(false);
    }
  }, [timetableViewMode, selectedClassId, selectedTeacherId, selectedRoomId]);

  const loadVersions = async () => {
    if (!selectedClassId) return;
    try {
      const res = await fetch(`/api/timetables?institutionId=${institutionId}`);
      if (res.ok) {
        const allTt = await res.json();
        const classVersions = allTt.filter(
          (tt: { classId: string; id: string; name: string; version: number; isActive: boolean; createdAt: string; _count?: { slots: number } }) =>
            tt.classId === selectedClassId
        );
        setVersions(classVersions);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadConflicts = async () => {
    try {
      const res = await fetch(`/api/dashboard?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setConflicts({
          teacherConflicts: data.teacherConflicts || [],
          roomConflicts: data.roomConflicts || [],
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClassId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, classId: selectedClassId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Emploi du temps généré ✓ (score: ${data.score ?? "N/A"})`);
        setTimetable(data);
        loadConflicts();
        loadVersions();
        addNotification({
          type: "generation_complete",
          title: "Emploi du temps généré",
          message: `Génération terminée pour la classe sélectionnée`,
        });
      } else {
        toast.error(data.error || "Erreur lors de la génération");
      }
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    if (classes.length === 0) {
      toast.error("Aucune classe configurée");
      return;
    }
    setGeneratingAll(true);
    setGenerateProgress({ current: 0, total: classes.length });
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < classes.length; i++) {
      setGenerateProgress({ current: i + 1, total: classes.length });
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ institutionId, classId: classes[i].id }),
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setGeneratingAll(false);
    if (errorCount === 0) {
      toast.success(`${successCount} emploi(s) du temps généré(s) ✓`);
    } else if (successCount === 0) {
      toast.error(`Erreur: aucun emploi du temps généré`);
    } else {
      toast.success(`${successCount} généré(s), ${errorCount} erreur(s)`);
    }
    loadTimetable();
    loadConflicts();
    addNotification({
      type: "generation_complete",
      title: "Génération en masse terminée",
      message: `${successCount} emploi(s) du temps généré(s), ${errorCount} erreur(s)`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!timetable) return;

    const csvRows: string[] = [];
    // Header
    csvRows.push(["Horaire", ...days.map((d) => dayNames[d] || `Jour ${d}`)].join(";"));

    // Data rows
    for (const time of allTimes) {
      const [start, end] = time.split("-");
      const row = [`${start} - ${end}`];
      for (const day of days) {
        const slot = slotsByDay[day]?.find(
          (s) => `${s.startTime}-${s.endTime}` === time
        );
        if (slot?.subject) {
          const parts = [slot.subject.name];
          if (slot.subject.type) parts.push(`(${slot.subject.type})`);
          if (slot.teacher) parts.push(`${slot.teacher.firstName} ${slot.teacher.lastName}`);
          if (slot.room) parts.push(slot.room.name);
          row.push(parts.join(" - "));
        } else {
          row.push("");
        }
      }
      csvRows.push(row.join(";"));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${timetable.name || "emploi-du-temps"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV exporté ✓");
  };

  // PNG Export
  const handleExportPNG = async () => {
    if (!timetableRef.current) return;
    try {
      const html2canvasModule = await import("html2canvas").catch(() => null);
      const tableEl = timetableRef.current.querySelector("table");
      if (!tableEl) return;

      if (html2canvasModule?.default) {
        const canvasResult = await html2canvasModule.default(tableEl, {
          backgroundColor: document.documentElement.classList.contains("dark") ? "#0A0A0A" : "#FFFFFF",
          scale: 2,
        });
        const link = document.createElement("a");
        link.href = canvasResult.toDataURL("image/png");
        link.download = `${timetable?.name || "emploi-du-temps"}.png`;
        link.click();
        toast.success("PNG exporté ✓");
      } else {
        toast.info("Utilisez Imprimer > PDF pour exporter en image");
      }
    } catch {
      toast.info("Utilisez Imprimer > PDF pour exporter en image");
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    window.print();
  };

  // Share timetable
  const handleShare = async () => {
    if (!timetable) return;
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timetableId: timetable.id }),
      });
      if (res.ok) {
        const { shareId } = await res.json();
        const shareUrl = `${window.location.origin}/?shareId=${shareId}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Lien de partage copié ✓");
      } else {
        toast.error("Erreur lors de la création du lien");
      }
    } catch {
      toast.error("Erreur lors du partage");
    }
  };

  // Slot editing
  const handleEditSlot = () => {
    if (!selectedSlot) return;
    setEditSlotData({
      teacherId: selectedSlot.teacher?.id || "",
      roomId: selectedSlot.room?.id || "",
    });
    setEditSlotOpen(true);
  };

  const handleSaveSlotEdit = async () => {
    if (!selectedSlot) return;
    try {
      const res = await fetch("/api/timetables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          teacherId: editSlotData.teacherId || undefined,
          roomId: editSlotData.roomId || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Créneau modifié ✓");
        setEditSlotOpen(false);
        setSelectedSlot(null);
        loadTimetable();
      } else {
        toast.error("Erreur lors de la modification");
      }
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  // Slot deletion
  const handleDeleteSlot = async () => {
    if (!selectedSlot) return;
    try {
      const res = await fetch("/api/timetables", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selectedSlot.id }),
      });
      if (res.ok) {
        toast.success("Créneau supprimé ✓");
        setSelectedSlot(null);
        loadTimetable();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  // View version
  const handleViewVersion = async (versionId: string) => {
    setViewingVersionId(versionId);
    try {
      const res = await fetch(`/api/timetables?classId=${selectedClassId}`);
      if (res.ok) {
        // We need to get the specific version
        const allRes = await fetch(`/api/timetables?institutionId=${institutionId}`);
        if (allRes.ok) {
          const allTt = await allRes.json();
          const version = allTt.find((tt: { id: string }) => tt.id === versionId);
          if (version) {
            // Load slots for this version
            const vRes = await fetch(`/api/timetables?classId=${selectedClassId}`);
            // Actually, we need a different approach - let's use the timetable API with a version query
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Restore version
  const handleRestoreVersion = async (versionId: string) => {
    try {
      const res = await fetch("/api/timetables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: versionId, isActive: true }),
      });
      if (res.ok) {
        // Deactivate current
        if (timetable?.id && timetable.id !== versionId) {
          await fetch("/api/timetables", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: timetable.id, isActive: false }),
          });
        }
        toast.success("Version restaurée ✓");
        setViewingVersionId(null);
        loadTimetable();
        loadVersions();
      }
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  // Group slots by day
  const slotsByDay: Record<number, TimetableSlotData[]> = {};
  if (timetable?.slots) {
    for (const slot of timetable.slots) {
      if (!slotsByDay[slot.dayOfWeek]) slotsByDay[slot.dayOfWeek] = [];
      slotsByDay[slot.dayOfWeek].push(slot);
    }
  }

  // Get unique days and time slots
  const days = Object.keys(slotsByDay)
    .map(Number)
    .sort((a, b) => a - b);
  const allTimes = timetable?.slots
    ? [...new Set(timetable.slots.map((s) => `${s.startTime}-${s.endTime}`))].sort()
    : [];

  // Color assignment for subjects
  const subjectColorMap = new Map<string, number>();
  let colorIndex = 0;
  if (timetable?.slots) {
    for (const slot of timetable.slots) {
      if (slot.subject && !subjectColorMap.has(slot.subject.id)) {
        subjectColorMap.set(slot.subject.id, colorIndex % subjectColorPalette.length);
        colorIndex++;
      }
    }
  }

  // Calculate subject hours
  const subjectHours = new Map<string, { name: string; hours: number }>();
  if (timetable?.slots) {
    for (const slot of timetable.slots) {
      if (slot.subject) {
        const existing = subjectHours.get(slot.subject.id);
        if (existing) {
          existing.hours += 1;
        } else {
          subjectHours.set(slot.subject.id, { name: slot.subject.name, hours: 1 });
        }
      }
    }
  }

  // Detect break time rows
  const isBreakTime = (startTime: string) => {
    const hour = parseInt(startTime.split(":")[0]);
    return hour >= 12 && hour < 14;
  };

  const isHistoricalVersion = viewingVersionId !== null && timetable?.id === viewingVersionId;

  const viewModeTabs = [
    { id: "class", label: "Par classe" },
    { id: "teacher", label: "Par enseignant" },
    { id: "room", label: "Par salle" },
  ];

  return (
    <div className="space-y-6">
      {/* Print header - hidden on screen, visible in print */}
      <div className="hidden print-header">
        <h1>{timetable?.name || "Emploi du temps"}</h1>
        <p>{timetable?.class?.name || ""}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Emploi du temps</h1>
          <p className="text-xs text-[#9A9898] mt-1">
            Consultez et générez les emplois du temps
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {timetableViewMode === "class" && (
            <Select value={selectedClassId || ""} onValueChange={(v) => setSelectedClassId(v)}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Choisir une classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {timetableViewMode === "teacher" && (
            <Select value={selectedTeacherId || ""} onValueChange={(v) => setSelectedTeacherId(v)}>
              <SelectTrigger className="w-[200px] text-xs">
                <SelectValue placeholder="Choisir un enseignant" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {timetableViewMode === "room" && (
            <Select value={selectedRoomId || ""} onValueChange={(v) => setSelectedRoomId(v)}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Choisir une salle" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {timetableViewMode === "class" && (
            <>
              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedClassId}
                className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {generating ? "Génération..." : "Générer"}
              </Button>
              <Button
                onClick={handleGenerateAll}
                disabled={generatingAll}
                variant="ghost"
                className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] no-print"
              >
                <Zap className="h-3 w-3 mr-1" />
                {generatingAll ? `${generateProgress.current}/${generateProgress.total}` : "Générer tout"}
              </Button>
            </>
          )}
          {timetable && (
            <div className="flex items-center gap-1 no-print">
              <Button
                variant="ghost"
                onClick={handleExportCSV}
                className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                title="Exporter CSV"
              >
                <FileText className="h-3 w-3 mr-1" />
                CSV
              </Button>
              <Button
                variant="ghost"
                onClick={handleExportPNG}
                className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                title="Exporter PNG"
              >
                <Download className="h-3 w-3 mr-1" />
                PNG
              </Button>
              <Button
                variant="ghost"
                onClick={handleExportPDF}
                className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                title="Exporter PDF"
              >
                <Image className="h-3 w-3 mr-1" alt="" />
                PDF
              </Button>
              <Button
                variant="ghost"
                onClick={handleShare}
                className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                title="Partager"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Partager
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handlePrint}
            disabled={!timetable}
            className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] no-print"
          >
            <Printer className="h-3 w-3 mr-1" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Generate all progress */}
      {generatingAll && (
        <div className="border border-[#D97706]/30 bg-[#D97706]/5 dark:bg-[#D97706]/10 p-3">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-4 w-4 border-2 border-[#D97706] border-t-transparent" />
            <span className="text-xs text-[#D97706] font-bold">
              Génération en cours... {generateProgress.current}/{generateProgress.total}
            </span>
          </div>
          <div className="mt-2 h-1 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full">
            <div
              className="h-full bg-[#D97706] transition-all duration-300"
              style={{ width: `${(generateProgress.current / generateProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* View mode tabs */}
      <ContextBar
        items={viewModeTabs}
        activeId={timetableViewMode}
        onSelect={(id) => setTimetableViewMode(id as TimetableViewMode)}
      />

      {/* Historical version notice */}
      {viewingVersionId && (
        <div className="border border-[#D97706]/30 bg-[#D97706]/5 dark:bg-[#D97706]/10 p-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-[#D97706]" />
            <span className="text-xs text-[#D97706] font-bold">Version historique (lecture seule)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => handleRestoreVersion(viewingVersionId)}
              className="text-xs text-[#D97706] hover:text-[#D97706]"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restaurer cette version
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setViewingVersionId(null); loadTimetable(); }}
              className="text-xs text-[#646262]"
            >
              Retour à la version active
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {classes.length === 0 && timetableViewMode === "class" ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <p className="text-xs text-[#9A9898]">Aucune classe configurée. Créez d&apos;abord des classes.</p>
        </div>
      ) : loading ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="h-16 skeleton-shimmer" />
            ))}
          </div>
        </div>
      ) : !timetable ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[#D97706] mx-auto mb-3" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold">Aucun emploi du temps</p>
          <p className="text-xs text-[#9A9898] mt-1">
            Cliquez sur &quot;Générer&quot; pour créer automatiquement l&apos;emploi du temps
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timetable title + zoom controls */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              {timetable.name} — {timetable.class.name}
              {timetable.version > 1 && (
                <span className="text-[#9A9898] font-normal ml-2">v{timetable.version}</span>
              )}
            </p>
            <div className="flex items-center gap-1 no-print">
              <button
                onClick={() => setZoom(Math.max(70, zoom - 10))}
                className="p-1.5 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                title="Zoom arrière"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-[#9A9898] w-10 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                className="p-1.5 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                title="Zoom avant"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="overflow-x-auto border border-[#E5E5E5] dark:border-[#2A2A2A] relative" ref={timetableRef}>
            <table className="w-full border-collapse min-w-[700px]" style={{ fontSize: `${zoom * 0.12}px` }}>
              <thead>
                <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                  <th className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold text-left w-24 text-[#201D1D] dark:text-[#FDFCFC]">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Horaire
                    </div>
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold text-center text-[#201D1D] dark:text-[#FDFCFC]"
                    >
                      {dayNames[day] || `Jour ${day}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTimes.map((time) => {
                  const [start, end] = time.split("-");
                  const isBreak = isBreakTime(start);
                  return (
                    <tr key={time} className={isBreak ? "break-row" : ""}>
                      <td className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-[10px] text-[#9A9898] whitespace-nowrap ${isBreak ? "bg-[#F8F7F7]/50 dark:bg-[#1A1A1A]/50" : ""}`}>
                        <div className="flex items-center gap-1">
                          {start} — {end}
                          {isBreak && <span className="text-[8px] font-bold text-[#D97706] ml-1">PAUSE</span>}
                        </div>
                      </td>
                      {days.map((day) => {
                        const slot = slotsByDay[day]?.find(
                          (s) => `${s.startTime}-${s.endTime}` === time
                        );
                        if (!slot || !slot.subject) {
                          return (
                            <td key={day} className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-1 timetable-cell ${isBreak ? "break-row" : ""}`}>
                              <div className="h-full min-h-[60px]" />
                            </td>
                          );
                        }
                        const colorIdx = subjectColorMap.get(slot.subject.id) || 0;
                        const color = subjectColorPalette[colorIdx];
                        const isHovered = hoveredSlot === slot.id;
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <td
                            key={day}
                            className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-1 timetable-cell ${isBreak ? "break-row" : ""}`}
                          >
                            <Popover
                              open={isSelected}
                              onOpenChange={(open) => {
                                if (!open) setSelectedSlot(null);
                              }}
                            >
                              <PopoverTrigger asChild>
                                <div
                                  className={`border-l-[3px] ${color.border} ${color.bg} p-2 min-h-[60px] transition-all duration-150 timetable-slot-clickable ${
                                    isHovered || isSelected ? "ring-1 ring-[#201D1D]/20 dark:ring-[#FDFCFC]/20" : ""
                                  }`}
                                  onMouseEnter={() => setHoveredSlot(slot.id)}
                                  onMouseLeave={() => setHoveredSlot(null)}
                                  onClick={() => setSelectedSlot(slot)}
                                >
                                  <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">
                                    {slot.subject.name}
                                  </p>
                                  {slot.subject.type && (
                                    <span className="text-[9px] text-[#9A9898] uppercase">
                                      {slot.subject.type}
                                    </span>
                                  )}
                                  <div className="mt-1">
                                    {slot.teacher && (
                                      <p className="text-[10px] text-[#646262] dark:text-[#9A9898] truncate">
                                        {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                                      </p>
                                    )}
                                    {slot.room && (
                                      <p className="text-[10px] text-[#646262] dark:text-[#9A9898] truncate">
                                        {slot.room.name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-64 p-0 border-[#E5E5E5] dark:border-[#2A2A2A]"
                                side="right"
                                align="start"
                              >
                                <div className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] px-4 py-3">
                                  <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                                    {slot.subject.name}
                                  </p>
                                  {slot.subject.type && (
                                    <span className="text-[10px] text-[#9A9898] uppercase">{slot.subject.type}</span>
                                  )}
                                </div>
                                <div className="px-4 py-3 space-y-2">
                                  {slot.teacher && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-[#9A9898]">Enseignant</span>
                                      <button
                                        onClick={() => {
                                          setSelectedSlot(null);
                                          setTimetableViewMode("teacher");
                                          setSelectedTeacherId(slot.teacher!.id);
                                        }}
                                        className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold hover:underline flex items-center gap-1"
                                      >
                                        {slot.teacher.firstName} {slot.teacher.lastName}
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  {slot.room && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-[#9A9898]">Salle</span>
                                      <button
                                        onClick={() => {
                                          setSelectedSlot(null);
                                          setTimetableViewMode("room");
                                          setSelectedRoomId(slot.room!.id);
                                        }}
                                        className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold hover:underline flex items-center gap-1"
                                      >
                                        {slot.room.name}
                                        {slot.room.type && <span className="text-[10px] text-[#9A9898] font-normal ml-1">({slot.room.type})</span>}
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-[#9A9898]">Horaire</span>
                                    <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC]">
                                      {start} — {end}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-[#9A9898]">Jour</span>
                                    <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC]">
                                      {dayNames[slot.dayOfWeek] || `Jour ${slot.dayOfWeek}`}
                                    </span>
                                  </div>
                                </div>
                                {/* Edit/Delete buttons */}
                                {!viewingVersionId && (
                                  <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] px-4 py-2 flex gap-2">
                                    <button
                                      onClick={handleEditSlot}
                                      className="flex-1 flex items-center justify-center gap-1 text-[10px] text-[#201D1D] dark:text-[#FDFCFC] font-bold py-1.5 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Modifier
                                    </button>
                                    <button
                                      onClick={handleDeleteSlot}
                                      className="flex-1 flex items-center justify-center gap-1 text-[10px] text-[#DC2626] font-bold py-1.5 hover:bg-[#DC2626]/5 transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Supprimer
                                    </button>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subject Hours Summary */}
          {subjectHours.size > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {Array.from(subjectHours.entries()).map(([subjectId, info]) => {
                const colorIdx = subjectColorMap.get(subjectId) || 0;
                const color = subjectColorPalette[colorIdx];
                return (
                  <div key={subjectId} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 border-l-[3px] ${color.border} ${color.bg}`} />
                    <span className="text-[10px] text-[#646262]">{info.name}</span>
                    <span className="text-[10px] text-[#9A9898]">({info.hours}h)</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Version History */}
          {versions.length > 1 && (
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 no-print">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-3.5 w-3.5 text-[#9A9898]" />
                <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                  Historique des versions
                </p>
              </div>
              <div className="space-y-0 max-h-48 overflow-y-auto scrollbar-thin">
                {versions
                  .sort((a, b) => b.version - a.version)
                  .map((v) => (
                    <div
                      key={v.id}
                      className={`flex items-center justify-between py-2 px-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors ${
                        v.id === timetable?.id ? "bg-[#F8F7F7] dark:bg-[#1A1A1A]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                          v{v.version}
                        </span>
                        <span className="text-[10px] text-[#9A9898]">
                          {new Date(v.createdAt).toLocaleDateString("fr-FR")} {new Date(v.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {v.isActive && (
                          <span className="text-[10px] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-1.5 py-0.5 font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!v.isActive && (
                          <>
                            <button
                              onClick={() => handleViewVersion(v.id)}
                              className="text-[10px] text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] px-2 py-1 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                            >
                              Voir
                            </button>
                            <button
                              onClick={() => handleRestoreVersion(v.id)}
                              className="text-[10px] text-[#D97706] hover:text-[#D97706] px-2 py-1 hover:bg-[#D97706]/5 transition-colors"
                            >
                              <RotateCcw className="h-3 w-3 inline mr-1" />
                              Restaurer
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Conflict Panel */}
          {conflicts && (
            <ConflictPanel
              teacherConflicts={conflicts.teacherConflicts}
              roomConflicts={conflicts.roomConflicts}
            />
          )}
        </div>
      )}

      {/* Edit Slot Dialog */}
      <Dialog open={editSlotOpen} onOpenChange={setEditSlotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Modifier le créneau</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Enseignant
              </label>
              <Select value={editSlotData.teacherId} onValueChange={(v) => setEditSlotData((prev) => ({ ...prev, teacherId: v }))}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Choisir un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Salle
              </label>
              <Select value={editSlotData.roomId} onValueChange={(v) => setEditSlotData((prev) => ({ ...prev, roomId: v }))}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Choisir une salle" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditSlotOpen(false)} className="text-xs">
              Annuler
            </Button>
            <Button
              onClick={handleSaveSlotEdit}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
