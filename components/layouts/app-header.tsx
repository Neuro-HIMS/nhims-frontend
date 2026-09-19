"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, ShieldCheck, User } from "lucide-react";

import { canAccessWorkspaceModule } from "@/lib/access-control";
import { useFacility } from "@/hooks/use-facility";
import { isAnyMockEnabled } from "@/services/mocks/mock-config";
import { useNotificationStore } from "@/store/notification.store";
import type { AuthUser } from "@/types/auth.types";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  user: AuthUser;
}

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [searchValue, setSearchValue] = useState("");
  const { data: facility } = useFacility();

  const canSearchPatients = canAccessWorkspaceModule(user, "records");
  const facilityName = facility?.name ?? user.facilityName;
  const facilityCode = facility?.code ?? user.facilityCode;
  const facilityLogoDataUrl = facility?.logoDataUrl ?? user.facilityLogoDataUrl;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/records?view=search&q=${encodeURIComponent(q)}` : "/records?view=search");
  }

  return (
    <header className="flex h-[64px] shrink-0 items-center gap-4 border-b border-border bg-card px-4" role="banner">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-md py-1 pr-2 pl-0.5 transition-colors hover:bg-muted" aria-label="Your account">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <User className="h-4 w-4" />
            </span>
            <span className="hidden truncate text-sm text-foreground sm:block">
              Hello, <span className="font-semibold">{user.firstName} {user.lastName}</span>!
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              {formatRole(user.role)}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground">{formatRole(user.role)}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
            <User className="mr-2 h-4 w-4" />
            My profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings/security")}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Sign-in and security
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canSearchPatients && (
        <form onSubmit={handleSearchSubmit} className="mx-auto flex w-full max-w-md items-center" role="search">
          <label htmlFor="global-patient-search" className="sr-only">
            Find a patient
          </label>
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="global-patient-search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="e.g. name, hospital number or phone"
              className="h-9 pl-8"
            />
          </div>
        </form>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {isAnyMockEnabled() && (
          <span className="status-pill status-pill-neutral" title="This screen is showing sample data, not live data.">
            Sample data
          </span>
        )}

        <DropdownMenu onOpenChange={(open) => !open && unreadCount > 0 && markAllRead()}>
          <DropdownMenuTrigger asChild>
            <button
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-0.5 whitespace-normal"
                    onSelect={() => markRead(n.id)}
                  >
                    <span className={n.read ? "font-medium text-foreground" : "font-semibold text-foreground"}>
                      {n.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{n.message}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Single-facility badge — a static label, not a switcher. NHIMS runs one facility per server. */}
        <div className="flex h-10 items-center gap-2 rounded-md bg-primary pr-2.5 pl-1.5 text-primary-foreground">
          {facilityLogoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from API for facility branding
            <img
              src={facilityLogoDataUrl}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full border border-white/20 bg-white object-cover"
            />
          ) : (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary"
              aria-hidden="true"
            >
              {initialsForFacility(facilityCode, facilityName)}
            </span>
          )}
          <span className="hidden max-w-36 truncate text-[13px] font-medium sm:block">{facilityName}</span>
        </div>
      </div>
    </header>
  );
}

function formatRole(role: string): string {
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function initialsForFacility(code: string, name: string): string {
  const c = (code ?? "").trim();
  if (c.length >= 2) return c.slice(0, 2).toUpperCase();
  const w = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) return `${w[0].charAt(0)}${w[1].charAt(0)}`.toUpperCase();
  if (w.length === 1 && w[0].length >= 2) return w[0].slice(0, 2).toUpperCase();
  return "FC";
}
