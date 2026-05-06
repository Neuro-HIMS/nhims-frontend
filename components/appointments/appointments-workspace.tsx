"use client";

import { useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { QueueView } from "@/components/appointments/views/queue-view";
import { CalendarView } from "@/components/appointments/views/calendar-view";
import { HistoryView } from "@/components/appointments/views/history-view";
import { BookView } from "@/components/appointments/views/book-view";

const SUB_NAV = [
  { label: "Book", view: "book", href: "/appointments?view=book" },
  { label: "Today's Queue", view: "queue", href: "/appointments?view=queue" },
  { label: "Calendar", view: "calendar", href: "/appointments?view=calendar" },
  { label: "History", view: "history", href: "/appointments?view=history" },
];

export function AppointmentsWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "book";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Appointments</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
            Booking, live queue operations, calendar load, and visit history.
        </p>
        </div>
      </div>

      <ModuleSubNav items={SUB_NAV} basePath="/appointments" />

      <div className="pt-2">
        {view === "book" && <BookView />}
        {view === "queue" && <QueueView />}
        {view === "calendar" && <CalendarView />}
        {view === "history" && <HistoryView />}
      </div>
    </div>
  );
}
