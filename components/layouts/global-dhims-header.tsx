"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LayoutGrid, LogOut, Mail, Settings, User } from "lucide-react";

import { NAV_ITEMS } from "@/config/navigation";
import { canAccessWorkspaceModule } from "@/lib/access-control";
import { useAuth } from "@/hooks/auth/use-auth";
import type { AuthUser } from "@/types/auth.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationStore } from "@/store/notification.store";

interface GlobalDhimsHeaderProps {
  user: AuthUser;
}

export function GlobalDhimsHeader({ user }: GlobalDhimsHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const accessibleTabs = NAV_ITEMS.filter((tab) => canAccessWorkspaceModule(user, tab.module));
  const activeTab = accessibleTabs.find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  );

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="dashboard-shell-header" role="banner">
      {/* ── Top row ─────────────────────────────────────────── */}
      <div className="flex h-[52px] items-center gap-3 px-3">
        <Link
          href="/dashboard"
          className="shrink-0 rounded-md bg-white/95 px-2 py-1 shadow-sm ring-1 ring-black/5"
          aria-label="Go to NHIMS dashboard"
          title="NHIMS home"
        >
          <Image
            src="/assets/nhims-logo.png"
            alt=""
            width={132}
            height={36}
            className="h-[18px] w-auto object-contain opacity-95"
            priority
          />
        </Link>

        <div className="h-6 w-px shrink-0 bg-white/20" aria-hidden="true" />

        {/* Facility-first branding */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {user.facilityLogoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URLs from API for facility branding
            <img
              src={user.facilityLogoDataUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-lg border border-white/30 bg-white object-cover shadow-sm sm:h-12 sm:w-12"
            />
          ) : (
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/35 bg-white/15 text-sm font-bold uppercase tracking-tight text-white shadow-inner sm:h-12 sm:w-12"
              aria-hidden
            >
              {initialsForFacility(user.facilityCode, user.facilityName)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-snug text-white sm:text-base">{user.facilityName}</p>
            <p className="mt-0.5 truncate text-[11px] leading-none text-white/65">
              <span className="hidden sm:inline">Powered by NHIMS · </span>
              <span className="font-medium text-white/85">{user.facilityCode}</span>
              {" · "}
              <span>{activeTab?.label ?? "Workspace"}</span>
              {" · "}
              <span>{formatRole(user.role)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 ml-auto">
          {/* Online badge */}
          <span className="dashboard-online-badge mr-1.5 hidden md:inline-flex">
            <span className="dashboard-online-dot" aria-hidden="true" />
            <span className="text-[11px] font-medium">Online</span>
          </span>

          {/* Notifications */}
          <button
            className="dashboard-icon-btn relative"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="dashboard-counter-badge" aria-hidden="true">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Messages */}
          <button className="dashboard-icon-btn" aria-label="Messages">
            <Mail className="h-[18px] w-[18px]" />
          </button>

          {/* Apps grid */}
          <button className="dashboard-icon-btn" aria-label="Applications">
            <LayoutGrid className="h-[18px] w-[18px]" />
          </button>

          {/* Divider */}
          <div className="mx-1.5 h-5 w-px shrink-0 bg-white/20" aria-hidden="true" />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/10"
                aria-label="User menu"
              >
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  {initials}
                </span>
                <span className="hidden text-[13px] font-medium text-white lg:block">
                  {user.firstName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{user.firstName} {user.lastName}</p>
                  <p className="font-clinical text-xs text-muted-foreground">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{formatRole(user.role)}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings/security")}>
                <Settings className="mr-2 h-4 w-4" />
                Security Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Module tab bar ───────────────────────────────────── */}
      <nav className="dashboard-tabbar" aria-label="NHIMS modules">
        {accessibleTabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <DropdownMenu key={tab.module}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`dashboard-tab ${isActive ? "active" : ""}`}
                  aria-label={`${tab.label} module`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-48">
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tab.label}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tab.subNav.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </nav>
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
