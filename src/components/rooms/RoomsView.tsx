"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DoorOpen, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { roomTypes } from "@/lib/countries";
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
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
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
        toast.success(editingRoom ? "Salle mise à jour" : "Salle créée");
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

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette salle ?")) return;
    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Salle supprimée");
        loadRooms();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getRoomTypeLabel = (type: string | null) => {
    return roomTypes.find((rt) => rt.value === type)?.label || type || "—";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Salles</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Salles</h1>
          <p className="text-muted-foreground">
            Gérez les salles et amphithéâtres
          </p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une salle
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DoorOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucune salle</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez votre première salle
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacité</TableHead>
                    <TableHead>Bâtiment</TableHead>
                    <TableHead>Étage</TableHead>
                    <TableHead>Utilisation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => {
                    const usedSlots = room.timetableSlots.length;
                    return (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoomTypeLabel(room.type)}</Badge>
                        </TableCell>
                        <TableCell>{room.capacity || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {room.building || "—"}
                          </div>
                        </TableCell>
                        <TableCell>{room.floor || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={usedSlots > 0 ? "default" : "secondary"} className={usedSlots > 0 ? "bg-emerald-600" : ""}>
                            {usedSlots} créneau{usedSlots !== 1 ? "x" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(room)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(room.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Modifier la salle" : "Nouvelle salle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Amphi 500, Salle B12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacité</Label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bâtiment</Label>
                <Input
                  value={form.building}
                  onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
                  placeholder="Ex: Bâtiment A"
                />
              </div>
              <div>
                <Label>Étage</Label>
                <Input
                  value={form.floor}
                  onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
                  placeholder="Ex: RDC, 1er"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? "Enregistrement..." : editingRoom ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
