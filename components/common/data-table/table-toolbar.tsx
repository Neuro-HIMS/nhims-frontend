import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface TableToolbarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: ReactNode;
  actions?: ReactNode;
}

/** The light band above a DataTable — search left, filters + actions right (design brief §2.6). */
export function TableToolbar({ search, filters, actions }: TableToolbarProps) {
  if (!search && !filters && !actions) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-b-0 border-border bg-surface-subtle px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <div className="relative w-56">
            <Input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search"}
              className="h-9 pr-8"
              aria-label={search.placeholder ?? "Search"}
            />
            <Search className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        )}
        {filters}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
