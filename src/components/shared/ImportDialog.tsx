"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type ImportType = "teachers" | "rooms" | "subjects" | "classes";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
  institutionId: string;
  onImported: () => void;
}

const formatHelp: Record<ImportType, { columns: string; example: string }> = {
  teachers: {
    columns: "firstName;lastName;email;phone;specialization;maxHoursPerWeek",
    example: "Jean;Dupont;jean@email.com;+221 77 123 4567;Informatique;20",
  },
  rooms: {
    columns: "name;capacity;type;building;floor",
    example: "Amphi 500;500;amphi;Bâtiment A;RDC",
  },
  subjects: {
    columns: "name;code;hoursPerWeek;type;semester;coefficient",
    example: "Algorithmique;INF201;3;cours;S1;3",
  },
  classes: {
    columns: "name;level;department;studentCount;academicYear",
    example: "L1 Informatique;L1;Informatique;150;2025-2026",
  },
};

const typeLabels: Record<ImportType, string> = {
  teachers: "enseignants",
  rooms: "salles",
  subjects: "matières",
  classes: "classes",
};

export function ImportDialog({
  open,
  onOpenChange,
  type,
  institutionId,
  onImported,
}: ImportDialogProps) {
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<Array<Record<string, string>> | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const help = formatHelp[type];

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Detect separator (semicolon or comma)
    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(separator).map((h) => h.trim());

    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map((v) => v.trim());
      if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      rows.push(row);
    }
    return rows;
  };

  const handleParse = () => {
    if (!csvContent.trim()) {
      toast.error("Le contenu CSV est vide");
      return;
    }
    try {
      const parsed = parseCSV(csvContent);
      if (parsed.length === 0) {
        toast.error("Aucune donnée trouvée. Vérifiez le format CSV.");
        return;
      }
      setPreview(parsed);
    } catch {
      toast.error("Erreur lors de l'analyse du CSV");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Veuillez sélectionner un fichier .csv");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      toast.success(`Fichier "${file.name}" chargé`);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    try {
      // Convert string values to appropriate types
      const data = preview.map((row) => {
        const converted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (value === "") {
            converted[key] = null;
          } else if (key === "capacity" || key === "maxHoursPerWeek" || key === "studentCount" || key === "hoursPerWeek" || key === "coefficient") {
            const num = Number(value);
            converted[key] = isNaN(num) ? null : num;
          } else {
            converted[key] = value;
          }
        }
        return converted;
      });

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, type, data }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`${result.created} ${typeLabels[type]} importé(s) ✓`);
        setPreview(null);
        setCsvContent("");
        onOpenChange(false);
        onImported();
      } else {
        toast.error("Erreur lors de l'importation");
      }
    } catch {
      toast.error("Erreur lors de l'importation");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setCsvContent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Importer des {typeLabels[type]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format help */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3 w-3 text-[#9A9898]" />
              <p className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                Format attendu (CSV)
              </p>
            </div>
            <code className="text-[10px] text-[#646262] dark:text-[#9A9898] block mb-1">
              {help.columns}
            </code>
            <code className="text-[10px] text-[#9A9898] block">
              {help.example}
            </code>
          </div>

          {/* File upload */}
          <div>
            <Label className="text-xs font-bold mb-2 block">
              Fichier CSV
            </Label>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs border border-[#E5E5E5] dark:border-[#2A2A2A] w-full justify-start"
            >
              <Upload className="h-3 w-3 mr-2" />
              Choisir un fichier .csv
            </Button>
          </div>

          {/* CSV textarea */}
          <div>
            <Label className="text-xs font-bold mb-2 block">
              Ou coller le contenu CSV
            </Label>
            <Textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={`${help.columns}\n${help.example}`}
              className="text-[10px] font-mono h-32"
            />
          </div>

          {/* Parse button */}
          {!preview && (
            <Button
              variant="ghost"
              onClick={handleParse}
              disabled={!csvContent.trim()}
              className="text-xs border border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC]"
            >
              Analyser le CSV
            </Button>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-3 w-3 text-[#201D1D] dark:text-[#FDFCFC]" />
                <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                  Aperçu ({preview.length} ligne{preview.length > 1 ? "s" : ""})
                </p>
              </div>
              <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto max-h-48 overflow-y-auto scrollbar-thin">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                      {Object.keys(preview[0]).map((key) => (
                        <th key={key} className="p-1.5 text-left font-bold text-[#201D1D] dark:text-[#FDFCFC] border-r border-[#E5E5E5] dark:border-[#2A2A2A] last:border-r-0">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="p-1.5 text-[#646262] dark:text-[#9A9898] border-r border-[#E5E5E5] dark:border-[#2A2A2A] last:border-r-0">
                            {val || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="text-[10px] text-[#9A9898] p-2 text-center">
                    … et {preview.length - 10} autres lignes
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="text-xs">
            Annuler
          </Button>
          {preview && preview.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            >
              {importing ? "Importation..." : `Importer ${preview.length} ${typeLabels[type]}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
