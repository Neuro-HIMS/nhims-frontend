import { create } from "zustand";

// ── Offline store
interface OfflineState {
  isOffline: boolean;
  queueCount: number;
  setOffline: (offline: boolean) => void;
  incrementQueue: () => void;
  decrementQueue: (n?: number) => void;
  resetQueue: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  queueCount: 0,

  setOffline: (offline) => set({ isOffline: offline }),
  incrementQueue: () => set((s) => ({ queueCount: s.queueCount + 1 })),
  decrementQueue: (n = 1) =>
    set((s) => ({ queueCount: Math.max(0, s.queueCount - n) })),
  resetQueue: () => set({ queueCount: 0 }),
}));