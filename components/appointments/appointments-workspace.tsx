"use client";

import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { QueueView } from "@/components/appointments/views/queue-view";
import { CalendarView } from "@/components/appointments/views/calendar-view";
import { HistoryView } from "@/components/appointments/views/history-view";
import { BookingSearchView } from "@/components/booking/booking-search-view";

const SUB_NAV = [
  { label: "Book", view: "book", href: "/appointments?view=book" },
  { label: "Today", view: "queue", href: "/appointments?view=queue" },
  { label: "Calendar", view: "calendar", href: "/appointments?view=calendar" },
  { label: "History", view: "history", href: "/appointments?view=history" },
];

export function AppointmentsWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "book";

  return (
    <div className="space-y-4">
      <PageCard title="Appointments" description="Book a clinic slot, check patients in, and look up past appointments." />

      <ModuleSubNav items={SUB_NAV} basePath="/appointments" />

      <div className="pt-2">
        {view === "book" && <BookingSearchView />}
        {view === "queue" && <QueueView />}
        {view === "calendar" && <CalendarView />}
        {view === "history" && <HistoryView />}
      </div>
    </div>
  );
}
