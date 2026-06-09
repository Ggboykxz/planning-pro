"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
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
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  X,
  Wrench,
  Users,
  LayoutGrid,
  List,
  Building2,
  Layers,
  BarChart3,
  Cpu,
} from "lucide-react";
import { roomTypes } from "@/lib/countries";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { Pagination } from "@/components/shared/Pagination";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";

interface RoomData {
  id: string;
  name: string;
  capacity: number | null;
  type: string | null;
  building: string | null;
  floor: string | null;
  equipment: string | null;
  timetableSlots: Array<{ id: string }>;
}

const predefinedEquipment = [
  "Projecteur",
  "Tableau blanc",
  "Tableau noir",
  "PCs",
  "Imprimante",
  "Scanner",
  "Vidéoprojecteur",
  "Écran tactile",
  "Microphone",
  "Système audio",
  "Caméra",
  "Wi-Fi",
  "Climatisation",
  "Ventilateurs",
  "Prises multiples",
  "Rétroprojecteur",
  "Labo chimie",
  "Labo physique",
  "Labo biologie",
  "Établis",
];

// Type badge color map
const ROOM_TYPE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  salle_normale: { bg: "#F3F4F6", text: "#374151", darkBg: "#1F2937", darkText: "#D1D5DB" },
  salle_td:      { bg: "#DBEAFE", text: "#1E40AF", darkBg: "#1E3A5F", darkText: "#93C5FD" },
  salle_info:    { bg: "#D1FAE5", text: "#065F46", darkBg: "#064E3B", darkText: "#6EE7B7" },
  labo:          { bg: "#DBEAFE", text: "#1E40AF", darkBg: "#1E3A5F", darkText: "#93C5FD" },
  amphi:         { bg: "#FEF3C7", text: "#92400E", darkBg: "#422006", darkText: "#FDE68A" },
};

function isDarkMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

interface RoomsViewProps {
  institutionId: string;
}

