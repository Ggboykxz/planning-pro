import { create } from "zustand";

export type AppSection =
  | "dashboard"
  | "timetable"
  | "teachers"
  | "rooms"
  | "subjects"
  | "classes"
  | "settings";

interface AppState {
  currentSection: AppSection;
  setCurrentSection: (section: AppSection) => void;
  institutionId: string | null;
  setInstitutionId: (id: string | null) => void;
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentSection: "dashboard",
  setCurrentSection: (section) => set({ currentSection: section }),
  institutionId: null,
  setInstitutionId: (id) => set({ institutionId: id }),
  selectedClassId: null,
  setSelectedClassId: (id) => set({ selectedClassId: id }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
