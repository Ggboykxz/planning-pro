"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore, type AppSection, type NotificationType } from "@/lib/store";
import { Bell, X, AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const notifIcons: Record<NotificationType, React.ReactNode> = {
  conflict: <AlertTriangle className="h-3 w-3 text-[#DC2626]" />,
  generation_complete: <CheckCircle2 className="h-3 w-3 text-[#201D1D] dark:text-[#FDFCFC]" />,
  import_complete: <Upload className="h-3 w-3 text-[#D97706]" />,
};

const notifSectionMap: Record<NotificationType, AppSection> = {
  conflict: "timetable",
  generation_complete: "timetable",
  import_complete: "dashboard",
};

export function NotificationCenter() {
  const { notifications, markNotificationRead, removeNotification, setCurrentSection } = useAppStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const n of notifications) {
        if (now - n.time > 30000 && !n.read) {
          markNotificationRead(n.id);
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [notifications, markNotificationRead]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const handleNotifClick = (id: string, type: NotificationType) => {
    markNotificationRead(id);
    setCurrentSection(notifSectionMap[type]);
    setOpen(false);
  };

  const formatTime = (time: number) => {
    const diff = Date.now() - time;
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return new Date(time).toLocaleDateString("fr-FR");
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-[#DC2626] text-white text-[8px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#111111] z-50 max-h-96 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Notifications</p>
            {notifications.length > 0 && (
              <button
                onClick={() => useAppStore.getState().markAllNotificationsRead()}
                className="text-[10px] text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
              >
                Tout lire
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-[#9A9898]">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E5] dark:divide-[#2A2A2A]">
              {notifications.slice(0, 20).map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors",
                    !notif.read && "bg-[#F8F7F7]/50 dark:bg-[#1A1A1A]/50"
                  )}
                  onClick={() => handleNotifClick(notif.id, notif.type)}
                >
                  <div className="mt-0.5 shrink-0">{notifIcons[notif.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">
                      {notif.title}
                    </p>
                    <p className="text-[10px] text-[#9A9898] truncate">
                      {notif.message}
                    </p>
                    <p className="text-[9px] text-[#9A9898] mt-0.5">
                      {formatTime(notif.time)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notif.id);
                    }}
                    className="shrink-0 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
