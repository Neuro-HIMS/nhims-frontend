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
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }));
  },

  setNotifications: (list) => {
    const notifications = list.map((n) => ({ ...n, read: n.read ?? false }));
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  },

  markRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));
