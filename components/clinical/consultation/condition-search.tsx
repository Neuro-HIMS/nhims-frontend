"use client";

import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { PickedCondition } from "@/hooks/use-consultation-draft";
import { getFriendlyError } from "@/lib/api-errors";
import { isNotifiableDisease } from "@/lib/notifiable-diseases";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { clinicalService } from "@/services/clinical.service";

interface ConditionSearchProps {
  id: string;
  /** Visible label text, also used for screen readers. */
  label: string;
  value: PickedCondition | null;
  /** Typed text chosen instead of a list entry (only when `onFreeText` is given). */
  freeText?: string;
  onChange: (next: PickedCondition | null) => void;
  /** Offer "Use what I typed" for diagnoses that aren't on the list. */
  onFreeText?: (text: string) => void;
  /** Condition ids that can't be picked again here. */
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** One diagnosis from the facility's list — name first, code small and grey (DOC-04). */
export function ConditionSearch({
  id,
  label,
  value,
  freeText,
  onChange,
  onFreeText,
  excludeIds = [],
  placeholder = "Search diagnosis, e.g. malaria",
  disabled,
}: ConditionSearchProps) {
  const listId = useId();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const q = useDebounced(term.trim(), 250);

  const searchQuery = useQuery({
    queryKey: queryKeys.clinical.conditions(q, true),
    queryFn: () => clinicalService.conditions({ q, activeOnly: true }),
    enabled: q.length >= 2,
    staleTime: 60_000,
  });

  const results = (searchQuery.data ?? []).filter((c) => !excludeIds.includes(c.id)).slice(0, 8);
  const offerFreeText = Boolean(onFreeText) && term.trim().length >= 2;
  const optionCount = results.length + (offerFreeText ? 1 : 0);
  const showList = open && term.trim().length >= 2;

  function pick(index: number) {
    if (index < results.length) {
      const c = results[index];
      onChange({ conditionId: c.id, name: c.name, code: c.icd11Code || c.icdHint || "" });
    } else if (offerFreeText) {
      onFreeText?.(term.trim());
    }
    setTerm("");
    setOpen(false);
    setActive(0);
  }

  // Chosen: show it as a chip with a way to change it.
  const typed = freeText?.trim();
  if (value || typed) {
    return (
      <div className="flex min-h-9 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-1.5">
        <p className="min-w-0 truncate text-sm text-foreground">
          {value ? value.name : typed}
          {value?.code && <span className="ml-2 font-clinical text-xs text-muted-foreground">{value.code}</span>}
          {!value && <span className="ml-2 text-xs text-muted-foreground">(typed, not on the list)</span>}
        </p>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              onFreeText?.("");
            }}
            aria-label={`Remove ${value?.name ?? typed} from ${label.toLowerCase()}`}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && optionCount > 0 ? `${listId}-opt-${active}` : undefined}
        value={term}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        className="pl-9"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!showList || optionCount === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % optionCount);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + optionCount) % optionCount);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(Math.min(active, optionCount - 1));
          }
        }}
      />
      {showList && (
        <div
          id={listId}
          role="listbox"
          aria-label={`${label} results`}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md"
        >
          {q.length < 2 || searchQuery.isPending ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          ) : searchQuery.isError ? (
            <p className="px-3 py-2.5 text-sm text-destructive">{getFriendlyError(searchQuery.error).message}</p>
          ) : (
            <>
              {results.map((c, i) => (
                <button
                  key={c.id}
                  id={`${listId}-opt-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(i)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left",
                    i === active ? "bg-primary-soft" : "hover:bg-muted/50",
                  )}
                >
                  <span className="text-sm text-foreground">
                    {c.name}
                    {isNotifiableDisease(c.name) && <span className="ml-2 text-xs text-warning">Must be reported</span>}
                  </span>
                  {(c.icd11Code || c.icdHint) && (
                    <span className="shrink-0 font-clinical text-xs text-muted-foreground">{c.icd11Code || c.icdHint}</span>
                  )}
                </button>
              ))}
              {results.length === 0 && !offerFreeText && (
                <p className="px-3 py-2.5 text-sm text-muted-foreground">
                  No diagnosis matches &ldquo;{q}&rdquo;. Try another word, or ask your administrator to add it to the diagnosis list.
                </p>
              )}
              {offerFreeText && (
                <button
                  id={`${listId}-opt-${results.length}`}
                  type="button"
                  role="option"
                  aria-selected={active === results.length}
                  onMouseEnter={() => setActive(results.length)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(results.length)}
                  className={cn(
                    "flex w-full border-t border-border px-3 py-2 text-left text-sm",
                    active === results.length ? "bg-primary-soft" : "hover:bg-muted/50",
                  )}
                >
                  Use &ldquo;{term.trim()}&rdquo; as typed (not on the list)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
