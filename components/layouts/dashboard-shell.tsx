"use client";

import { useEffect, useState } from "react";

import { OfflineBanner } from "@/components/common/offline-banner";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Fixed sidebar from tablet width up; below that the same menu slides out from the header. */}
      <div className="hidden md:flex">
        <AppSidebar user={headerUser} />
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-64 max-w-[85vw] gap-0 border-0 p-0">
          <SheetTitle className="sr-only">Main menu</SheetTitle>
          <AppSidebar user={headerUser} variant="drawer" onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {isOffline && <OfflineBanner queueCount={queueCount} />}
        <AppHeader user={headerUser} onOpenMenu={() => setMenuOpen(true)} />
        <main
          className="canvas-dots scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
          id="main-content"
        >
          <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
