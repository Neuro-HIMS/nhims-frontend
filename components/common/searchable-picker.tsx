"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface PickerOption {
  value: string;
  /** Main line, e.g. the patient's name. */
  label: string;
  /** Second line, e.g. hospital number and reason. */
  description?: string;
  /** Extra words matched by the search but not shown. */
  keywords?: string;
  disabled?: boolean;
}

interface SearchablePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: PickerOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when nothing matches the search (or the list is empty). */
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * The picker for long lists (patients, visits, medicines…): a search box above a contained,
 * scrolling list the width of the field — never a full-height dropdown (03-components.md).
 */
export function SearchablePicker({
  id,
  value,
  onChange,
  options,
  placeholder = "Choose",
  searchPlaceholder = "Search",
  emptyText = "Nothing matches.",
  loading = false,
  disabled = false,
  className,
  ...rest
}: SearchablePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return options;
    return options.filter((o) => {
      const text = `${o.label} ${o.description ?? ""} ${o.keywords ?? ""}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [options, query]);

  function choose(o: PickerOption) {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(0, Math.min(filtered.length - 1, active + (e.key === "ArrowDown" ? 1 : -1)));
      setActive(next);
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      choose(filtered[active]);
    }
  }

  const listId = id ? `${id}-list` : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQuery("");
          setActive(Math.max(0, options.findIndex((x) => x.value === value)));
        }
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={rest["aria-label"]}
          className={cn(
            "flex min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className="min-w-0 flex-1 overflow-hidden">
            {selected ? (
              <>
                <span className="block truncate text-foreground">{selected.label}</span>
                {selected.description && <span className="block truncate text-xs text-muted-foreground">{selected.description}</span>}
              </>
            ) : (
              <span className="block truncate text-muted-foreground">{loading ? "Loading…" : placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 gap-2 p-2" onKeyDown={onKeyDown}>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            className="h-9 w-full rounded-md border border-input bg-background pr-2 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        {loading ? (
          <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto overscroll-contain">
            {filtered.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5",
                  i === active && "bg-muted",
                  o.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0 text-primary", o.value === value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{o.label}</span>
                  {o.description && <span className="block truncate text-xs text-muted-foreground">{o.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!loading && filtered.length > 0 && query && (
          <p className="px-2 text-xs text-muted-foreground">
            {filtered.length} of {options.length}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
