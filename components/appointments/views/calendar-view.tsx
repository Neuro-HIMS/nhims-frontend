"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addMonths, endOfMonth, format, isSameDay, isToday, startOfMonth, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/common/status-pill";
import { appointmentsService } from "@/services/appointments.service";
import { appointmentStatusLabel, appointmentStatusTone } from "@/lib/status-labels";
import { queryKeys } from "@/lib/query-keys";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView() {
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const monthlyParams = {
    from: format(monthStart, "yyyy-MM-dd'T'00:00:00"),
    to: format(addMonths(monthStart, 1), "yyyy-MM-dd'T'00:00:00"),
  };

  const monthly = useQuery({
    queryKey: queryKeys.appointments.search(monthlyParams),
    queryFn: () => appointmentsService.search(monthlyParams),
  });

  const apptsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of monthly.data ?? []) {
      if (!a.scheduledFor) continue;
      const k = format(new Date(a.scheduledFor), "yyyy-MM-dd");
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [monthly.data]);

  const selectedDayAppts = useMemo(
    () => (monthly.data ?? []).filter((a) => a.scheduledFor && isSameDay(new Date(a.scheduledFor), selectedDay)),
    [monthly.data, selectedDay],
  );

  const firstDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = format(cursor, "LLLL yyyy");

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{monthName}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCursor((d) => subMonths(d, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCursor((d) => addMonths(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-0.5">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const key = format(date, "yyyy-MM-dd");
              const count = apptsByDay.get(key) ?? 0;
              const isSelected = isSameDay(date, selectedDay);
              const todayClass = isToday(date) && !isSelected ? "border border-primary font-semibold text-primary" : "";
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(date)}
                  className={`relative flex h-9 w-full items-center justify-center rounded text-sm transition-colors ${
                    isSelected ? "bg-primary text-primary-foreground font-semibold" : `${todayClass} hover:bg-muted text-foreground`
                  }`}
                >
                  {day}
                  {count > 0 && !isSelected && (
                    <span
                      className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {monthly.isLoading && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading month…
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{format(selectedDay, "dd/MM/yyyy")}</CardTitle>
          <CardDescription>
            {selectedDayAppts.length} appointment{selectedDayAppts.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDayAppts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No appointments for this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <span className="font-clinical text-sm text-muted-foreground w-12 shrink-0">
                    {a.scheduledFor ? format(new Date(a.scheduledFor), "HH:mm") : "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground">{a.serviceName}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">{a.clinicianName || "Any available doctor"}</Badge>
                  <StatusPill tone={appointmentStatusTone(a.status)}>{appointmentStatusLabel(a.status)}</StatusPill>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
