"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => (date ? new Date(`${date}T00:00:00`) : undefined), [date]);
  const dateLabel = selectedDate ? format(selectedDate, "PPP") : "Select appointment date";

  function setNow() {
    const now = new Date();
    onDateChange(format(now, "yyyy-MM-dd"));
    onTimeChange(format(now, "HH:mm"));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {dateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(selected) => {
              if (!selected) return;
              onDateChange(format(selected, "yyyy-MM-dd"));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="relative">
          <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="time"
            value={time}
            onChange={(event) => onTimeChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={setNow}>
          Now
        </Button>
      </div>
    </div>
  );
}

