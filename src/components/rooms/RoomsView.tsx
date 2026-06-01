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
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { roomTypes } from "@/lib/countries";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { toast } from "sonner";

interface RoomData {
  id: string;
  name: string;
  capacity: number | null;
  type: string | null;
  building: string | null;
  floor: string | null;
  timetableSlots: Array<{ id: string }>;
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
    setForm({ name: "", capacity: 30, type: "salle_normale", building: "", floor: "" });
    setValidationErrors({});
    setDialogOpen(true);
  };

  const openEdit = (room: RoomData) => {
    setEditingRoom(room);
    setForm({
      name: room.name,
      capacity: room.capacity || 30,
      type: room.type || "salle_normale",
      building: room.building || "",
      floor: room.floor || "",
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
          for (const id of selectedIds) {
            await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
          }
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredRooms = rooms.filter((r) =>
    `${r.name} ${r.building || ""} ${getRoomTypeLabel(r.type)}`.toLowerCase().includes(search.toLowerCase())
  );

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
      ) : (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC] w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredRooms.length && filteredRooms.length > 0}
                    onChange={() => {
                      if (selectedIds.size === filteredRooms.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredRooms.map((r) => r.id)));
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
                <th className="p-2 text-xs font-bold text-left text-[#201D1D] dark:text-[#FDFCFC]">Utilisation</th>
                <th className="p-2 text-xs font-bold text-right text-[#201D1D] dark:text-[#FDFCFC]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => {
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
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{getRoomTypeLabel(room.type)}</td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{room.capacity || "—"}</td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{room.building || "—"}</td>
                    <td className="p-2 text-xs text-[#646262] dark:text-[#9A9898]">{room.floor || "—"}</td>
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
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingRoom ? "Modifier la salle" : "Nouvelle salle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              />
              {validationErrors.name && (
                <p className="text-[10px] text-[#DC2626] mt-1">Requis</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Capacité</Label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm((prev) => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Bâtiment</Label>
                <Input
                  value={form.building}
                  onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
                  placeholder="Ex: Bâtiment A"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Étage</Label>
                <Input
                  value={form.floor}
                  onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
                  placeholder="Ex: RDC, 1er"
                  className="mt-1"
                />
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
