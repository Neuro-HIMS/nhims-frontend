"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { StatusPill } from "@/components/common/status-pill";
import { WaitingList } from "@/components/clinical/waiting-list";
import { ChoiceOption } from "@/components/ui/choice-option";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cleanPersonName, naturalName } from "@/lib/display-name";
import { isWaitingToPay, labStatus, labUrgencyAsTriage, labUrgencyLabel } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { sortByUrgencyThenArrival } from "@/lib/sort-by-urgency";
import { canSeeCriticalInbox } from "@/lib/permissions";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { LabOrderDto } from "@/types/clinical.types";

type Filter = "all" | "collect" | "testing" | "authorise";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Everything" },
  { value: "collect", label: "To collect" },
  { value: "testing", label: "Being tested" },
  { value: "authorise", label: "Waiting to authorise" },
];

const TO_COLLECT = new Set(["ORDERED", "PAID", "CLAIMED"]);
const REFRESH_MS = 30_000;

function matches(o: LabOrderDto, f: Filter): boolean {
  if (f === "collect") return TO_COLLECT.has(o.status);
  if (f === "testing") return o.status === "IN_PROGRESS";
  if (f === "authorise") return o.status === "COMPLETED";
  return true;
}

/** LAB-01 — tests to do, most urgent first; self-pay tests wait for the cashier. */
export function LabTodoView() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const readyQuery = useQuery({
    queryKey: queryKeys.clinical.labWorklist,
    queryFn: () => clinicalService.labWorklist(),
    refetchInterval: REFRESH_MS,
  });
  const enteredQuery = useQuery({
    queryKey: [...queryKeys.clinical.labWorklist, "COMPLETED"],
    queryFn: () => clinicalService.labWorklist("COMPLETED"),
    refetchInterval: REFRESH_MS,
  });
  const role = useAuthStore((s) => s.user?.role);
  const seesInbox = canSeeCriticalInbox(role);
  const criticalQuery = useQuery({
    queryKey: queryKeys.clinical.labCriticalInbox,
    queryFn: () => clinicalService.labCriticalAlertsInbox(),
    refetchInterval: REFRESH_MS,
    enabled: seesInbox,
  });

  const all = useMemo(
    () =>
      sortByUrgencyThenArrival(
        [...(readyQuery.data ?? []), ...(enteredQuery.data ?? [])],
        (o) => labUrgencyAsTriage(o.priority),
        (o) => o.orderedAt ?? "",
      ),
    [readyQuery.data, enteredQuery.data],
  );
  const shown = all.filter((o) => matches(o, filter));

  const stats = {
    collect: all.filter((o) => TO_COLLECT.has(o.status)).length,
    testing: all.filter((o) => o.status === "IN_PROGRESS").length,
    authorise: all.filter((o) => o.status === "COMPLETED").length,
    critical: (criticalQuery.data ?? []).filter((a) => a.status === "OPEN").length,
  };

  const loading = readyQuery.isPending || enteredQuery.isPending;
  const error = readyQuery.error ?? enteredQuery.error;

  function actionLabel(o: LabOrderDto): string {
    if (TO_COLLECT.has(o.status)) return "Collect sample";
    if (o.status === "IN_PROGRESS") return "Enter results";
    return "Check and authorise";
  }

  return (
    <div className="space-y-4">
      <div className={seesInbox ? "grid grid-cols-2 gap-3 lg:grid-cols-4" : "grid grid-cols-2 gap-3 lg:grid-cols-3"}>
        <Stat label="To collect" value={stats.collect} />
        <Stat label="Being tested" value={stats.testing} />
        <Stat label="Waiting to authorise" value={stats.authorise} />
        {seesInbox && !criticalQuery.isError && <Stat label="Critical, doctor not seen yet" value={stats.critical} />}
      </div>

      <RadioGroup aria-label="Show" value={filter} onValueChange={(v) => setFilter(v as Filter)} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <ChoiceOption key={f.value} className="py-1.5">
            <RadioGroupItem value={f.value} />
            {f.label}
          </ChoiceOption>
        ))}
      </RadioGroup>

      <WaitingList
        items={loading ? undefined : shown}
        isLoading={loading}
        error={error ?? undefined}
        onRetry={() => {
          void readyQuery.refetch();
          void enteredQuery.refetch();
        }}
        presorted
        getRowId={(o) => o.id}
        getPatient={(o) => ({ name: naturalName(o.patientName), hospitalNumber: o.patientPublicId })}
        getArrivedAt={(o) => o.orderedAt ?? new Date().toISOString()}
        getWhat={(o) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{o.serviceName}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill tone={labUrgencyAsTriage(o.priority) === "EMERGENCY" ? "error" : labUrgencyAsTriage(o.priority) === "URGENT" ? "warning" : "neutral"}>
                {labUrgencyLabel(o.priority)}
              </StatusPill>
              {isWaitingToPay(o) && <StatusPill tone="pending">Waiting to pay</StatusPill>}
            </div>
            <p className="text-xs text-muted-foreground">Requested by {cleanPersonName(o.orderedByName) || "a clinician"}</p>
          </div>
        )}
        getStatus={(o) => labStatus(o.status)}
        primaryActionLabel={actionLabel}
        getActionDisabledReason={(o) => (isWaitingToPay(o) ? "Waiting for payment at the cashier" : null)}
        onOpen={(o) => router.push(`/laboratory?view=results&orderId=${o.id}`)}
        refetchIntervalMs={REFRESH_MS}
        empty={
          filter === "all"
            ? {
                illustration: "all-done",
                tone: "good-news",
                title: "No tests waiting",
                description: "New requests from doctors will appear here.",
              }
            : {
                illustration: "no-results",
                title: "Nothing here right now",
                description: "No tests are at this step.",
                action: { label: "Show everything", onClick: () => setFilter("all") },
              }
        }
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
    </div>
  );
}
