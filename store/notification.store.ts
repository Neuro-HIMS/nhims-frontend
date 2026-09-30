import { create } from "zustand";

export interface Notification {
  id: string;
  type: "critical_lab" | "allergy_conflict" | "drug_interaction" | "referral" | "low_stock" | "general";
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  /** Where the bell item links to — falls back to "#" if not given. */
  href?: string;
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  /** Bulk-load the feed (e.g. on sign-in). Replaces whatever was there. */
  setNotifications: (list: (Omit<Notification, "read"> & { read?: boolean })[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      // "local-" = raised in this browser (not from the feed); kept when the feed refreshes.
      id: `local-${crypto.randomUUID()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }));
  },

  setNotifications: (list) => {
    set((s) => {
      // Keep what the user already read, and anything raised locally in this browser.
      const readIds = new Set(s.notifications.filter((n) => n.read).map((n) => n.id));
      const local = s.notifications.filter((n) => n.id.startsWith("local-"));
      const fromFeed = list.map((n) => ({ ...n, read: n.read ?? readIds.has(n.id) }));
      const notifications = [...local, ...fromFeed].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    });
  },

  markRead: (id) => {
    set((s) => {
      const notifications = s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    });
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));
