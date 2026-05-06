"use client";

import { useQuery } from "@tanstack/react-query";

import { appointmentsService } from "@/services/appointments.service";

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
      <p className="font-clinical text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function RecordsFlowHeader() {
  const today = useQuery({
    queryKey: ["appointments", "today", "records-header"],
    queryFn: () => appointmentsService.today(),
    refetchInterval: 60_000,
  });

  const list = today.data ?? [];
  const inQueue = list.filter((a) => ["SCHEDULED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status)).length;
  const firstTimeToday = list.filter((a) => a.visitType === "OPD").length;
  const bookedToday = list.length;
  const nhisVerified = list.filter((a) => a.payerType === "NHIS").length;

  const valueOrDash = (v: number) => (today.isError ? "—" : String(v));

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Records Workflow
          </p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Patient Search and Registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search first by ID, NHIS, or name before creating any new record. After booking, the live visit appears in the{" "}
            <a href="/nurse?view=visits" className="font-medium text-primary underline-offset-4 hover:underline">
              Nurse Station queue
            </a>{" "}
            (clinical encounter), not only here.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4">
          <MetricChip label="Clients in Queue" value={today.isLoading ? "…" : valueOrDash(inQueue)} />
          <MetricChip label="First-Time Today" value={today.isLoading ? "…" : valueOrDash(firstTimeToday)} />
          <MetricChip label="Appointments Booked" value={today.isLoading ? "…" : valueOrDash(bookedToday)} />
          <MetricChip label="NHIS Verified" value={today.isLoading ? "…" : valueOrDash(nhisVerified)} />
        </div>
      </div>
    </div>
  );
}


