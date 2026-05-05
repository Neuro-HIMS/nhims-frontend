import { create } from "zustand";

type SaveStatus = "idle" | "saving" | "saved" | "unsaved" | "error";

interface UIState {
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useUIStore = create<UIState>((set) => ({
  saveStatus: "idle",
  setSaveStatus: (status) => set({ saveStatus: status }),
}));