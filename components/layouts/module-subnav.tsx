"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

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

export function ModuleSubNav({ items, basePath, disableNavigation = false }: ModuleSubNavProps) {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? items[0]?.view ?? "";

  return (
    <nav className="module-subnav" aria-label="Module sections">
      {items.map((item) => {
        const isActive = item.view === currentView;
        if (disableNavigation) {
          return (
            <span
              key={item.view}
              className={cn(
                "module-subnav-tab cursor-not-allowed opacity-60",
                isActive && "active opacity-100",
              )}
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
      })}
    </nav>
  );
}
