"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface FilterChip {
  id: string;
  label: string;
}

interface FilterChipBarProps {
  chips: FilterChip[];
  onRemove: (id: string) => void;
  onReset: () => void;
}

export function FilterChipBar({ chips, onRemove, onReset }: FilterChipBarProps) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <Badge key={c.id} variant="secondary" className="gap-1 pr-1 font-normal">
          {c.label}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-muted"
            onClick={() => onRemove(c.id)}
            aria-label={`Remove filter ${c.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
