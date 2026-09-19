"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { notificationsService } from "@/services/notifications.service";
import { useNotificationStore } from "@/store/notification.store";

/** Loads the header bell's feed once and keeps it fresh every 30s (queue-style refresh). */
export function useNotificationsFeed() {
  const setNotifications = useNotificationStore((s) => s.setNotifications);

  const query = useQuery({
    queryKey: queryKeys.notifications.feed,
    queryFn: () => notificationsService.feed(),
    refetchInterval: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setNotifications(query.data);
  }, [query.data, setNotifications]);
}
