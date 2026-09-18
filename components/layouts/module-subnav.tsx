"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SubNavItem {
  label: string;
  view: string;
  href: string;
}

interface ModuleSubNavProps {
  items: SubNavItem[];
  basePath: string;
  /** When true, tabs are visual only (no navigation) — for placeholder workspaces. */
  disableNavigation?: boolean;
}

/** At most this many tabs show directly — the rest collapse under "More" (design brief §5). */
const MAX_VISIBLE_TABS = 5;

export function ModuleSubNav({ items, basePath, disableNavigation = false }: ModuleSubNavProps) {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? items[0]?.view ?? "";

  const overflow = items.length > MAX_VISIBLE_TABS;
  const visibleItems = overflow ? items.slice(0, MAX_VISIBLE_TABS - 1) : items;
  const moreItems = overflow ? items.slice(MAX_VISIBLE_TABS - 1) : [];
  const moreIsActive = moreItems.some((item) => item.view === currentView);

  function renderTab(item: SubNavItem) {
    const isActive = item.view === currentView;
    if (disableNavigation) {
      return (
        <span
          key={item.view}
          className={cn("module-subnav-tab cursor-not-allowed opacity-60", isActive && "active opacity-100")}
          aria-current={isActive ? "page" : undefined}
          title="Sub-sections are disabled until this module is fully implemented"
        >
          {item.label}
        </span>
      );
    }
    return (
      <Link
        key={item.view}
        href={`${basePath}?view=${item.view}`}
        className={cn("module-subnav-tab", isActive && "active")}
        aria-current={isActive ? "page" : undefined}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <nav className="module-subnav" aria-label="Module sections">
      {visibleItems.map(renderTab)}
      {overflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn("module-subnav-tab gap-1", moreIsActive && "active")}
              aria-current={moreIsActive ? "page" : undefined}
            >
              More
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {moreItems.map((item) =>
              disableNavigation ? (
                <DropdownMenuItem key={item.view} disabled>
                  {item.label}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={item.view} asChild>
                  <Link href={`${basePath}?view=${item.view}`}>{item.label}</Link>
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
