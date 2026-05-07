"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import type { ClinicalConditionDto } from "@/types/clinical.types";

interface ClassificationPickerProps {
  valueId: string | null;
  selection: ClinicalConditionDto | null;
  onChange: (next: ClinicalConditionDto | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Facility-scoped ICD-11 classification picker backed by `/clinical/conditions/page`.
 */
export function ClassificationPicker({
  valueId,
  selection,
  onChange,
  disabled,
  placeholder = "Search catalogue…",
}: ClassificationPickerProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const deferred = useDeferredValue(term.trim());

  const pageQuery = useQuery({
    queryKey: queryKeys.clinical.conditionsPage(deferred, 0, true, 30),
    queryFn: () =>
      clinicalService.conditionsPaged({
        q: deferred || undefined,
        page: 0,
        size: 30,
        activeOnly: true,
      }),
    enabled: open,
    staleTime: 20_000,
  });

  const rows = pageQuery.data?.content ?? [];
  const label =
    selection && selection.id === valueId
      ? [
          selection.name,
          selection.description?.trim(),
          selection.icd11Code ? `ICD-11 ${selection.icd11Code}` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : valueId
        ? "Selected classification"
        : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between font-normal",
            !valueId && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left text-sm">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <div className="flex flex-col gap-2">
          <input
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs"
            placeholder="Type code, title, or ICD-11…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto rounded-md border border-border">
            {pageQuery.isFetching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : rows.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matches.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((c) => {
                  const active = c.id === valueId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-2 px-2 py-2 text-left text-sm hover:bg-muted/60",
                          active && "bg-muted/40",
                        )}
                        onClick={() => {
                          onChange(c);
                          setOpen(false);
                          setTerm("");
                        }}
                      >
                        <span className="mt-0.5 shrink-0 text-muted-foreground">
                          {active ? <Check className="h-4 w-4" /> : <span className="inline-block w-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium">{c.name}</span>
                          {c.description?.trim() ? (
                            <span className="block text-xs text-muted-foreground">{c.description}</span>
                          ) : null}
                          {c.icd11Code ? (
                            <span className="block font-clinical text-[11px] text-muted-foreground">
                              ICD-11 {c.icd11Code}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {valueId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear selection
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
