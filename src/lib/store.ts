import { create } from "zustand";

export type AppSection =
  | "dashboard"
  | "timetable"
  | "teachers"
  | "rooms"
  | "subjects"
  | "classes"
  | "settings";

export type TimetableViewMode = "class" | "teacher" | "room";

export type NotificationType = "conflict" | "generation_complete" | "import_complete";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: number;
  read: boolean;
}

interface AppState {
  currentSection: AppSection;
  setCurrentSection: (section: AppSection) => void;
  institutionId: string | null;
  setInstitutionId: (id: string | null) => void;
  timetableViewMode: TimetableViewMode;
  setTimetableViewMode: (mode: TimetableViewMode) => void;
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
  selectedTeacherId: string | null;
  setSelectedTeacherId: (id: string | null) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  // Semester/Period Selector
  currentSemester: string | null;
  currentAcademicYear: string | null;
  setSemester: (s: string | null) => void;
  setAcademicYear: (y: string | null) => void;
  // Notifications
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "time" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentSection: "dashboard",
  setCurrentSection: (section) => set({ currentSection: section }),
  institutionId: null,
  setInstitutionId: (id) => set({ institutionId: id }),
  timetableViewMode: "class",
  setTimetableViewMode: (mode) => set({ timetableViewMode: mode }),
  selectedClassId: null,
  setSelectedClassId: (id) => set({ selectedClassId: id }),
  selectedTeacherId: null,
  setSelectedTeacherId: (id) => set({ selectedTeacherId: id }),
  selectedRoomId: null,
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  shortcutsOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  // Semester/Period Selector
  currentSemester: null,
  currentAcademicYear: null,
  setSemester: (s) => set({ currentSemester: s }),
  setAcademicYear: (y) => set({ currentAcademicYear: y }),
  // Notifications
  notifications: [],
  addNotification: (n) =>
    set((state) => ({
      notifications: [
        {
          ...n,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          time: Date.now(),
          read: false,
        },
        ...state.notifications,
      ],
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
