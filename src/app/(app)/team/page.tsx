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
  Users,
  Search,
  Plus,
  Shield,
  Pencil,
  Trash2,
  Mail,
  UserPlus,
  Loader2,
  Crown,
  Eye,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  plan?: string;
  joinedAt: string;
}

const roleConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: "Administrateur", color: "bg-[#201D1D] text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A]", icon: Crown },
  editor: { label: "Gestionnaire", color: "bg-[#D97706] text-white", icon: Pencil },
  viewer: { label: "Observateur", color: "bg-[#9A9898] text-white", icon: Eye },
};

export default function TeamPage() {
  const { institutionId, currentUser } = useAppStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite form
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "viewer" });
  // Edit role form
  const [editForm, setEditForm] = useState<{ userId: string; role: string; name: string }>({ userId: "", role: "", name: "" });

  const loadMembers = useCallback(async () => {
    if (!institutionId) return;
    try {
      const res = await fetch(`/api/team?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch {
      toast.error("Erreur lors du chargement de l'équipe");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Filtering
  const filtered = members.filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    if (roleFilter !== "all" && m.role !== roleFilter) return false;
    return true;
  });

  // Stats
  const adminCount = members.filter((m) => m.role === "admin").length;
  const editorCount = members.filter((m) => m.role === "editor").length;
  const viewerCount = members.filter((m) => m.role === "viewer").length;

  // Invite
  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.role) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          email: inviteForm.email,
          name: inviteForm.name || undefined,
          role: inviteForm.role,
        }),
      });
      if (res.ok) {
        toast.success("Membre invité ✓");
        setInviteOpen(false);
        setInviteForm({ email: "", name: "", role: "viewer" });
        loadMembers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'invitation");
      }
    } catch {
      toast.error("Erreur lors de l'invitation");
    } finally {
      setSubmitting(false);
    }
  };

  // Update role
  const handleUpdateRole = async () => {
    if (!editForm.userId || !editForm.role) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          userId: editForm.userId,
          role: editForm.role,
        }),
      });
      if (res.ok) {
        toast.success("Rôle mis à jour ✓");
        setEditRoleOpen(false);
        loadMembers();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  // Remove member
  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Retirer ${name} de l'équipe ?`)) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/team?institutionId=${institutionId}&userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Membre retiré ✓");
        loadMembers();
      } else {
        toast.error("Erreur lors du retrait");
      }
    } catch {
      toast.error("Erreur lors du retrait");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const isAdmin = currentUser?.role === "admin";

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
          <Users className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
          <div>
            <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              Gestion d&apos;équipe
            </h1>
            <p className="text-xs text-[#9A9898] mt-0.5">
              Gérez les membres et les rôles de votre équipe
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
          >
            <UserPlus className="h-3 w-3" />
            Inviter un membre
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{members.length}</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Membres totaux</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{adminCount}</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Administrateurs</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{editorCount}</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Gestionnaires</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{viewerCount}</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Observateurs</p>
        </div>
      </div>

      {/* Role descriptions */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
        <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-3">Rôles et permissions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(roleConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-start gap-2">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 shrink-0", config.color)}>
                  <Icon className="h-3 w-3 inline mr-1" />
                  {config.label}
                </span>
                <p className="text-[10px] text-[#9A9898]">
                  {key === "admin" && "Accès complet : gestion équipe, paramètres, facturation"}
                  {key === "editor" && "Créer/modifier emplois du temps, enseignants, salles"}
                  {key === "viewer" && "Consultation uniquement, pas de modification"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="pl-9 text-xs font-mono"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40 text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="admin">Administrateurs</SelectItem>
            <SelectItem value="editor">Gestionnaires</SelectItem>
            <SelectItem value="viewer">Observateurs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members table */}
      {filtered.length === 0 ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-12 text-center">
          <Users className="h-10 w-10 text-[#9A9898] mx-auto mb-3 opacity-30" />
          <p className="text-xs text-[#9A9898]">Aucun membre trouvé</p>
          <p className="text-[10px] text-[#9A9898] mt-1">
            Invitez des membres pour commencer à collaborer
          </p>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Membre</th>
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Email</th>
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Rôle</th>
                <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Rejoint</th>
                <th className="text-right p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => {
                const role = roleConfig[member.role] || roleConfig.viewer;
                const RoleIcon = role.icon;
                const isSelf = member.userId === currentUser?.id;
                const isLoading = actionLoading === member.userId;

                return (
                  <tr
                    key={member.id}
                    className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-bold text-xs">
                          {member.name ? member.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                          <span className="text-[#201D1D] dark:text-[#FDFCFC] font-bold">
                            {member.name}
                          </span>
                          {isSelf && (
                            <span className="text-[9px] text-[#9A9898] ml-1">(vous)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-[#646262] dark:text-[#9A9898]">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        {member.email}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1", role.color)}>
                        <RoleIcon className="h-2.5 w-2.5" />
                        {role.label}
                      </span>
                    </td>
                    <td className="p-3 text-[#646262] dark:text-[#9A9898]">
                      {formatDate(member.joinedAt)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-[#9A9898]" />}
                        {isAdmin && !isSelf && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-7 gap-1 text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                              disabled={isLoading}
                              onClick={() => {
                                setEditForm({ userId: member.userId, role: member.role, name: member.name });
                                setEditRoleOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                              Rôle
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-7 gap-1 text-[#9A9898] hover:text-[#DC2626]"
                              disabled={isLoading}
                              onClick={() => handleRemove(member.userId, member.name)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Retirer
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Inviter un membre
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Adresse email *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898]" />
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="collegue@etablissement.edu"
                  className="pl-9 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Nom (optionnel)</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Prénom Nom"
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Rôle *</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm((prev) => ({ ...prev, role: v }))}
              >
                <SelectTrigger className="mt-1 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Crown className="h-3 w-3" /> Administrateur
                    </span>
                  </SelectItem>
                  <SelectItem value="editor">
                    <span className="flex items-center gap-2">
                      <Pencil className="h-3 w-3" /> Gestionnaire
                    </span>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <span className="flex items-center gap-2">
                      <Eye className="h-3 w-3" /> Observateur
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A]">
              <p className="text-[10px] text-[#9A9898]">
                Le membre recevra un email d&apos;invitation pour rejoindre votre établissement. Si il n&apos;a pas encore de compte, un compte sera créé automatiquement.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleInvite}
              disabled={submitting || !inviteForm.email}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3" />
                  Envoyer l&apos;invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Changer le rôle de {editForm.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Nouveau rôle</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, role: v }))}
              >
                <SelectTrigger className="mt-1 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="editor">Gestionnaire</SelectItem>
                  <SelectItem value="viewer">Observateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRoleOpen(false)}
              className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={submitting}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Confirmer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
