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
import { Sparkles, Printer, AlertTriangle, ZoomIn, ZoomOut, Clock, Download, FileText, Image, Zap, ExternalLink, Pencil, Trash2, Share2, History, RotateCcw, Undo2, Redo2, Plus, Calendar } from "lucide-react";
import { dayNames } from "@/lib/countries";
import { useAppStore, type TimetableViewMode } from "@/lib/store";
import { ContextBar } from "@/components/layout/ContextBar";
import { ConflictPanel } from "./ConflictPanel";
import { DraggableSlot, DroppableCell, DragOverlayContent } from "./DndSlotComponents";
import { toast } from "sonner";
import { useUndoRedo, type UndoEntry } from "@/hooks/useUndoRedo";

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

// Generation progress steps
const GENERATION_STEPS = [
  { label: "Analyse des contraintes...", duration: 600 },
  { label: "Attribution des enseignants...", duration: 800 },
  { label: "Attribution des salles...", duration: 700 },
  { label: "Optimisation...", duration: 1200 },
  { label: "Vérification des conflits...", duration: 500 },
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

  // Generation progress state (TASK 3)
  const [genProgressStep, setGenProgressStep] = useState(0);
  const [genProgressPercent, setGenProgressPercent] = useState(0);
  const [genProgressLabel, setGenProgressLabel] = useState("");
  const [genResult, setGenResult] = useState<{
    score: number | null;
    unassignedSubjects: string[];
    conflictsCount: number;
  } | null>(null);

  // Undo/Redo (TASK 2)
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
    if (viewingVersionId) return; // Don't reload when viewing a version
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

  // Clear undo stack when switching classes (TASK 2)
  useEffect(() => {
    clearStacks();
  }, [selectedClassId]);

  // Keyboard shortcuts for undo/redo (TASK 2)
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
  }, []);

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

  // TASK 3: Simulated progress steps for generation
  const simulateGenerationProgress = async (): Promise<void> => {
    const totalDuration = GENERATION_STEPS.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      setGenProgressStep(i);
      setGenProgressLabel(GENERATION_STEPS[i].label);
      const stepDuration = GENERATION_STEPS[i].duration;
      const startElapsed = elapsed;
      const endElapsed = elapsed + stepDuration;

      // Animate within this step
      const animSteps = 10;
      for (let j = 0; j <= animSteps; j++) {
        const currentElapsed = startElapsed + (stepDuration * j) / animSteps;
        const pct = Math.round((currentElapsed / totalDuration) * 100);
        setGenProgressPercent(pct);
        await new Promise((r) => setTimeout(r, stepDuration / animSteps));
      }
      elapsed = endElapsed;
    }
    setGenProgressPercent(100);
  };

  const handleGenerate = async () => {
    if (!selectedClassId) return;
    setGenerating(true);
    setGenResult(null);
    setGenProgressStep(0);
    setGenProgressPercent(0);
    setGenProgressLabel(GENERATION_STEPS[0].label);

    // Start simulated progress and API call in parallel
    const progressPromise = simulateGenerationProgress();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, classId: selectedClassId }),
      });
      const data = await res.json();

      // Wait for progress animation to complete
      await progressPromise;

      if (res.ok) {
        const score = data.score ?? null;
        const unassignedSubjects: string[] = data.unassignedSubjects || [];
        const conflictsCount = (data.teacherConflicts?.length || 0) + (data.roomConflicts?.length || 0);

        setGenResult({ score, unassignedSubjects, conflictsCount });

        toast.success(`Emploi du temps généré ✓ (score: ${score ?? "N/A"})`);
        setTimetable(data);
        loadConflicts();
        loadVersions();
        // Clear undo stack on regeneration (TASK 2)
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
    } catch {
      await progressPromise;
      setGenResult(null);
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
    // Clear undo stack on regeneration (TASK 2)
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
    // Push to undo stack before saving (TASK 2)
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
    // Push to undo stack before deleting (TASK 2)
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
    if (viewingVersionId) return; // Don't allow on historical versions
    if (timetableViewMode !== "class") return; // Only allow in class view
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
        const conflicts = result.conflicts as string[];
        if (conflicts && conflicts.length > 0) {
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

  // TASK 1: Fixed handleViewVersion - fetch timetable by ID directly
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

  // TASK 1: Fixed handleRestoreVersion - properly activate version and deactivate current
  const handleRestoreVersion = async (versionId: string) => {
    try {
      // First, deactivate ALL active timetables for this class
      if (selectedClassId) {
        const allRes = await fetch(`/api/timetables?institutionId=${institutionId}`);
        if (allRes.ok) {
          const allTt = await allRes.json();
          const classTimetables = allTt.filter(
            (tt: { classId: string; isActive: boolean; id: string }) =>
              tt.classId === selectedClassId && tt.isActive
          );
          // Deactivate all currently active timetables for this class
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

      // Now activate the target version
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

  // TASK 2: Undo handler
  const handleUndo = useCallback(async () => {
    const entry = undo();
    if (!entry) return;

    try {
      if (entry.actionType === "edit") {
        // Restore previous values
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
        // Recreate the deleted slot
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
        // Restore previous position (including dayOfWeek/startTime/endTime)
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
        // Re-apply the edit
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
        // Re-delete the slot
        await fetch("/api/timetables", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotId: entry.slotId }),
        });
        toast.success("Suppression rétablie ✓");
      } else if (entry.actionType === "move") {
        // Re-apply the move (including dayOfWeek/startTime/endTime)
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

  // Group slots by day (all slots for grid structure)
  const allSlotsByDay: Record<number, TimetableSlotData[]> = {};
  // Group slots by day - filter by semester if selected
  const slotsByDay: Record<number, TimetableSlotData[]> = {};
  if (timetable?.slots) {
    for (const slot of timetable.slots) {
      // Always build full grid structure
      if (!allSlotsByDay[slot.dayOfWeek]) allSlotsByDay[slot.dayOfWeek] = [];
      allSlotsByDay[slot.dayOfWeek].push(slot);

      // Filter by semester if currentSemester is set
      if (currentSemester && slot.subject) {
        const subjectInfo = subjects.find(s => s.id === slot.subject?.id);
        if (subjectInfo?.semester && subjectInfo.semester !== currentSemester) {
          continue; // Skip this slot - wrong semester
        }
      }
      if (!slotsByDay[slot.dayOfWeek]) slotsByDay[slot.dayOfWeek] = [];
      slotsByDay[slot.dayOfWeek].push(slot);
    }
  }

  // Get unique days and time slots - use full grid structure (unfiltered) for days/times
  const days = Object.keys(allSlotsByDay)
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
    // Only allow drops on empty cells (droppable targets)
    const slotId = active.id as string;
    const overData = over.data.current;
    if (!overData) return;

    const { dayOfWeek: targetDay, startTime: targetStart, endTime: targetEnd } = overData as { dayOfWeek: number; startTime: string; endTime: string };
    const sourceSlot = timetable?.slots.find((s) => s.id === slotId);
    if (!sourceSlot) return;

    // Don't do anything if dropped on same position
    if (sourceSlot.dayOfWeek === targetDay && sourceSlot.startTime === targetStart && sourceSlot.endTime === targetEnd) return;

    // Don't allow DnD on historical versions
    if (viewingVersionId) {
      toast.error("Impossible de déplacer un créneau en version historique");
      return;
    }

    // Push to undo stack before moving
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
        const conflicts = result.conflicts as string[];

        if (conflicts && conflicts.length > 0) {
          // Store the pending move and show conflict dialog
          setPendingMove({ slotId, dayOfWeek: targetDay, startTime: targetStart, endTime: targetEnd });
          setConflictMessages(conflicts);
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
    // User confirms despite conflict - the move is already done, just close dialog
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
    // Undo the move - revert the slot to its original position
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
          {/* Semester filter */}
          <Select value={currentSemester || "__all__"} onValueChange={(v) => setSemester(v === "__all__" ? null : v)}>
            <SelectTrigger className="w-[120px] text-xs">
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

      {/* TASK 3: Generation progress dialog */}
      {generating && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 no-print">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin h-4 w-4 border-2 border-[#201D1D] dark:border-[#FDFCFC] border-t-transparent" />
            <div className="flex-1">
              <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold block">
                {genProgressLabel}
              </span>
              <span className="text-[10px] text-[#9A9898]">
                Étape {genProgressStep + 1}/{GENERATION_STEPS.length}
              </span>
            </div>
            <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold font-mono">
              {genProgressPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full">
            <div
              className="h-full bg-[#201D1D] dark:bg-[#FDFCFC] transition-all duration-300"
              style={{ width: `${genProgressPercent}%` }}
            />
          </div>
          <div className="flex gap-1 mt-3">
            {GENERATION_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex-1 h-1 transition-colors duration-200 ${
                  i < genProgressStep
                    ? "bg-[#201D1D] dark:bg-[#FDFCFC]"
                    : i === genProgressStep
                    ? "bg-[#201D1D]/50 dark:bg-[#FDFCFC]/50"
                    : "bg-[#E5E5E5] dark:bg-[#2A2A2A]"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* TASK 3: Generation result summary */}
      {genResult && !generating && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 no-print">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              Résultat de la génération
            </p>
            <button
              onClick={() => setGenResult(null)}
              className="text-[10px] text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
            >
              Fermer
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9A9898]">Score:</span>
              <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                {genResult.score ?? "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9A9898]">Conflits:</span>
              <span className={`text-xs font-bold font-mono ${genResult.conflictsCount > 0 ? "text-[#DC2626]" : "text-emerald-600"}`}>
                {genResult.conflictsCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#9A9898]">Créneaux:</span>
              <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                {timetable?.slots?.length || 0}
              </span>
            </div>
          </div>
          {genResult.unassignedSubjects.length > 0 && (
            <div className="mt-3 border border-[#D97706]/30 bg-[#D97706]/5 dark:bg-[#D97706]/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3 w-3 text-[#D97706]" />
                <span className="text-[10px] text-[#D97706] font-bold">
                  Matières non attribuées ({genResult.unassignedSubjects.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {genResult.unassignedSubjects.map((name, i) => (
                  <span key={i} className="text-[10px] bg-[#D97706]/10 text-[#D97706] px-1.5 py-0.5 border border-[#D97706]/20">
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
          {/* Timetable title + zoom controls + undo/redo */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              {timetable.name} — {timetable.class.name}
              {timetable.version > 1 && (
                <span className="text-[#9A9898] font-normal ml-2">v{timetable.version}</span>
              )}
            </p>
            <div className="flex items-center gap-1 no-print">
              {/* TASK 2: Undo/Redo buttons */}
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
                      <span className="absolute -top-0.5 -right-0.5 text-[7px] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-1 py-0 font-bold leading-none">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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
                              {dndEnabled ? (
                                <DroppableCell
                                  id={`drop-${day}-${time}`}
                                  data={{ dayOfWeek: day, startTime: start, endTime: end }}
                                  onClick={timetableViewMode === "class" && !viewingVersionId ? () => handleOpenAddSlot(day, start, end) : undefined}
                                >
                                  <div className="h-full min-h-[60px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    {timetableViewMode === "class" && !viewingVersionId && (
                                      <Plus className="h-3 w-3 text-[#9A9898]" />
                                    )}
                                  </div>
                                </DroppableCell>
                              ) : (
                                <div className="h-full min-h-[60px]" />
                              )}
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
                                {dndEnabled ? (
                                  <DraggableSlot
                                    id={slot.id}
                                    data={{ slotId: slot.id, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime }}
                                  >
                                    <div
                                      className={`border-l-[3px] ${color.border} ${color.bg} p-2 min-h-[60px] transition-all duration-150 timetable-slot-clickable ${
                                        isHovered || isSelected ? "ring-1 ring-[#201D1D]/20 dark:ring-[#FDFCFC]/20" : ""
                                      } ${activeSlotId === slot.id ? "opacity-40" : ""}`}
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
                                  </DraggableSlot>
                                ) : (
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
                                )}
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

            {/* DnD Drag Overlay */}
            <DragOverlay>
              {activeSlotId && activeSlotData ? (
                <DragOverlayContent
                  slot={{
                    subject: activeSlotData.subject,
                    teacher: activeSlotData.teacher,
                    room: activeSlotData.room,
                  }}
                  colorClass={subjectColorPalette[subjectColorMap.get(activeSlotData.subject?.id || "") || 0]?.border || "border-l-gray-500"}
                  bgClass={subjectColorPalette[subjectColorMap.get(activeSlotData.subject?.id || "") || 0]?.bg || "bg-gray-50/50"}
                />
              ) : null}
            </DragOverlay>
          </DndContext>

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

          {/* TASK 1: Version History - enhanced with slot count */}
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
                        <span className="text-[10px] text-[#9A9898]">
                          {v._count?.slots ?? 0} créneau{(v._count?.slots ?? 0) !== 1 ? "x" : ""}
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

      {/* DnD Conflict Confirmation Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#D97706]" />
              Conflit détecté
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-[#646262] dark:text-[#9A9898]">
              Le déplacement de ce créneau crée les conflits suivants:
            </p>
            <div className="space-y-2">
              {conflictMessages.map((msg, i) => (
                <div key={i} className="border border-[#D97706]/30 bg-[#D97706]/5 dark:bg-[#D97706]/10 p-2">
                  <p className="text-[10px] text-[#D97706] font-bold">{msg}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#9A9898]">
              Voulez-vous conserver ce déplacement malgré les conflits?
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleConflictCancel}
              className="text-xs"
            >
              Annuler le déplacement
            </Button>
            <Button
              onClick={handleConflictConfirm}
              className="text-xs bg-[#D97706] text-white hover:opacity-80 border-0"
            >
              Conserver le déplacement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Slot Dialog */}
      <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un créneau
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Time info display */}
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9A9898] uppercase font-bold tracking-wider">Jour</span>
                <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-mono font-bold">
                  {dayNames[addSlotData.dayOfWeek] || `Jour ${addSlotData.dayOfWeek}`}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-[#9A9898] uppercase font-bold tracking-wider">Horaire</span>
                <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-mono font-bold">
                  {addSlotData.startTime} — {addSlotData.endTime}
                </span>
              </div>
            </div>
            {/* Subject selection */}
            <div>
              <label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Matière <span className="text-[#DC2626]">*</span>
              </label>
              <Select value={addSlotData.subjectId} onValueChange={(v) => setAddSlotData((prev) => ({ ...prev, subjectId: v }))}>
                <SelectTrigger className="text-xs font-mono">
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
              <label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Enseignant
              </label>
              <Select value={addSlotData.teacherId} onValueChange={(v) => setAddSlotData((prev) => ({ ...prev, teacherId: v }))}>
                <SelectTrigger className="text-xs font-mono">
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
              <label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-1 block">
                Salle
              </label>
              <Select value={addSlotData.roomId} onValueChange={(v) => setAddSlotData((prev) => ({ ...prev, roomId: v }))}>
                <SelectTrigger className="text-xs font-mono">
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
            <Button variant="ghost" onClick={() => setAddSlotOpen(false)} className="text-xs">
              Annuler
            </Button>
            <Button
              onClick={handleSaveAddSlot}
              disabled={!addSlotData.subjectId}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
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