export function RoomsView({ institutionId }: RoomsViewProps) {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomData | null>(null);
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
    capacity: 30,
    type: "salle_normale",
    building: "",
    floor: "",
    equipment: [] as string[],
  });

  useEffect(() => {
    loadRooms();
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
    if (rooms.length >= 10 && viewMode === "cards") {
      setViewMode("table");
    } else if (rooms.length < 10 && rooms.length > 0 && viewMode === "table") {
      setViewMode("cards");
    }
  }, [rooms.length]);

  const loadRooms = async () => {
    try {
      const res = await fetch(`/api/rooms?institutionId=${institutionId}`);
      if (res.ok) setRooms(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingRoom(null);
    setForm({ name: "", capacity: 30, type: "salle_normale", building: "", floor: "", equipment: [] });
    setValidationErrors({});
    setDialogOpen(true);
  };

  const openEdit = (room: RoomData) => {
    setEditingRoom(room);
    let equipment: string[] = [];
    if (room.equipment) {
      try {
        equipment = JSON.parse(room.equipment);
      } catch {
        equipment = [];
      }
    }
    setForm({
      name: room.name,
      capacity: room.capacity || 30,
      type: room.type || "salle_normale",
      building: room.building || "",
      floor: room.floor || "",
      equipment,
    });
    setValidationErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    if (!form.name) errors.name = true;
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Le nom de la salle est requis");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...(editingRoom ? { id: editingRoom.id } : {}),
        institutionId,
        ...form,
        capacity: form.capacity || null,
        building: form.building || null,
        floor: form.floor || null,
        equipment: form.equipment.length > 0 ? form.equipment : null,
      };
      const res = await fetch("/api/rooms", {
        method: editingRoom ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editingRoom ? "Salle mise à jour ✓" : "Salle créée ✓");
        setDialogOpen(false);
        loadRooms();
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
      title: "Supprimer la salle",
      description: "Êtes-vous sûr de vouloir supprimer cette salle ? Cette action est irréversible.",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Salle supprimée ✓");
            loadRooms();
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
      title: `Supprimer ${selectedIds.size} salle(s)`,
      description: `Êtes-vous sûr de vouloir supprimer ${selectedIds.size} salle(s) ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          await Promise.all(
            Array.from(selectedIds).map((id) =>
              fetch(`/api/rooms?id=${id}`, { method: "DELETE" })
            )
          );
          toast.success(`${selectedIds.size} salle(s) supprimée(s) ✓`);
          setSelectedIds(new Set());
          loadRooms();
        } catch {
          toast.error("Erreur lors de la suppression");
        }
      },
    });
  };

  const getRoomTypeLabel = (type: string | null) => {
    return roomTypes.find((rt) => rt.value === type)?.label || type || "—";
  };

  const toggleEquipment = (item: string) => {
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter((e) => e !== item)
        : [...prev.equipment, item],
    }));
  };

  const removeEquipment = (item: string) => {
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((e) => e !== item),
    }));
  };

  const getEquipmentList = (equipment: string | null): string[] => {
    if (!equipment) return [];
    try {
      return JSON.parse(equipment);
    } catch {
      return [];
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredRooms = useMemo(() =>
    rooms.filter((r) =>
      `${r.name} ${r.building || ""} ${getRoomTypeLabel(r.type)}`.toLowerCase().includes(search.toLowerCase())
    ),
    [rooms, search]
  );

  // Stats
  const stats = useMemo(() => {
    const total = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const avgCapacity = total > 0 ? Math.round(totalCapacity / total) : 0;
    const equipmentCoverage = total > 0
      ? Math.round((rooms.filter((r) => getEquipmentList(r.equipment).length > 0).length / total) * 100)
      : 0;
    return { total, totalCapacity, avgCapacity, equipmentCoverage };
  }, [rooms]);

  // Max slots for utilization calculation (5 days * 8 slots per day = 40)
  const MAX_SLOTS = 40;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRooms = filteredRooms.slice(
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
    exportToCSV(filteredRooms, [
      { header: "Nom", accessor: (r: RoomData) => r.name },
      { header: "Type", accessor: (r: RoomData) => getRoomTypeLabel(r.type) },
      { header: "Capacité", accessor: (r: RoomData) => r.capacity || "" },
      { header: "Bâtiment", accessor: (r: RoomData) => r.building || "" },
      { header: "Étage", accessor: (r: RoomData) => r.floor || "" },
      { header: "Équipement", accessor: (r: RoomData) => getEquipmentList(r.equipment).join(", ") || "" },
      { header: "Utilisation", accessor: (r: RoomData) => `${r.timetableSlots.length} créneau${r.timetableSlots.length !== 1 ? "x" : ""}` },
    ], "salles");
    toast.success("CSV exporté ✓");
  };

  // ── Render: Type badge ───────────────────────────────────────────────

  const renderTypeBadge = (type: string | null) => {
    const label = getRoomTypeLabel(type);
    const tc = ROOM_TYPE_COLORS[type || ""] || ROOM_TYPE_COLORS.salle_normale;
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

  // ── Render: Utilization bar ──────────────────────────────────────────

  const renderUtilizationBar = (slotCount: number) => {
    const pct = Math.min((slotCount / MAX_SLOTS) * 100, 100);
    const label = slotCount > 0 ? `${Math.round(pct)}%` : "0%";
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-[#201D1D] dark:text-[#FDFCFC]">{label}</span>
        <div className="flex-1 h-1.5 bg-[#E5E5E5] dark:bg-[#2A2A2A] relative">
          <div
            className="absolute left-0 top-0 h-full bg-[#D97706] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] text-[#9A9898] font-mono">{slotCount}/{MAX_SLOTS}</span>
      </div>
    );
  };

  // ── Render: Stats bar ────────────────────────────────────────────────

  const renderStatsBar = () => (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <Building2 className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Salles</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.total}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <Users className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Capacité totale</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.totalCapacity}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <BarChart3 className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Capacité moy.</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.avgCapacity}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <Cpu className="h-3.5 w-3.5 text-[#D97706]" />
        <div>
          <p className="text-[10px] text-[#9A9898]">Couverture équip.</p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {stats.equipmentCoverage}%
          </p>
        </div>
      </div>
    </div>
  );

  // ── Render: Room card ────────────────────────────────────────────────

  const renderRoomCard = (room: RoomData) => {
    const usedSlots = room.timetableSlots.length;
    const equipList = getEquipmentList(room.equipment);
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
            checked={selectedIds.has(room.id)}
            onChange={() => toggleSelect(room.id)}
            className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
          />
        </div>

        {/* Header: Name + Type badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] leading-tight flex-1">
            {room.name}
          </h3>
          {renderTypeBadge(room.type)}
        </div>

        {/* Capacity */}
        <div className="flex items-center gap-1.5 text-xs text-[#646262] dark:text-[#9A9898] mb-3">
          <Users className="h-3 w-3 text-[#D97706]" />
          <span className="font-mono font-bold">{room.capacity || "—"}</span>
          <span>places</span>
        </div>

        {/* Building/Floor */}
        {(room.building || room.floor) && (
          <div className="flex items-center gap-2 text-[10px] text-[#646262] dark:text-[#9A9898] mb-3">
            {room.building && (
              <span className="flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5" />
                {room.building}
              </span>
            )}
            {room.floor && (
              <span className="flex items-center gap-1">
                <Layers className="h-2.5 w-2.5" />
                {room.floor}
              </span>
            )}
          </div>
        )}

        {/* Equipment tags */}
        {equipList.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {equipList.slice(0, 4).map((eq) => (
              <span
                key={eq}
                className="text-[9px] px-1.5 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] font-mono"
                style={{ borderRadius: 0 }}
              >
                {eq}
              </span>
            ))}
            {equipList.length > 4 && (
              <span className="text-[9px] text-[#9A9898] font-mono">
                +{equipList.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Utilization indicator */}
        <div className="mb-1">
          <span className="text-[10px] text-[#9A9898] block mb-1">Utilisation</span>
          {renderUtilizationBar(usedSlots)}
        </div>

        {/* Actions (show on hover) */}
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(room);
            }}
            className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
            title="Modifier"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(room.id);
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
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Salles</h1>
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
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Salles</h1>
          <p className="text-xs text-[#9A9898] mt-1">
            Gérez les salles et amphithéâtres
            {rooms.length > 0 && <span className="ml-1">({rooms.length})</span>}
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
            disabled={filteredRooms.length === 0}
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
            Ajouter une salle
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {rooms.length > 0 && renderStatsBar()}

      {/* Search & Bulk actions */}
      <div className="flex items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une salle..." />
        </div>
        {selectedIds.size > 0 && (
          <Button variant="ghost" onClick={handleBulkDelete} className="text-xs text-[#DC2626] hover:text-[#DC2626]">
            <Trash2 className="h-3 w-3 mr-1" />
            Supprimer ({selectedIds.size})
          </Button>
        )}
      </div>

      {filteredRooms.length === 0 ? (
        <EmptyState
          title={search ? "Aucun résultat" : "Aucune salle"}
          description={search ? "Essayez un autre terme de recherche" : "Ajoutez votre première salle"}
          step={2}
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
          {paginatedRooms.map((room) => (
            <div key={room.id}>{renderRoomCard(room)}</div>
          ))}
          {filteredRooms.length > pageSize && (
            <div className="col-span-full">
              <Pagination
                currentPage={safePage}
                pageSize={pageSize}
                totalItems={filteredRooms.length}
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
                    checked={selectedIds.size === paginatedRooms.length && paginatedRooms.length > 0}
                    onChange={() => {
                      if (selectedIds.size === paginatedRooms.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(paginatedRooms.map((r) => r.id)));
                      }
                    }}
                    className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                  />
                </th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Nom</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Type</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Capacité</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Bâtiment</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Étage</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Équipement</th>
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Utilisation</th>
                <th className="p-2 text-xs font-bold text-right text-[#201D1D] dark:text-[#FDFCFC]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRooms.map((room) => {
                const usedSlots = room.timetableSlots.length;
                return (
                  <tr
                    key={room.id}
                    className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(room.id)}
                        onChange={() => toggleSelect(room.id)}
                        className="h-3 w-3 accent-[#201D1D] dark:accent-[#FDFCFC]"
                      />
                    </td>
                    <td className="p-2 text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">{room.name}</td>
                    <td className="p-2 text-xs">{renderTypeBadge(room.type)}</td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{room.capacity || "—"}</td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{room.building || "—"}</td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{room.floor || "—"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-0.5">
                        {getEquipmentList(room.equipment).map((eq) => (
                          <span key={eq} className="text-[9px] px-1 py-0.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898]">
                            {eq}
                          </span>
                        ))}
                        {getEquipmentList(room.equipment).length === 0 && (
                          <span className="text-xs text-[#9A9898]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">
                      {usedSlots} créneau{usedSlots !== 1 ? "x" : ""}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(room)}
                          className="p-1.5 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(room.id)}
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
          <Pagination
            currentPage={safePage}
            pageSize={pageSize}
            totalItems={filteredRooms.length}
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
              {editingRoom ? "Modifier la salle" : "Nouvelle salle"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Section: Informations */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Informations
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
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
                  placeholder="Ex: Amphi 500, Salle B12"
                  className={`mt-1 ${validationErrors.name ? "border-[#DC2626] focus:border-[#DC2626]" : ""}`}
                  style={{ borderRadius: 0 }}
                />
                {validationErrors.name && (
                  <p className="text-[10px] text-[#DC2626] mt-1">Requis</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs font-bold">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                    <SelectTrigger className="mt-1" style={{ borderRadius: 0 }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((rt) => (
                        <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">
                    Capacité <span className="text-[#9A9898] font-normal">({form.capacity})</span>
                  </Label>
                  <div className="mt-2">
                    <Slider
                      value={[form.capacity]}
                      onValueChange={([v]) => setForm((prev) => ({ ...prev, capacity: v }))}
                      min={1}
                      max={500}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[9px] text-[#9A9898] mt-1 font-mono">
                      <span>1</span>
                      <span className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{form.capacity} places</span>
                      <span>500</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Localisation */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Localisation
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold">Bâtiment</Label>
                  <Input
                    value={form.building}
                    onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
                    placeholder="Ex: Bâtiment A"
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Étage</Label>
                  <Input
                    value={form.floor}
                    onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
                    placeholder="Ex: RDC, 1er"
                    className="mt-1"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>

            {/* Section: Equipment */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                  Équipement
                </span>
                <div className="flex-1 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              </div>
              {/* Selected equipment tags */}
              {form.equipment.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {form.equipment.map((eq) => (
                    <span
                      key={eq}
                      className="text-[10px] px-1.5 py-0.5 border border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold flex items-center gap-1"
                      style={{ borderRadius: 0 }}
                    >
                      {eq}
                      <button
                        type="button"
                        onClick={() => removeEquipment(eq)}
                        className="hover:opacity-70"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Visual equipment picker with checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
                {predefinedEquipment.map((item) => {
                  const isSelected = form.equipment.includes(item);
                  return (
                    <label
                      key={item}
                      className={`flex items-center gap-2 text-[10px] px-2 py-1.5 border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-[#D97706] bg-[#D97706]/10 text-[#D97706] font-bold"
                          : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:border-[#201D1D] dark:hover:border-[#FDFCFC]"
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleEquipment(item)}
                        className="h-3 w-3"
                      />
                      <span className="font-mono">{item}</span>
                    </label>
                  );
                })}
              </div>
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
              {saving ? "Enregistrement..." : editingRoom ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="rooms"
        institutionId={institutionId}
        onImported={() => loadRooms()}
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
