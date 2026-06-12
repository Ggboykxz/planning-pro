"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { ScrollText, ChevronLeft, ChevronRight, Search, Filter, FileX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface AuditLog {
  id: string;
  userId?: string | null;
  institutionId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  userName: string;
}

const actionColors: Record<string, string> = {
  create: "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
  update: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  delete: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
  login: "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
  export: "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
};

const actionLabels: Record<string, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  login: "Connexion",
  export: "Export",
};

const entityLabels: Record<string, string> = {
  user: "Utilisateur",
  institution: "Établissement",
  teacher: "Enseignant",
  room: "Salle",
  subject: "Matière",
  class: "Classe",
  timetable: "Emploi du temps",
  timetableSlot: "Créneau",
};

export default function AuditPage() {
  const { institutionId } = useAppStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (institutionId) params.set("institutionId", institutionId);
      if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
      if (entityFilter && entityFilter !== "all") params.set("entity", entityFilter);
      params.set("limit", limit.toString());
      params.set("offset", offset.toString());

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch {
      // Silently fail - audit logs will be empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [institutionId, actionFilter, entityFilter, offset]);

  // Filter by search term client-side
  const filteredLogs = searchTerm
    ? logs.filter((log) =>
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <ScrollText className="h-5 w-5 text-[#9A9898]" />
        <div>
          <h1 className="text-lg font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
            Journal d&apos;activité
          </h1>
          <p className="text-xs text-[#9A9898] font-mono mt-0.5">
            Historique de toutes les actions effectuées
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-[#E5E5E5] dark:border-[#2A2A2A] shadow-none" style={{ borderRadius: 0 }}>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898]" />
              <Input
                placeholder="Rechercher dans les logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
                style={{ borderRadius: 0 }}
              />
            </div>

            {/* Action filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#9A9898]" />
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setOffset(0); }}>
                <SelectTrigger
                  className="w-36 font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A]"
                  style={{ borderRadius: 0 }}
                >
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent className="font-mono" style={{ borderRadius: 0 }}>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="create">Création</SelectItem>
                  <SelectItem value="update">Modification</SelectItem>
                  <SelectItem value="delete">Suppression</SelectItem>
                  <SelectItem value="login">Connexion</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity filter */}
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setOffset(0); }}>
              <SelectTrigger
                className="w-40 font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A]"
                style={{ borderRadius: 0 }}
              >
                <SelectValue placeholder="Entité" />
              </SelectTrigger>
              <SelectContent className="font-mono" style={{ borderRadius: 0 }}>
                <SelectItem value="all">Toutes les entités</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="institution">Établissement</SelectItem>
                <SelectItem value="teacher">Enseignant</SelectItem>
                <SelectItem value="room">Salle</SelectItem>
                <SelectItem value="subject">Matière</SelectItem>
                <SelectItem value="class">Classe</SelectItem>
                <SelectItem value="timetable">Emploi du temps</SelectItem>
                <SelectItem value="timetableSlot">Créneau</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card className="border-[#E5E5E5] dark:border-[#2A2A2A] shadow-none" style={{ borderRadius: 0 }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] flex items-center justify-between">
            <span>Événements</span>
            <span className="text-[10px] font-normal text-[#9A9898]">
              {total} entrée{total !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-[#9A9898] font-mono">Chargement...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileX className="h-8 w-8 text-[#9A9898]" />
              <p className="text-xs text-[#9A9898] font-mono">Aucun log trouvé</p>
              <p className="text-[10px] text-[#9A9898] font-mono">
                Les actions effectuées apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-transparent">
                    <TableHead className="text-[10px] font-mono font-bold text-[#9A9898]">Date</TableHead>
                    <TableHead className="text-[10px] font-mono font-bold text-[#9A9898]">Utilisateur</TableHead>
                    <TableHead className="text-[10px] font-mono font-bold text-[#9A9898]">Action</TableHead>
                    <TableHead className="text-[10px] font-mono font-bold text-[#9A9898]">Entité</TableHead>
                    <TableHead className="text-[10px] font-mono font-bold text-[#9A9898]">Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                    >
                      <TableCell className="text-[10px] font-mono text-[#9A9898] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                        {log.userName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono text-[10px] px-2 py-0.5 border",
                            actionColors[log.action] || "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                          )}
                          style={{ borderRadius: 0 }}
                        >
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                        {entityLabels[log.entity] || log.entity}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#9A9898] max-w-[200px] truncate">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-[10px] font-mono text-[#9A9898]">
                Affichage {offset + 1}–{Math.min(offset + limit, total)} sur {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="font-mono text-[10px] h-7 w-7 p-0 border-[#E5E5E5] dark:border-[#2A2A2A]"
                  style={{ borderRadius: 0 }}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-[10px] font-mono text-[#9A9898] px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                  className="font-mono text-[10px] h-7 w-7 p-0 border-[#E5E5E5] dark:border-[#2A2A2A]"
                  style={{ borderRadius: 0 }}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
