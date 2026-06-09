"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DndContext, DragOverlay, closestCenter, type DragStartEvent, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
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
import {
  Sparkles, Printer, AlertTriangle, ZoomIn, ZoomOut, Clock, Download,
  Zap, ExternalLink, Pencil, Trash2, Share2, History,
  RotateCcw, Undo2, Redo2, Plus, Calendar, CalendarSync,
  Users, UserCheck, Building2, ChevronDown, ChevronUp, X,
  Loader2, GripVertical, FileSpreadsheet, FileImage, FileDown,
  Hash, BarChart3, BookOpen, Eye
} from "lucide-react";
import { dayNames } from "@/lib/countries";
import { useAppStore, type TimetableViewMode } from "@/lib/store";
import { ConflictPanel } from "./ConflictPanel";
import { DraggableSlot, DroppableCell, DragOverlayContent } from "./DndSlotComponents";
import { toast } from "sonner";
import { useUndoRedo, type UndoEntry } from "@/hooks/useUndoRedo";
import { getSubjectColor } from "@/lib/subject-colors";

// Generation terminal-style messages
const GENERATION_MESSAGES = [
  "⟩ Analyse des contraintes...",
  "⟩ Vérification des conflits...",
  "⟩ Optimisation en cours...",
  "✓ Emploi du temps généré",
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

interface SubjectOption {
  id: string;
  name: string;
  code: string | null;
  type: string | null;
  semester: string | null;
}

interface ConflictData {
  teacherConflicts: Array<{ teacherName: string; dayOfWeek: number; time: string; classes: string[] }>;
  roomConflicts: Array<{ roomName: string; dayOfWeek: number; time: string; classes: string[] }>;
}

interface TimetableViewProps {
  institutionId: string;
  institutionName?: string;
}

export function TimetableView({ institutionId, institutionName }: TimetableViewProps) {
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

  // Add slot dialog state
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [addSlotData, setAddSlotData] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectId: string;
    teacherId: string;
    roomId: string;
  }>({ dayOfWeek: 1, startTime: "08:00", endTime: "09:30", subjectId: "", teacherId: "", roomId: "" });

  // Subjects list
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  // DnD state
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [activeSlotData, setActiveSlotData] = useState<TimetableSlotData | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictMessages, setConflictMessages] = useState<string[]>([]);
  const [pendingMove, setPendingMove] = useState<{ slotId: string; dayOfWeek: number; startTime: string; endTime: string } | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generation progress state
  const [genMessageIndex, setGenMessageIndex] = useState(0);
  const [genResult, setGenResult] = useState<{
    score: number | null;
    unassignedSubjects: string[];
    conflictsCount: number;
  } | null>(null);
  const [genAbortRef, setGenAbortRef] = useState<AbortController | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [conflictAlertExpanded, setConflictAlertExpanded] = useState(false);
  const [conflictHighlight, setConflictHighlight] = useState<string[]>([]);

  // Undo/Redo
  const {
    canUndo,
    canRedo,
    undoCount,
    pushUndo,
    undo,
    redo,
    clearStacks,
  } = useUndoRedo();

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
    currentSemester,
    currentAcademicYear,
    setSemester,
    setAcademicYear,
  } = useAppStore();

  useEffect(() => {
    loadData();
  }, [institutionId]);

  const loadData = async () => {
    try {
      const [cRes, tRes, rRes, sRes] = await Promise.all([
        fetch(`/api/classes?institutionId=${institutionId}`),
        fetch(`/api/teachers?institutionId=${institutionId}`),
        fetch(`/api/rooms?institutionId=${institutionId}`),
        fetch(`/api/subjects?institutionId=${institutionId}`),
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
      if (sRes.ok) {
        const sData = await sRes.json();
        setSubjects(sData.map((s: SubjectOption) => ({ id: s.id, name: s.name, code: s.code, type: s.type, semester: s.semester })));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Load timetable based on view mode
  useEffect(() => {
    if (viewingVersionId) return;
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

  // Clear undo stack when switching classes
  useEffect(() => {
    clearStacks();
  }, [selectedClassId]);

  // TASK 2: Undo handler
  const handleUndo = useCallback(async () => {
    const entry = undo();
    if (!entry) return;

    try {
      if (entry.actionType === "edit") {
        await fetch("/api/timetables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId: entry.slotId,
            teacherId: entry.previousValues.teacherId || undefined,
            roomId: entry.previousValues.roomId || undefined,
          }),
        });
        toast.success("Annulé ✓");
      } else if (entry.actionType === "delete") {
        if (entry.deletedSlotData) {
          await fetch("/api/timetables", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: entry.deletedSlotData.timetableId,
              slots: [{
                subjectId: entry.deletedSlotData.subjectId,
                teacherId: entry.previousValues.teacherId,
                roomId: entry.previousValues.roomId,
                dayOfWeek: entry.previousValues.dayOfWeek,
                startTime: entry.previousValues.startTime,
                endTime: entry.previousValues.endTime,
                timeSlotId: entry.deletedSlotData.timeSlotId,
              }],
            }),
          });
          toast.success("Créneau restauré ✓");
        }
      } else if (entry.actionType === "move") {
        await fetch("/api/timetables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId: entry.slotId,
            teacherId: entry.previousValues.teacherId || undefined,
            roomId: entry.previousValues.roomId || undefined,
            dayOfWeek: entry.previousValues.dayOfWeek,
            startTime: entry.previousValues.startTime,
            endTime: entry.previousValues.endTime,
          }),
        });
        toast.success("Annulé ✓");
      }
      loadTimetable();
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  }, [undo]);

  // TASK 2: Redo handler
  const handleRedo = useCallback(async () => {
    const entry = redo();
    if (!entry) return;

    try {
      if (entry.actionType === "edit") {
        await fetch("/api/timetables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId: entry.slotId,
            teacherId: entry.newValues.teacherId || undefined,
            roomId: entry.newValues.roomId || undefined,
          }),
        });
        toast.success("Rétabli ✓");
      } else if (entry.actionType === "delete") {
        await fetch("/api/timetables", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotId: entry.slotId }),
        });
        toast.success("Suppression rétablie ✓");
      } else if (entry.actionType === "move") {
        await fetch("/api/timetables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId: entry.slotId,
            teacherId: entry.newValues.teacherId || undefined,
            roomId: entry.newValues.roomId || undefined,
            dayOfWeek: entry.newValues.dayOfWeek,
            startTime: entry.newValues.startTime,
            endTime: entry.newValues.endTime,
          }),
        });
        toast.success("Rétabli ✓");
      }
      loadTimetable();
    } catch {
      toast.error("Erreur lors du rétablissement");
    }
  }, [redo]);

  // FIX: Keyboard shortcuts for undo/redo with proper dependencies
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Generation message rotation
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setGenMessageIndex((prev) => {
        if (prev < GENERATION_MESSAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [generating]);

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
    setGenResult(null);
    setGenMessageIndex(0);

    const abortController = new AbortController();
    setGenAbortRef(abortController);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, classId: selectedClassId }),
        signal: abortController.signal,
      });
      const data = await res.json();

      if (abortController.signal.aborted) return;

      if (res.ok) {
        const score = data.score ?? null;
        const unassignedSubjects: string[] = data.unassignedSubjects || [];
        const conflictsCount = (data.teacherConflicts?.length || 0) + (data.roomConflicts?.length || 0);

        setGenResult({ score, unassignedSubjects, conflictsCount });
        setGenMessageIndex(GENERATION_MESSAGES.length - 1);

        toast.success(`Emploi du temps généré ✓ (score: ${score ?? "N/A"})`);
        setTimetable(data);
        loadConflicts();
        loadVersions();
        clearStacks();
        addNotification({
          type: "generation_complete",
          title: "Emploi du temps généré",
          message: `Génération terminée pour la classe sélectionnée`,
        });
      } else {
        setGenResult(null);
        toast.error(data.error || "Erreur lors de la génération");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.info("Génération annulée");
        return;
      }
      setGenResult(null);
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(false);
      setGenAbortRef(null);
    }
  };

  const handleCancelGeneration = () => {
    if (genAbortRef) {
      genAbortRef.abort();
      setGenerating(false);
      setGenAbortRef(null);
      setGenMessageIndex(0);
    }
  };

  const handleGenerateAll = async () => {
    if (classes.length === 0) {
      toast.error("Aucune classe configurée");
      return;
    }
    setGeneratingAll(true);
    setGenerateProgress({ current: 0, total: classes.length });
    clearStacks();
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
    csvRows.push(["Horaire", ...days.map((d) => dayNames[d] || `Jour ${d}`)].join(";"));

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
    setExporting(true);
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
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    setExportOpen(false);
    window.print();
  };

  // iCal Export
  const handleExportICal = async () => {
    if (!timetable) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/ical?timetableId=${timetable.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const disposition = res.headers.get("Content-Disposition");
        const match = disposition?.match(/filename="?(.+)"?/);
        a.download = match ? match[1] : `${timetable.name || "emploi-du-temps"}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("iCal exporté ✓");
      } else {
        toast.error("Erreur lors de l'export iCal");
      }
    } catch {
      toast.error("Erreur lors de l'export iCal");
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
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
        const shareUrl = `${window.location.origin}/share/${shareId}`;
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
    const undoEntry: UndoEntry = {
      slotId: selectedSlot.id,
      actionType: "edit",
      previousValues: {
        teacherId: selectedSlot.teacher?.id || null,
        roomId: selectedSlot.room?.id || null,
        dayOfWeek: selectedSlot.dayOfWeek,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      },
      newValues: {
        teacherId: editSlotData.teacherId || null,
        roomId: editSlotData.roomId || null,
        dayOfWeek: selectedSlot.dayOfWeek,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      },
    };
    pushUndo(undoEntry);

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
    const undoEntry: UndoEntry = {
      slotId: selectedSlot.id,
      actionType: "delete",
      previousValues: {
        teacherId: selectedSlot.teacher?.id || null,
        roomId: selectedSlot.room?.id || null,
        dayOfWeek: selectedSlot.dayOfWeek,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      },
      newValues: {
        teacherId: null,
        roomId: null,
        dayOfWeek: selectedSlot.dayOfWeek,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      },
      deletedSlotData: {
        timetableId: timetable?.id || "",
        subjectId: selectedSlot.subject?.id || null,
        timeSlotId: null,
      },
    };
    pushUndo(undoEntry);

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

  // Open add slot dialog for an empty cell
  const handleOpenAddSlot = (dayOfWeek: number, startTime: string, endTime: string) => {
    if (viewingVersionId) return;
    if (timetableViewMode !== "class") return;
    setAddSlotData({
      dayOfWeek,
      startTime,
      endTime,
      subjectId: "",
      teacherId: "",
      roomId: "",
    });
    setAddSlotOpen(true);
  };

  // Save new slot
  const handleSaveAddSlot = async () => {
    if (!timetable?.id || !addSlotData.subjectId) {
      toast.error("Veuillez sélectionner une matière");
      return;
    }
    try {
      const res = await fetch("/api/timetables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetableId: timetable.id,
          addSlot: {
            subjectId: addSlotData.subjectId,
            teacherId: addSlotData.teacherId || null,
            roomId: addSlotData.roomId || null,
            dayOfWeek: addSlotData.dayOfWeek,
            startTime: addSlotData.startTime,
            endTime: addSlotData.endTime,
          },
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const slotConflicts = result.conflicts as string[];
        if (slotConflicts && slotConflicts.length > 0) {
          toast.success("Créneau ajouté (conflit détecté) ⚠");
        } else {
          toast.success("Créneau ajouté ✓");
        }
        setAddSlotOpen(false);
        loadTimetable();
      } else {
        toast.error("Erreur lors de l'ajout du créneau");
      }
    } catch {
      toast.error("Erreur lors de l'ajout du créneau");
    }
  };

  const handleViewVersion = async (versionId: string) => {
    setViewingVersionId(versionId);
    setLoading(true);
    try {
      const res = await fetch(`/api/timetables?timetableId=${versionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setTimetable(data);
        } else {
          toast.error("Version non trouvée");
          setViewingVersionId(null);
        }
      } else {
        toast.error("Erreur lors du chargement de la version");
        setViewingVersionId(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement de la version");
      setViewingVersionId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      if (selectedClassId) {
        const allRes = await fetch(`/api/timetables?institutionId=${institutionId}`);
        if (allRes.ok) {
          const allTt = await allRes.json();
          const classTimetables = allTt.filter(
            (tt: { classId: string; isActive: boolean; id: string }) =>
              tt.classId === selectedClassId && tt.isActive
          );
          for (const tt of classTimetables) {
            if (tt.id !== versionId) {
              await fetch("/api/timetables", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: tt.id, isActive: false }),
              });
            }
          }
        }
      }

      const res = await fetch("/api/timetables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: versionId, isActive: true }),
      });

      if (res.ok) {
        toast.success("Version restaurée ✓");
        setViewingVersionId(null);
        loadTimetable();
        loadVersions();
      } else {
        toast.error("Erreur lors de la restauration");
      }
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  // Group slots by day (all slots for grid structure)
  const allSlotsByDay: Record<number, TimetableSlotData[]> = {};
  const slotsByDay: Record<number, TimetableSlotData[]> = {};
  if (timetable?.slots) {
    for (const slot of timetable.slots) {
      if (!allSlotsByDay[slot.dayOfWeek]) allSlotsByDay[slot.dayOfWeek] = [];
      allSlotsByDay[slot.dayOfWeek].push(slot);

      if (currentSemester && slot.subject) {
        const subjectInfo = subjects.find(s => s.id === slot.subject?.id);
        if (subjectInfo?.semester && subjectInfo.semester !== currentSemester) {
          continue;
        }
      }
      if (!slotsByDay[slot.dayOfWeek]) slotsByDay[slot.dayOfWeek] = [];
      slotsByDay[slot.dayOfWeek].push(slot);
    }
  }

  const days = Object.keys(allSlotsByDay)
    .map(Number)
    .sort((a, b) => a - b);
  const allTimes = timetable?.slots
    ? [...new Set(timetable.slots.map((s) => `${s.startTime}-${s.endTime}`))].sort()
    : [];

  // Calculate subject hours (from filtered slots)
  const subjectHours = new Map<string, { name: string; hours: number }>();
  for (const daySlots of Object.values(slotsByDay)) {
    for (const slot of daySlots) {
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

  // Quick Stats computations
  const totalSlots = timetable?.slots?.length || 0;
  const totalConflicts = (conflicts?.teacherConflicts?.length || 0) + (conflicts?.roomConflicts?.length || 0);
  const totalGridCells = days.length * allTimes.length;
  const coveragePercent = totalGridCells > 0 ? Math.round((totalSlots / totalGridCells) * 100) : 0;
  const uniqueSubjects = subjectHours.size;

  // Current time indicator
  const getCurrentTimePosition = useCallback(() => {
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

    // Find which time slot row we're in
    for (let i = 0; i < allTimes.length; i++) {
      const [start, end] = allTimes[i].split("-");
      if (timeStr >= start && timeStr < end) {
        // Calculate position within the slot
        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        const nowMin = currentHour * 60 + currentMinute;
        const pct = (nowMin - startMin) / (endMin - startMin);
        return { rowIndex: i, dayIndex: days.indexOf(currentDay), pct, isToday: days.includes(currentDay) };
      }
    }
    return null;
  }, [allTimes, days]);

  const currentTimePos = getCurrentTimePosition();

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const slotId = active.id as string;
    setActiveSlotId(slotId);
    const slot = timetable?.slots.find((s) => s.id === slotId);
    if (slot) {
      setActiveSlotData(slot);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSlotId(null);
    setActiveSlotData(null);

    if (!over || !active) return;
    const slotId = active.id as string;
    const overData = over.data.current;
    if (!overData) return;

    const { dayOfWeek: targetDay, startTime: targetStart, endTime: targetEnd } = overData as { dayOfWeek: number; startTime: string; endTime: string };
    const sourceSlot = timetable?.slots.find((s) => s.id === slotId);
    if (!sourceSlot) return;

    if (sourceSlot.dayOfWeek === targetDay && sourceSlot.startTime === targetStart && sourceSlot.endTime === targetEnd) return;

    if (viewingVersionId) {
      toast.error("Impossible de déplacer un créneau en version historique");
      return;
    }

    const undoEntry: UndoEntry = {
      slotId,
      actionType: "move",
      previousValues: {
        teacherId: sourceSlot.teacher?.id || null,
        roomId: sourceSlot.room?.id || null,
        dayOfWeek: sourceSlot.dayOfWeek,
        startTime: sourceSlot.startTime,
        endTime: sourceSlot.endTime,
      },
      newValues: {
        teacherId: sourceSlot.teacher?.id || null,
        roomId: sourceSlot.room?.id || null,
        dayOfWeek: targetDay,
        startTime: targetStart,
        endTime: targetEnd,
      },
    };

    try {
      const res = await fetch("/api/timetables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          dayOfWeek: targetDay,
          startTime: targetStart,
          endTime: targetEnd,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const dragConflicts = result.conflicts as string[];

        if (dragConflicts && dragConflicts.length > 0) {
          setPendingMove({ slotId, dayOfWeek: targetDay, startTime: targetStart, endTime: targetEnd });
          setConflictMessages(dragConflicts);
          setConflictDialogOpen(true);
        } else {
          pushUndo(undoEntry);
          toast.success("Créneau déplacé ✓");
          loadTimetable();
        }
      } else {
        toast.error("Erreur lors du déplacement");
      }
    } catch {
      toast.error("Erreur lors du déplacement");
    }
  };

  const handleConflictConfirm = () => {
    setConflictDialogOpen(false);
    setConflictMessages([]);
    setPendingMove(null);
    if (pendingMove) {
      pushUndo({
        slotId: pendingMove.slotId,
        actionType: "move",
        previousValues: {
          teacherId: activeSlotData?.teacher?.id || null,
          roomId: activeSlotData?.room?.id || null,
          dayOfWeek: activeSlotData?.dayOfWeek || 0,
          startTime: activeSlotData?.startTime || "",
          endTime: activeSlotData?.endTime || "",
        },
        newValues: {
          teacherId: activeSlotData?.teacher?.id || null,
          roomId: activeSlotData?.room?.id || null,
          dayOfWeek: pendingMove.dayOfWeek,
          startTime: pendingMove.startTime,
          endTime: pendingMove.endTime,
        },
      });
    }
    toast.success("Créneau déplacé (conflit détecté) ⚠");
    loadTimetable();
    setActiveSlotData(null);
  };

  const handleConflictCancel = async () => {
    if (pendingMove && activeSlotData) {
      try {
        await fetch("/api/timetables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId: pendingMove.slotId,
            dayOfWeek: activeSlotData.dayOfWeek,
            startTime: activeSlotData.startTime,
            endTime: activeSlotData.endTime,
          }),
        });
        toast.info("Déplacement annulé ✓");
      } catch {
        toast.error("Erreur lors de l'annulation");
      }
    }
    setConflictDialogOpen(false);
    setConflictMessages([]);
    setPendingMove(null);
    setActiveSlotData(null);
    loadTimetable();
  };

  const dndEnabled = !viewingVersionId;

  const viewModeTabs = [
    { id: "class" as TimetableViewMode, label: "Par classe", icon: Users, count: classes.length, countLabel: `${classes.length} classe${classes.length !== 1 ? "s" : ""}` },
    { id: "teacher" as TimetableViewMode, label: "Par enseignant", icon: UserCheck, count: teachers.length, countLabel: `${teachers.length} enseignant${teachers.length !== 1 ? "s" : ""}` },
    { id: "room" as TimetableViewMode, label: "Par salle", icon: Building2, count: rooms.length, countLabel: `${rooms.length} salle${rooms.length !== 1 ? "s" : ""}` },
  ];

  // Handle conflict resolve
  const handleResolveConflict = (conflictType: "teacher" | "room", conflictDay: number, conflictTime: string) => {
    // Highlight slots that are in this conflict
    const matchingSlotIds: string[] = [];
    timetable?.slots?.forEach(slot => {
      if (slot.dayOfWeek === conflictDay && `${slot.startTime}-${slot.endTime}` === conflictTime) {
        matchingSlotIds.push(slot.id);
      }
    });
    setConflictHighlight(matchingSlotIds);
    setTimeout(() => setConflictHighlight([]), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Print title - hidden on screen, visible in print */}
      <div className="hidden print-title">
        <h1>{timetable?.name || "Emploi du temps"}</h1>
        <p>
          {institutionName && `${institutionName} — `}
          {timetable?.class?.name || ""}
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">Emploi du temps</h1>
          <p className="text-xs text-[#9A9898] mt-1 font-mono">
            Consultez et générez les emplois du temps
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Semester filter */}
          <Select value={currentSemester || "__all__"} onValueChange={(v) => setSemester(v === "__all__" ? null : v)}>
            <SelectTrigger className="w-[120px] text-xs font-mono rounded-none">
              <Calendar className="h-3 w-3 mr-1 text-[#9A9898]" />
              <SelectValue placeholder="Semestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              {[...new Set(subjects.filter(s => s.semester).map(s => s.semester!))]
                .sort()
                .map((sem) => (
                  <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          {timetableViewMode === "class" && (
            <Select value={selectedClassId || ""} onValueChange={(v) => setSelectedClassId(v)}>
              <SelectTrigger className="w-[180px] text-xs font-mono rounded-none">
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
              <SelectTrigger className="w-[200px] text-xs font-mono rounded-none">
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
              <SelectTrigger className="w-[180px] text-xs font-mono rounded-none">
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
                className="text-xs font-mono bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 rounded-none"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {generating ? "Génération..." : "Générer"}
              </Button>
              <Button
                onClick={handleGenerateAll}
                disabled={generatingAll}
                variant="outline"
                className="text-xs font-mono border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] rounded-none no-print"
              >
                <Zap className="h-3 w-3 mr-1 text-[#D97706]" />
                {generatingAll ? `${generateProgress.current}/${generateProgress.total}` : "Générer tout"}
              </Button>
            </>
          )}
          {/* Export Menu */}
          {timetable && (
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setExportOpen(!exportOpen)}
                className="text-xs font-mono border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] rounded-none"
              >
                <Download className="h-3 w-3 mr-1" />
                Exporter
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-[#FDFCFC] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] shadow-md w-52" style={{ borderRadius: 0 }}>
                    {/* Formats section */}
                    <div className="px-3 py-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                      <p className="text-[9px] text-[#9A9898] uppercase font-bold tracking-wider font-mono">Formats</p>
                    </div>
                    <button
                      onClick={() => { handleExportCSV(); setExportOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#2A2A2A] transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-[#9A9898]" />
                      CSV
                    </button>
                    <button
                      onClick={handleExportPNG}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#2A2A2A] transition-colors"
                    >
                      <FileImage className="h-3.5 w-3.5 text-[#9A9898]" />
                      PNG
                      {exporting && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#2A2A2A] transition-colors"
                    >
                      <FileDown className="h-3.5 w-3.5 text-[#9A9898]" />
                      PDF
                    </button>
                    {/* Calendrier section */}
                    <div className="px-3 py-2 border-b border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                      <p className="text-[9px] text-[#9A9898] uppercase font-bold tracking-wider font-mono">Calendrier</p>
                    </div>
                    <button
                      onClick={handleExportICal}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#2A2A2A] transition-colors"
                    >
                      <CalendarSync className="h-3.5 w-3.5 text-[#9A9898]" />
                      iCal
                      {exporting && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                    </button>
                    {/* Share */}
                    <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                      <button
                        onClick={() => { handleShare(); setExportOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#2A2A2A] transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5 text-[#9A9898]" />
                        Partager
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handlePrint}
            disabled={!timetable}
            className="text-xs font-mono text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] rounded-none no-print"
          >
            <Printer className="h-3 w-3 mr-1" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Generation overlay */}
      {generating && (
        <div className="border border-[#201D1D] dark:border-[#FDFCFC] p-6 no-print bg-[#FDFCFC]/95 dark:bg-[#1A1A1A]/95 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#D97706]" />
              <span className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                Génération en cours...
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={handleCancelGeneration}
              className="text-xs font-mono text-[#9A9898] hover:text-[#DC2626] rounded-none"
            >
              <X className="h-3 w-3 mr-1" />
              Annuler
            </Button>
          </div>
          <div className="space-y-2 font-mono">
            {GENERATION_MESSAGES.map((msg, i) => (
              <div
                key={i}
                className={`text-xs transition-all duration-500 ${
                  i <= genMessageIndex
                    ? i === GENERATION_MESSAGES.length - 1 && genMessageIndex === GENERATION_MESSAGES.length - 1
                      ? "text-[#D97706] font-bold"
                      : "text-[#201D1D] dark:text-[#FDFCFC]"
                    : "text-[#9A9898]/30"
                }`}
              >
                {i <= genMessageIndex ? msg : msg.substring(0, 3) + "···"}
                {i === genMessageIndex && i < GENERATION_MESSAGES.length - 1 && (
                  <span className="animate-pulse ml-1">▌</span>
                )}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1 bg-[#E5E5E5] dark:bg-[#2A2A2A] w-full">
            <div
              className="h-full bg-[#D97706] transition-all duration-700"
              style={{ width: `${((genMessageIndex + 1) / GENERATION_MESSAGES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Generation result summary */}
      {genResult && !generating && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 no-print">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
              Résultat de la génération
            </p>
            <button
              onClick={() => setGenResult(null)}
              className="text-[10px] text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] font-mono"
            >
              Fermer ✕
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9A9898] font-mono">Score:</span>
              <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                {genResult.score ?? "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9A9898] font-mono">Conflits:</span>
              <span className={`text-xs font-bold font-mono ${genResult.conflictsCount > 0 ? "text-[#DC2626]" : "text-emerald-600"}`}>
                {genResult.conflictsCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9A9898] font-mono">Créneaux:</span>
              <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                {timetable?.slots?.length || 0}
              </span>
            </div>
          </div>
          {genResult.unassignedSubjects.length > 0 && (
            <div className="mt-3 border border-[#D97706]/30 bg-[#D97706]/5 dark:bg-[#D97706]/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3 w-3 text-[#D97706]" />
                <span className="text-[10px] text-[#D97706] font-bold font-mono">
                  Matières non attribuées ({genResult.unassignedSubjects.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {genResult.unassignedSubjects.map((name, i) => (
                  <span key={i} className="text-[10px] font-mono bg-[#D97706]/10 text-[#D97706] px-1.5 py-0.5 border border-[#D97706]/20" style={{ borderRadius: 0 }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate all progress */}
      {generatingAll && (
        <div className="border border-[#D97706]/30 bg-[#D97706]/5 dark:bg-[#D97706]/10 p-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-[#D97706]" />
            <span className="text-xs text-[#D97706] font-bold font-mono">
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

      {/* Improved View Mode Switcher */}
      <div className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FDFCFC] dark:bg-[#0A0A0A] no-print">
        <div className="flex items-center gap-0">
          {viewModeTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = timetableViewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTimetableViewMode(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 transition-all duration-150 ${
                  isActive
                    ? "border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] font-bold bg-[#F8F7F7]/50 dark:bg-[#1A1A1A]/50"
                    : "border-transparent text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7]/30 dark:hover:bg-[#1A1A1A]/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className={`text-[9px] px-1.5 py-0.5 font-mono ${
                  isActive
                    ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]"
                    : "bg-[#E5E5E5] dark:bg-[#2A2A2A] text-[#9A9898]"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conflict Alert Bar */}
      {totalConflicts > 0 && !generating && (
        <div className="border border-[#DC2626]/30 bg-[#DC2626]/5 dark:bg-[#DC2626]/10 no-print">
          <button
            onClick={() => setConflictAlertExpanded(!conflictAlertExpanded)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
              <span className="text-xs font-bold font-mono text-[#DC2626]">
                {totalConflicts} conflit{totalConflicts !== 1 ? "s" : ""} détecté{totalConflicts !== 1 ? "s" : ""}
              </span>
              <span className="text-[10px] font-mono text-[#DC2626]/70">
                — Cliquez pour {conflictAlertExpanded ? "masquer" : "voir les détails"}
              </span>
            </div>
            {conflictAlertExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#DC2626]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#DC2626]" />
            )}
          </button>
          {conflictAlertExpanded && (
            <div className="px-4 pb-3 space-y-2 max-h-64 overflow-y-auto">
              {conflicts?.teacherConflicts.map((c, i) => (
                <div key={`tc-${i}`} className="flex items-start justify-between gap-2 p-2 bg-[#FDFCFC]/50 dark:bg-[#0A0A0A]/50 border-l-2 border-l-[#DC2626]">
                  <div className="text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3 w-3 text-[#DC2626]" />
                      <span className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{c.teacherName}</span>
                    </div>
                    <p className="text-[#9A9898] mt-0.5">
                      {dayNames[c.dayOfWeek]} {c.time} — {c.classes.join(" vs ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolveConflict("teacher", c.dayOfWeek, c.time)}
                    className="text-[10px] font-mono font-bold text-[#D97706] hover:text-[#D97706] px-2 py-1 border border-[#D97706]/30 hover:bg-[#D97706]/5 whitespace-nowrap"
                    style={{ borderRadius: 0 }}
                  >
                    Résoudre
                  </button>
                </div>
              ))}
              {conflicts?.roomConflicts.map((c, i) => (
                <div key={`rc-${i}`} className="flex items-start justify-between gap-2 p-2 bg-[#FDFCFC]/50 dark:bg-[#0A0A0A]/50 border-l-2 border-l-[#D97706]">
                  <div className="text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-[#D97706]" />
                      <span className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{c.roomName}</span>
                    </div>
                    <p className="text-[#9A9898] mt-0.5">
                      {dayNames[c.dayOfWeek]} {c.time} — {c.classes.join(" vs ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolveConflict("room", c.dayOfWeek, c.time)}
                    className="text-[10px] font-mono font-bold text-[#D97706] hover:text-[#D97706] px-2 py-1 border border-[#D97706]/30 hover:bg-[#D97706]/5 whitespace-nowrap"
                    style={{ borderRadius: 0 }}
                  >
                    Résoudre
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historical version notice */}
      {viewingVersionId && (
        <div className="border border-[#D97706]/30 bg-[#D97706]/5 dark:bg-[#D97706]/10 p-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-[#D97706]" />
            <span className="text-xs text-[#D97706] font-bold font-mono">Version historique (lecture seule)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => handleRestoreVersion(viewingVersionId)}
              className="text-xs text-[#D97706] hover:text-[#D97706] font-mono rounded-none"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restaurer cette version
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setViewingVersionId(null); loadTimetable(); }}
              className="text-xs text-[#646262] font-mono rounded-none"
            >
              Retour à la version active
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {classes.length === 0 && timetableViewMode === "class" ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <Users className="h-10 w-10 text-[#9A9898]" />
            <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold font-mono">Aucune classe configurée</p>
            <p className="text-xs text-[#9A9898] font-mono">Créez d&apos;abord des classes pour commencer.</p>
          </div>
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
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 border-2 border-dashed border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-center">
              <Calendar className="h-8 w-8 text-[#9A9898]" />
            </div>
            <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold font-mono">Aucun emploi du temps</p>
          <p className="text-xs text-[#9A9898] font-mono">
            Cliquez sur &quot;Générer&quot; pour créer automatiquement l&apos;emploi du temps
          </p>
          {timetableViewMode === "class" && selectedClassId && (
            <Button
              onClick={handleGenerate}
              className="mt-2 text-xs font-mono bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 rounded-none"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Générer maintenant
            </Button>
          )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Stats Bar + timetable controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Quick Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-[#9A9898]" />
                <span className="text-[10px] text-[#9A9898] font-mono">Créneaux</span>
                <span className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">{totalSlots}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={`h-3 w-3 ${totalConflicts > 0 ? "text-[#DC2626]" : "text-[#9A9898]"}`} />
                <span className="text-[10px] text-[#9A9898] font-mono">Conflits</span>
                <span className={`text-xs font-bold font-mono ${totalConflicts > 0 ? "text-[#DC2626]" : "text-emerald-600"}`}>{totalConflicts}</span>
                {totalConflicts > 0 && (
                  <span className="w-1.5 h-1.5 bg-[#DC2626] animate-pulse" style={{ borderRadius: 0 }} />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-[#9A9898]" />
                <span className="text-[10px] text-[#9A9898] font-mono">Couverture</span>
                <span className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">{coveragePercent}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3 text-[#9A9898]" />
                <span className="text-[10px] text-[#9A9898] font-mono">Matières</span>
                <span className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">{uniqueSubjects}</span>
              </div>
            </div>
            {/* Timetable title + zoom + undo/redo */}
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                {timetable.name} — {timetable.class.name}
                {timetable.version > 1 && (
                  <span className="text-[#9A9898] font-normal ml-2">v{timetable.version}</span>
                )}
              </p>
              <div className="flex items-center gap-1 no-print">
                {!viewingVersionId && (
                  <>
                    <button
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className={`p-1.5 transition-colors relative ${
                        canUndo
                          ? "text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                          : "text-[#E5E5E5] dark:text-[#2A2A2A] cursor-not-allowed"
                      }`}
                      title="Annuler (Ctrl+Z)"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      {undoCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 text-[7px] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-1 py-0 font-bold leading-none font-mono">
                          {undoCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className={`p-1.5 transition-colors ${
                        canRedo
                          ? "text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                          : "text-[#E5E5E5] dark:text-[#2A2A2A] cursor-not-allowed"
                      }`}
                      title="Rétablir (Ctrl+Shift+Z)"
                    >
                      <Redo2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-4 bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-0.5" />
                  </>
                )}
                <button
                  onClick={() => setZoom(Math.max(70, zoom - 10))}
                  className="p-1.5 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                  title="Zoom arrière"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] text-[#9A9898] w-10 text-center font-mono">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(150, zoom + 10))}
                  className="p-1.5 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                  title="Zoom avant"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Timetable Grid */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto border border-[#E5E5E5] dark:border-[#2A2A2A] relative timetable-grid" ref={timetableRef}>
            <table className="w-full border-collapse min-w-[700px]" style={{ fontSize: `${zoom * 0.12}px` }}>
              <thead>
                <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                  <th className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold font-mono text-left w-24 text-[#201D1D] dark:text-[#FDFCFC]">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Horaire
                    </div>
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold font-mono text-center text-[#201D1D] dark:text-[#FDFCFC]"
                    >
                      {dayNames[day] || `Jour ${day}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTimes.map((time, timeIdx) => {
                  const [start, end] = time.split("-");
                  const isBreak = isBreakTime(start);
                  const isCurrentTimeRow = currentTimePos?.rowIndex === timeIdx;
                  return (
                    <tr
                      key={time}
                      className={`group ${isBreak ? "break-row" : ""} hover:bg-[#F8F7F7]/30 dark:hover:bg-[#1A1A1A]/30 transition-colors`}
                    >
                      <td className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-[10px] text-[#9A9898] whitespace-nowrap font-mono ${isBreak ? "bg-[#F8F7F7]/50 dark:bg-[#1A1A1A]/50" : ""}`}>
                        <div className="flex items-center gap-1">
                          {start} — {end}
                          {isBreak && <span className="text-[8px] font-bold text-[#D97706] ml-1 font-mono">PAUSE</span>}
                        </div>
                      </td>
                      {days.map((day, dayIdx) => {
                        const slot = slotsByDay[day]?.find(
                          (s) => `${s.startTime}-${s.endTime}` === time
                        );
                        const isCurrentTimeCell = isCurrentTimeRow && currentTimePos?.dayIndex === dayIdx && currentTimePos.isToday;
                        const isHighlighted = conflictHighlight.some(id => slot?.id === id);

                        if (!slot || !slot.subject) {
                          return (
                            <td
                              key={day}
                              className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-1 timetable-cell ${isBreak ? "break-row" : ""} relative`}
                            >
                              {isCurrentTimeCell && (
                                <div className="absolute left-0 right-0 top-0 h-0.5 bg-[#DC2626] z-10" />
                              )}
                              {dndEnabled ? (
                                <DroppableCell
                                  id={`drop-${day}-${time}`}
                                  data={{ dayOfWeek: day, startTime: start, endTime: end }}
                                  onClick={timetableViewMode === "class" && !viewingVersionId ? () => handleOpenAddSlot(day, start, end) : undefined}
                                >
                                  <div className="h-full min-h-[60px] flex items-center justify-center border border-dashed border-[#E5E5E5] dark:border-[#2A2A2A]/50 opacity-0 hover:opacity-100 transition-opacity">
                                    {timetableViewMode === "class" && !viewingVersionId && (
                                      <Plus className="h-3 w-3 text-[#9A9898]" />
                                    )}
                                  </div>
                                </DroppableCell>
                              ) : (
                                <div className="h-full min-h-[60px] border border-dashed border-[#E5E5E5] dark:border-[#2A2A2A]/50" />
                              )}
                            </td>
                          );
                        }
                        const slotColor = getSubjectColor(slot.subject.name, document.documentElement.classList.contains("dark"));
                        const isHovered = hoveredSlot === slot.id;
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <td
                            key={day}
                            className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-1 timetable-cell ${isBreak ? "break-row" : ""} relative ${isHighlighted ? "ring-2 ring-inset ring-[#DC2626] animate-pulse" : ""}`}
                          >
                            {isCurrentTimeCell && (
                              <div className="absolute left-0 right-0 top-0 h-0.5 bg-[#DC2626] z-10" />
                            )}
                            <Popover
                              open={isSelected}
                              onOpenChange={(open) => {
                                if (!open) setSelectedSlot(null);
                              }}
                            >
                              <PopoverTrigger asChild>
                                {dndEnabled ? (
                                  <DraggableSlot
                                    id={slot.id}
                                    data={{ slotId: slot.id, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime }}
                                  >
                                    <div
                                      style={{
                                        backgroundColor: slotColor.bg,
                                        borderLeftColor: slotColor.text,
                                        color: slotColor.text,
                                      }}
                                      className={`border-l-[3px] p-2 min-h-[60px] transition-all duration-150 timetable-slot-clickable relative group/slot ${
                                        isHovered || isSelected ? "ring-1 ring-inset ring-[#201D1D]/20 dark:ring-[#FDFCFC]/20" : ""
                                      } ${activeSlotId === slot.id ? "opacity-40" : ""}`}
                                      onMouseEnter={() => setHoveredSlot(slot.id)}
                                      onMouseLeave={() => setHoveredSlot(null)}
                                      onClick={() => setSelectedSlot(slot)}
                                    >
                                      <p className="text-xs font-bold truncate">
                                        {slot.subject.name}
                                      </p>
                                      {slot.subject.type && (
                                        <span className="text-[9px] opacity-70 uppercase font-mono">
                                          {slot.subject.type}
                                        </span>
                                      )}
                                      <div className="mt-1">
                                        {slot.teacher && (
                                          <p className="text-[10px] opacity-70 truncate">
                                            {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                                          </p>
                                        )}
                                        {slot.room && (
                                          <p className="text-[10px] opacity-70 truncate">
                                            {slot.room.name}
                                          </p>
                                        )}
                                      </div>
                                      {/* Drag hint tooltip */}
                                      {!viewingVersionId && (
                                        <div className="absolute bottom-1 right-1 opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
                                          <GripVertical className="h-2.5 w-2.5 opacity-40" />
                                        </div>
                                      )}
                                    </div>
                                  </DraggableSlot>
                                ) : (
                                  <div
                                    style={{
                                      backgroundColor: slotColor.bg,
                                      borderLeftColor: slotColor.text,
                                      color: slotColor.text,
                                    }}
                                    className={`border-l-[3px] p-2 min-h-[60px] transition-all duration-150 timetable-slot-clickable ${
                                      isHovered || isSelected ? "ring-1 ring-inset ring-[#201D1D]/20 dark:ring-[#FDFCFC]/20" : ""
                                    }`}
                                    onMouseEnter={() => setHoveredSlot(slot.id)}
                                    onMouseLeave={() => setHoveredSlot(null)}
                                    onClick={() => setSelectedSlot(slot)}
                                  >
                                    <p className="text-xs font-bold truncate">
                                      {slot.subject.name}
                                    </p>
                                    {slot.subject.type && (
                                      <span className="text-[9px] opacity-70 uppercase font-mono">
                                        {slot.subject.type}
                                      </span>
                                    )}
                                    <div className="mt-1">
                                      {slot.teacher && (
                                        <p className="text-[10px] opacity-70 truncate">
                                          {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                                        </p>
                                      )}
                                      {slot.room && (
                                        <p className="text-[10px] opacity-70 truncate">
                                          {slot.room.name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-64 p-0 border-[#E5E5E5] dark:border-[#2A2A2A]"
                                side="right"
                                align="start"
                                style={{ borderRadius: 0 }}
                              >
                                <div className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] px-4 py-3">
                                  <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                                    {slot.subject.name}
                                  </p>
                                  {slot.subject.type && (
                                    <span className="text-[10px] text-[#9A9898] uppercase font-mono">{slot.subject.type}</span>
                                  )}
                                </div>
                                <div className="px-4 py-3 space-y-2">
                                  {slot.teacher && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-[#9A9898] font-mono">Enseignant</span>
                                      <button
                                        onClick={() => {
                                          setSelectedSlot(null);
                                          setTimetableViewMode("teacher");
                                          setSelectedTeacherId(slot.teacher!.id);
                                        }}
                                        className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold hover:underline flex items-center gap-1 font-mono"
                                      >
                                        {slot.teacher.firstName} {slot.teacher.lastName}
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  {slot.room && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-[#9A9898] font-mono">Salle</span>
                                      <button
                                        onClick={() => {
                                          setSelectedSlot(null);
                                          setTimetableViewMode("room");
                                          setSelectedRoomId(slot.room!.id);
                                        }}
                                        className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold hover:underline flex items-center gap-1 font-mono"
                                      >
                                        {slot.room.name}
                                        {slot.room.type && <span className="text-[10px] text-[#9A9898] font-normal ml-1">({slot.room.type})</span>}
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-[#9A9898] font-mono">Horaire</span>
                                    <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                                      {start} — {end}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-[#9A9898] font-mono">Jour</span>
                                    <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                                      {dayNames[slot.dayOfWeek] || `Jour ${slot.dayOfWeek}`}
                                    </span>
                                  </div>
                                </div>
                                {/* Edit/Delete buttons */}
                                {!viewingVersionId && (
                                  <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] px-4 py-2 flex gap-2">
                                    <button
                                      onClick={handleEditSlot}
                                      className="flex-1 flex items-center justify-center gap-1 text-[10px] text-[#201D1D] dark:text-[#FDFCFC] font-bold font-mono py-1.5 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Modifier
                                    </button>
                                    <button
                                      onClick={handleDeleteSlot}
                                      className="flex-1 flex items-center justify-center gap-1 text-[10px] text-[#DC2626] font-bold font-mono py-1.5 hover:bg-[#DC2626]/5 transition-colors"
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

            {/* DnD Drag Overlay */}
            <DragOverlay>
              {activeSlotId && activeSlotData ? (
                <DragOverlayContent
                  slot={{
                    subject: activeSlotData.subject,
                    teacher: activeSlotData.teacher,
                    room: activeSlotData.room,
                  }}
                  bgColor={getSubjectColor(activeSlotData.subject?.name || "", document.documentElement.classList.contains("dark")).bg}
                  textColor={getSubjectColor(activeSlotData.subject?.name || "", document.documentElement.classList.contains("dark")).text}
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Subject Hours Summary / Color Legend */}
          {subjectHours.size > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {Array.from(subjectHours.entries()).map(([subjectId, info]) => {
                const subjectColor = getSubjectColor(info.name, document.documentElement.classList.contains("dark"));
                return (
                  <div key={subjectId} className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 border-l-[3px]"
                      style={{ backgroundColor: subjectColor.bg, borderLeftColor: subjectColor.text, borderRadius: 0 }}
                    />
                    <span className="text-[10px] text-[#646262] font-mono">{info.name}</span>
                    <span className="text-[10px] text-[#9A9898] font-mono">({info.hours}h)</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Version History - improved timeline */}
          {versions.length > 1 && (
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 no-print">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-3.5 w-3.5 text-[#9A9898]" />
                <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                  Historique des versions
                </p>
                <span className="text-[9px] text-[#9A9898] font-mono ml-1">{versions.length} versions</span>
              </div>
              <div className="relative pl-4 space-y-0 max-h-64 overflow-y-auto">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
                {versions
                  .sort((a, b) => b.version - a.version)
                  .map((v, idx) => {
                    const currentSlotCount = v._count?.slots ?? 0;
                    const prevV = versions.sort((a2, b2) => b2.version - a2.version)[idx + 1];
                    const prevSlotCount = prevV?._count?.slots ?? 0;
                    const diff = currentSlotCount - prevSlotCount;
                    return (
                      <div
                        key={v.id}
                        className={`relative flex items-center justify-between py-2.5 px-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors ${
                          v.id === timetable?.id ? "bg-[#F8F7F7] dark:bg-[#1A1A1A]" : ""
                        }`}
                      >
                        {/* Timeline dot */}
                        <div className={`absolute left-[-21px] top-1/2 -translate-y-1/2 w-2 h-2 border ${
                          v.isActive
                            ? "bg-[#201D1D] dark:bg-[#FDFCFC] border-[#201D1D] dark:border-[#FDFCFC]"
                            : "bg-[#FDFCFC] dark:bg-[#1A1A1A] border-[#9A9898]"
                        }`} style={{ borderRadius: 0 }} />
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                            v{v.version}
                          </span>
                          <span className="text-[10px] text-[#9A9898] font-mono">
                            {new Date(v.createdAt).toLocaleDateString("fr-FR")} {new Date(v.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-[10px] text-[#9A9898] font-mono">
                            {currentSlotCount} créneau{currentSlotCount !== 1 ? "x" : ""}
                          </span>
                          {idx < versions.sort((a2, b2) => b2.version - a2.version).length - 1 && diff !== 0 && (
                            <span className={`text-[9px] font-mono font-bold ${diff > 0 ? "text-emerald-600" : "text-[#DC2626]"}`}>
                              {diff > 0 ? "+" : ""}{diff}
                            </span>
                          )}
                          {v.isActive && (
                            <span className="text-[10px] font-mono bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-1.5 py-0.5 font-bold" style={{ borderRadius: 0 }}>
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!v.isActive && (
                            <>
                              <button
                                onClick={() => handleViewVersion(v.id)}
                                className="text-[10px] font-mono text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] px-2 py-1 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                              >
                                <Eye className="h-3 w-3 inline mr-0.5" />
                                Voir
                              </button>
                              <button
                                onClick={() => handleRestoreVersion(v.id)}
                                className="text-[10px] font-mono text-[#D97706] hover:text-[#D97706] px-2 py-1 hover:bg-[#D97706]/5 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3 inline mr-0.5" />
                                Restaurer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
        <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold font-mono">Modifier le créneau</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Enseignant
              </label>
              <Select value={editSlotData.teacherId} onValueChange={(v) => setEditSlotData((prev) => ({ ...prev, teacherId: v }))}>
                <SelectTrigger className="text-xs font-mono rounded-none">
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
              <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Salle
              </label>
              <Select value={editSlotData.roomId} onValueChange={(v) => setEditSlotData((prev) => ({ ...prev, roomId: v }))}>
                <SelectTrigger className="text-xs font-mono rounded-none">
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
            <Button variant="ghost" onClick={() => setEditSlotOpen(false)} className="text-xs font-mono rounded-none">
              Annuler
            </Button>
            <Button
              onClick={handleSaveSlotEdit}
              className="text-xs font-mono bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 rounded-none"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DnD Conflict Confirmation Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#D97706]" />
              Conflit détecté
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-[#646262] dark:text-[#9A9898] font-mono">
              Le déplacement de ce créneau crée les conflits suivants:
            </p>
            <div className="space-y-2">
              {conflictMessages.map((msg, i) => (
                <div key={i} className="border border-[#D97706]/30 bg-[#D97706]/5 dark:bg-[#D97706]/10 p-2">
                  <p className="text-[10px] text-[#D97706] font-bold font-mono">{msg}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#9A9898] font-mono">
              Voulez-vous conserver ce déplacement malgré les conflits?
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleConflictCancel}
              className="text-xs font-mono rounded-none"
            >
              Annuler le déplacement
            </Button>
            <Button
              onClick={handleConflictConfirm}
              className="text-xs font-mono bg-[#D97706] text-white hover:opacity-80 border-0 rounded-none"
            >
              Conserver le déplacement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Slot Dialog */}
      <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
        <DialogContent className="max-w-sm" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold font-mono flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un créneau
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Time info display */}
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9A9898] uppercase font-bold tracking-wider font-mono">Jour</span>
                <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-mono font-bold">
                  {dayNames[addSlotData.dayOfWeek] || `Jour ${addSlotData.dayOfWeek}`}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-[#9A9898] uppercase font-bold tracking-wider font-mono">Horaire</span>
                <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-mono font-bold">
                  {addSlotData.startTime} — {addSlotData.endTime}
                </span>
              </div>
            </div>
            {/* Subject selection */}
            <div>
              <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Matière <span className="text-[#DC2626]">*</span>
              </label>
              <Select value={addSlotData.subjectId} onValueChange={(v) => setAddSlotData((prev) => ({ ...prev, subjectId: v }))}>
                <SelectTrigger className="text-xs font-mono rounded-none">
                  <SelectValue placeholder="> Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.code ? ` (${s.code})` : ""}{s.semester ? ` — ${s.semester}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Teacher selection */}
            <div>
              <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Enseignant
              </label>
              <Select value={addSlotData.teacherId} onValueChange={(v) => setAddSlotData((prev) => ({ ...prev, teacherId: v }))}>
                <SelectTrigger className="text-xs font-mono rounded-none">
                  <SelectValue placeholder="> Sélectionner un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Room selection */}
            <div>
              <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Salle
              </label>
              <Select value={addSlotData.roomId} onValueChange={(v) => setAddSlotData((prev) => ({ ...prev, roomId: v }))}>
                <SelectTrigger className="text-xs font-mono rounded-none">
                  <SelectValue placeholder="> Sélectionner une salle" />
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
            <Button variant="ghost" onClick={() => setAddSlotOpen(false)} className="text-xs font-mono rounded-none">
              Annuler
            </Button>
            <Button
              onClick={handleSaveAddSlot}
              disabled={!addSlotData.subjectId}
              className="text-xs font-mono bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 rounded-none"
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
