"use client";

import { useEffect } from "react";

import { OfflineBanner } from "@/components/common/offline-banner";
import { GlobalDhimsHeader } from "@/components/layouts/global-dhims-header";
import { authService } from "@/services/auth.service";
import { useOfflineStore } from "@/store/offline.store";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth.types";

interface DashboardShellProps {
  children: React.ReactNode;
  user: AuthUser;
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const isOffline = useOfflineStore((s) => s.isOffline);
  const queueCount = useOfflineStore((s) => s.queueCount);
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;
    void authService
      .getCurrentUser()
      .then((fresh) => {
        if (!cancelled) setUser(fresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const headerUser = storeUser ?? user;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {isOffline && <OfflineBanner queueCount={queueCount} />}
      <GlobalDhimsHeader user={headerUser} />
      <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain" id="main-content">
        <div className="mx-auto max-w-screen-2xl px-4 py-4 lg:px-6 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
