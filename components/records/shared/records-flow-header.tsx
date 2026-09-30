"use client";

import { useQuery } from "@tanstack/react-query";

import { PageCard } from "@/components/layouts/page-card";
import { queryKeys } from "@/lib/query-keys";
import { appointmentsService } from "@/services/appointments.service";

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-lg border border-border bg-surface-subtle px-3 py-1.5">
      <p className="font-clinical text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Records page header (REC-01): what the page is for, plus today's counts at a glance. */
export function RecordsFlowHeader() {
  const today = useQuery({
    queryKey: queryKeys.appointments.today,
    queryFn: () => appointmentsService.today(),
    refetchInterval: 60_000,
  });

  const list = today.data ?? [];
  const waiting = list.filter((a) => ["SCHEDULED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status)).length;
  const nhis = list.filter((a) => a.payerType === "NHIS").length;

  const show = (v: number) => (today.isLoading ? "…" : today.isError ? "—" : String(v));

  return (
    <PageCard
      title="Find or register a patient"
      description="Always search first, so the same patient isn't registered twice."
      actions={
        <div className="flex flex-wrap gap-2">
          <MetricChip label="Visits today" value={show(list.length)} />
          <MetricChip label="Still waiting" value={show(waiting)} />
          <MetricChip label="Using NHIS" value={show(nhis)} />
        </div>
      }
    />
  );
}
