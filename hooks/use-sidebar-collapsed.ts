import { useSyncExternalStore } from "react";

const STORAGE_KEY = "nhims.sidebar.collapsed";
const listeners = new Set<() => void>();

// Falls back to this when storage is blocked (e.g. private browsing) — the
// toggle still works for the current visit, it just won't persist.
let memoryFallback = false;

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return memoryFallback;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setCollapsed(next: boolean) {
  memoryFallback = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Blocked storage — memoryFallback still tracks it for this visit.
  }
  listeners.forEach((notify) => notify());
}

/** Sidebar collapse state, persisted per browser. SSR-safe (always expanded on first paint). */
export function useSidebarCollapsed(): [boolean, (next: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [collapsed, setCollapsed];
}
