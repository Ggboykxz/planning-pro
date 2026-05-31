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
}));
