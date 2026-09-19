"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { Matcher } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseLocalDate(value: string): Date | undefined {
  const t = value.trim();
  if (!t) return undefined;
  const parts = t.split("-").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return undefined;
  return dt;
}

export function DatePickerField({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
  id,
  className,
  fromYear = 1900,
  toYear,
  /** Dates strictly after this day are not selectable (local calendar). */
  disableAfter,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  fromYear?: number;
  toYear?: number;
  disableAfter?: Date;
}) {
  const [open, setOpen] = useState(false);
  const endY = toYear ?? new Date().getFullYear() + 10;

  const selectedDate = useMemo(() => parseLocalDate(value), [value]);
  const dateLabel = selectedDate ? format(selectedDate, "dd/MM/yyyy") : placeholder;

  const startMonth = useMemo(() => new Date(fromYear, 0, 1), [fromYear]);
  const endMonth = useMemo(() => new Date(endY, 11, 1), [endY]);

  const defaultMonth = useMemo(() => {
    if (selectedDate) return selectedDate;
    const now = new Date();
    if (now < startMonth) return startMonth;
    if (now > endMonth) return endMonth;
    return now;
  }, [selectedDate, startMonth, endMonth]);

  const calendarDisabled: Matcher | boolean | undefined = disabled
    ? true
    : disableAfter
      ? { after: disableAfter }
      : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{dateLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          defaultMonth={defaultMonth}
          selected={selectedDate}
          onSelect={(selected) => {
            if (!selected) return;
            onChange(format(selected, "yyyy-MM-dd"));
            setOpen(false);
          }}
          disabled={calendarDisabled}
        />
      </PopoverContent>
    </Popover>
  );
}
