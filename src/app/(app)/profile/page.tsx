"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Lock,
  Shield,
  CreditCard,
  Trash2,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  institutionId?: string | null;
  plan: string;
}

export default function ProfilePage() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      // First try from store
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.name);
        setLoading(false);
        return;
      }

      // Fallback: fetch from API
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            setName(data.user.name);
            setCurrentUser(data.user);
          }
        }
      } catch {
        // Silently fail - profile will show loading state
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [currentUser, setCurrentUser]);

  const handleSave = async () => {
    if (!user) return;

    setMessage(null);

    // Validate passwords if changing
    if (newPassword) {
      if (!currentPassword) {
        setMessage({ type: "error", text: "Entrez votre mot de passe actuel pour le changer." });
        return;
      }
      if (newPassword.length < 6) {
        setMessage({ type: "error", text: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: name !== user.name ? name : undefined,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Erreur lors de la sauvegarde." });
        return;
      }

      // Update local state
      setUser(data.user);
      setCurrentUser(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Profil mis à jour avec succès." });
    } catch (error) {
      setMessage({ type: "error", text: "Erreur réseau. Réessayez." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-xs text-[#9A9898] font-mono">Chargement du profil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-[#9A9898] font-mono">Aucun utilisateur connecté</p>
        <Link
          href="/login"
          className="text-xs text-[#201D1D] dark:text-[#FDFCFC] border border-[#E5E5E5] dark:border-[#2A2A2A] px-4 py-2 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors font-mono"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const planLabels: Record<string, string> = {
    free: "Gratuit",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
          Profil
        </h1>
        <p className="text-xs text-[#9A9898] font-mono mt-1">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "border px-4 py-3 text-xs font-mono",
            message.type === "success"
              ? "border-green-500 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
              : "border-red-500 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Profile info */}
      <Card className="border-[#E5E5E5] dark:border-[#2A2A2A] shadow-none" style={{ borderRadius: 0 }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
            <User className="h-4 w-4" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex items-center justify-center border-2 border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-bold text-xl font-mono">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <p className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                {user.name}
              </p>
              <p className="text-xs text-[#9A9898] font-mono">{user.email}</p>
            </div>
          </div>

          <Separator className="bg-[#E5E5E5] dark:bg-[#2A2A2A]" />

          {/* Name field */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-[#9A9898]">Nom complet</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898]" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
                style={{ borderRadius: 0 }}
                placeholder="Votre nom"
              />
            </div>
          </div>

          {/* Email field (read-only) */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-[#9A9898]">Adresse email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898]" />
              <Input
                value={user.email}
                readOnly
                className="pl-9 pr-9 font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#9A9898] cursor-not-allowed"
                style={{ borderRadius: 0 }}
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898]" />
            </div>
            <p className="text-[10px] text-[#9A9898] font-mono">L&apos;email ne peut pas être modifié</p>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-[#9A9898]">Rôle</Label>
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-[#9A9898]" />
              <Badge
                variant="outline"
                className="font-mono text-[10px] border-[#E5E5E5] dark:border-[#2A2A2A]"
                style={{ borderRadius: 0 }}
              >
                {user.role === "admin" ? "Administrateur" : user.role === "manager" ? "Gestionnaire" : "Utilisateur"}
              </Badge>
            </div>
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-[#9A9898]">Plan actuel</Label>
            <div className="flex items-center gap-3">
              <CreditCard className="h-3.5 w-3.5 text-[#9A9898]" />
              <Badge
                variant="outline"
                className="font-mono text-[10px] border-[#E5E5E5] dark:border-[#2A2A2A]"
                style={{ borderRadius: 0 }}
              >
                {planLabels[user.plan] || user.plan}
              </Badge>
              {user.plan !== "pro" && user.plan !== "enterprise" && (
                <Link
                  href="/pricing"
                  className="text-[10px] font-mono text-[#201D1D] dark:text-[#FDFCFC] underline underline-offset-2 hover:opacity-70"
                >
                  Passer au Pro
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password change */}
      <Card className="border-[#E5E5E5] dark:border-[#2A2A2A] shadow-none" style={{ borderRadius: 0 }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Changer le mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current password */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-[#9A9898]">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-9 font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
                style={{ borderRadius: 0 }}
                placeholder="Entrez votre mot de passe actuel"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
              >
                {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-[#9A9898]">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-9 font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
                style={{ borderRadius: 0 }}
                placeholder="6 caractères minimum"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
              >
                {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-[#9A9898]">Confirmer le mot de passe</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
              style={{ borderRadius: 0 }}
              placeholder="Retapez le nouveau mot de passe"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-[#E5E5E5] dark:border-[#2A2A2A] shadow-none" style={{ borderRadius: 0 }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
            Préférences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC]">Thème par défaut</p>
              <p className="text-[10px] font-mono text-[#9A9898]">Sombre ou clair</p>
            </div>
            <span className="text-xs font-mono text-[#9A9898]">Paramètre système</span>
          </div>
          <Separator className="bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC]">Langue</p>
              <p className="text-[10px] font-mono text-[#9A9898]">Langue de l&apos;interface</p>
            </div>
            <span className="text-xs font-mono text-[#9A9898]">Français</span>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-mono text-xs border border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80"
          style={{ borderRadius: 0 }}
        >
          <Save className="h-3.5 w-3.5 mr-2" />
          {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
        </Button>
      </div>

      {/* Danger zone */}
      <Card className="border-red-300 dark:border-red-900 shadow-none" style={{ borderRadius: 0 }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold font-mono text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Zone dangereuse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC]">Supprimer le compte</p>
              <p className="text-[10px] font-mono text-[#9A9898]">
                Cette action est irréversible. Toutes vos données seront supprimées.
              </p>
            </div>
            {!deleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(true)}
                className="font-mono text-xs border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                style={{ borderRadius: 0 }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Supprimer
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(false)}
                  className="font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
                  style={{ borderRadius: 0 }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    // In a real app, this would call an API
                    alert("Fonctionnalité en cours de développement. Contactez le support pour supprimer votre compte.");
                    setDeleteConfirm(false);
                  }}
                  className="font-mono text-xs bg-red-600 hover:bg-red-700 text-white"
                  style={{ borderRadius: 0 }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Confirmer la suppression
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
