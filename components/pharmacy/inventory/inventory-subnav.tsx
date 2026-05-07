"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { tab: "suppliers", label: "Suppliers" },
  { tab: "stock", label: "Stock" },
  { tab: "movements", label: "Movements" },
] as const;

export function InventorySubNav() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? "suppliers";

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-2" aria-label="Inventory sections">
      {TABS.map(({ tab, label }) => {
        const active = tab === currentTab;
        return (
          <Link
            key={tab}
            href={`/pharmacy?view=inventory&tab=${tab}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
