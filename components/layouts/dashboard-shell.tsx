"use client";

import { useEffect } from "react";

import { OfflineBanner } from "@/components/common/offline-banner";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
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
    void authService.getCurrentUser()
      .then((fresh) => {
        if (!cancelled) setUser(fresh);
      })
      .catch(() => {});
    void authService.warmCsrfCookie().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const headerUser = storeUser ?? user;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={headerUser} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {isOffline && <OfflineBanner queueCount={queueCount} />}
        <AppHeader user={headerUser} />
        <main
          className="canvas-dots scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
          id="main-content"
        >
          <div className="mx-auto max-w-screen-2xl px-6 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
