"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { NAV_GROUP_LABELS, NAV_GROUP_ORDER, NAV_ITEMS, type NavGroup } from "@/config/navigation";
import { canAccessWorkspaceModule } from "@/lib/access-control";
import { useAuth } from "@/hooks/auth/use-auth";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import type { AuthUser } from "@/types/auth.types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppSidebarProps {
  user: AuthUser;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  function toggleCollapsed() {
    setCollapsed(!collapsed);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const accessibleItems = NAV_ITEMS.filter((item) => canAccessWorkspaceModule(user, item.module));
  const groups = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: accessibleItems.filter((item) => item.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "sidebar-shell flex h-full shrink-0 flex-col border-r transition-[width] duration-150",
        collapsed ? "w-16" : "w-60"
      )}
      aria-label="Main menu"
    >
      {/* White header block — lines up with the top bar */}
      <div className="flex h-[64px] shrink-0 items-center gap-2 bg-white px-4">
        {!collapsed && (
          <span className="truncate text-sm font-bold tracking-widest text-foreground uppercase">NHIMS</span>
        )}
        {collapsed && (
          <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            HM
          </span>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groups.map(({ group, items }, groupIndex) => (
          <div key={group}>
            {!collapsed && (
              <div className="flex items-center justify-between px-2.5 pb-1.5">
                <p className="sidebar-role-label text-[10px] font-semibold tracking-wider uppercase">
                  {NAV_GROUP_LABELS[group as NavGroup]}
                </p>
                {groupIndex === 0 && (
                  <button
                    type="button"
                    onClick={toggleCollapsed}
                    className="sidebar-toggle -mr-1 flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/10"
                    aria-label="Collapse menu"
                  >
                    <Menu className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href}
                    className={cn("sidebar-item", isActive && "active")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={cn("h-4 w-4 shrink-0", isActive ? "sidebar-icon-active" : "sidebar-icon-muted")}
                      aria-hidden="true"
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );

                return (
                  <li key={item.module}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {collapsed && (
        <div className="flex shrink-0 justify-center border-t sidebar-divider p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="sidebar-toggle flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
            aria-label="Expand menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="shrink-0 border-t sidebar-divider p-2">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleLogout}
                className="sidebar-item mx-auto flex h-9 w-9 items-center justify-center"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4 sidebar-icon-muted" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>
        ) : (
          <button type="button" onClick={handleLogout} className="sidebar-item w-full">
            <LogOut className="h-4 w-4 sidebar-icon-muted" aria-hidden="true" />
            <span>Log out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
