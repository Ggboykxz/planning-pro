"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "danger" | "success";
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: "text-[#D97706]",
    iconBg: "bg-[#D97706]/5 border-[#D97706]/30",
    actionClass: "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80",
    borderAccent: "border-t-2 border-t-[#D97706]",
  },
  danger: {
    icon: AlertTriangle,
    iconColor: "text-[#DC2626]",
    iconBg: "bg-[#DC2626]/5 border-[#DC2626]/30",
    actionClass: "bg-[#DC2626] text-white hover:bg-[#DC2626]/90",
    borderAccent: "border-t-2 border-t-[#DC2626]",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-[#16A34A]",
    iconBg: "bg-[#16A34A]/5 border-[#16A34A]/30",
    actionClass: "bg-[#16A34A] text-white hover:bg-[#16A34A]/90",
    borderAccent: "border-t-2 border-t-[#16A34A]",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "border-[#E5E5E5] dark:border-[#2A2A2A] p-0 overflow-hidden confirm-dialog-animate",
          config.borderAccent
        )}
      >
        <AlertDialogHeader className="p-6 pb-0">
          <div className="flex items-start gap-3">
            <div className={cn("h-9 w-9 flex items-center justify-center border shrink-0", config.iconBg)}>
              <IconComponent className={cn("h-4 w-4", config.iconColor)} />
            </div>
            <div>
              <AlertDialogTitle className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-[#646262] dark:text-[#9A9898] mt-1.5">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="p-6 pt-4 flex-row gap-2">
          <AlertDialogCancel className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] flex-1">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn("text-xs border-0 flex-1", config.actionClass)}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
