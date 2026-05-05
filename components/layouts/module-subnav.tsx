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
}

export function ModuleSubNav({ items, basePath }: ModuleSubNavProps) {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? items[0]?.view ?? "";

  return (
    <nav className="module-subnav" aria-label="Module sections">
      {items.map((item) => {
        const isActive = item.view === currentView;
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
