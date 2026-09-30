"use client";

import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle, FlaskConical } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { WaitingList } from "@/components/clinical/waiting-list";
import { Button } from "@/components/ui/button";
import { ChoiceOption } from "@/components/ui/choice-option";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCallIn } from "@/hooks/use-call-in";
import { cleanPersonName, naturalName } from "@/lib/display-name";
import { canPlaceOrders } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { isOnTodaysList } from "@/lib/todays-visits";
import { encounterStatusLabel, encounterStatusTone } from "@/lib/status-labels";
import { flagVital, isDangerFlag, type VitalKey } from "@/lib/vitals-ranges";
import { cn } from "@/lib/utils";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { EncounterDto, LabOrderDto, TriagePriorityCode, VitalsDto } from "@/types/clinical.types";

type Scope = "mine" | "all";

const LAB_DONE = new Set(["AUTHORISED", "COMPLETED", "CANCELLED"]);
const REFRESH_MS = 30_000;

/** Age from the encounter's date of birth, for vitals flags only. Adult ranges are never assumed. */
function ageYears(e: EncounterDto): number | null {
  if (!e.patientDob) return null;
  const ms = Date.now() - new Date(e.patientDob).getTime();
  return Number.isNaN(ms) ? null : ms / (365.25 * 24 * 3600 * 1000);
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/** DOC-01 — Patients waiting for me: most urgent first, call the next one in. */
export function OpdConsultQueue() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [scope, setScope] = useState<Scope>("mine");

  const todayQuery = useQuery({
    queryKey: queryKeys.clinical.today,
    queryFn: () => clinicalService.today(),
    refetchInterval: REFRESH_MS,
  });

  const openConsult = (e: EncounterDto) => router.push(`/opd?view=consult&encounterId=${e.id}`);
  const callIn = useCallIn(openConsult);
  // Only prescribers take a patient ("Call in" assigns them and moves the visit to "With doctor").
  const canCallIn = canPlaceOrders(user?.role);

  const all = useMemo(() => (todayQuery.data ?? []).filter(isOnTodaysList), [todayQuery.data]);
  const inScope = (e: EncounterDto) =>
    scope === "all" || !user || !e.assignedClinicianId || e.assignedClinicianId === user.userId;

  const waiting = all.filter((e) => (e.status === "AT_CONSULTATION" || e.status === "IN_CONSULTATION") && inScope(e));
  const atLab = all.filter((e) => e.status === "AT_LAB" && inScope(e));

  // Vitals for the rows on screen — one small request each, refreshed with the list.
  const vitalsQueries = useQueries({
    queries: waiting.map((e) => ({
      queryKey: queryKeys.clinical.vitals(e.id),
      queryFn: () => clinicalService.encounterVitals(e.id),
      staleTime: REFRESH_MS,
    })),
  });
  const vitalsById = new Map<string, VitalsDto | undefined>(
    waiting.map((e, i) => [
      e.id,
      [...(vitalsQueries[i]?.data ?? [])].sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""))[0],
    ]),
  );

  const labQueries = useQueries({
    queries: atLab.map((e) => ({
      queryKey: queryKeys.clinical.labOrders(e.id),
      queryFn: () => clinicalService.listLabOrdersForEncounter(e.id),
      staleTime: REFRESH_MS,
      refetchInterval: REFRESH_MS,
    })),
  });
  const labRows = atLab.map((e, i) => {
    const orders: LabOrderDto[] = (labQueries[i]?.data ?? []).filter((o) => o.status !== "CANCELLED");
    const back = orders.length > 0 && orders.every((o) => LAB_DONE.has(o.status));
    return { encounter: e, orders, back, loading: labQueries[i]?.isPending ?? false };
  });

  const stats = {
    waiting: waiting.filter((e) => e.status === "AT_CONSULTATION").length,
    withMe: all.filter((e) => e.status === "IN_CONSULTATION" && e.assignedClinicianId === user?.userId).length,
    resultsBack: labRows.filter((r) => r.back).length,
    finished: all.filter((e) => e.status === "COMPLETED" && isToday(e.completedAt) && inScope(e)).length,
  };

  function actionLabel(e: EncounterDto): string {
    if (e.status === "AT_CONSULTATION" && canCallIn) return "Call in";
    if (e.assignedClinicianId === user?.userId) return "Continue";
    return "Open";
  }

  function onOpen(e: EncounterDto) {
    if (e.status === "AT_CONSULTATION" && canCallIn) callIn.mutate(e);
    else openConsult(e);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RadioGroup
          aria-label="Whose patients"
          value={scope}
          onValueChange={(v) => setScope(v as Scope)}
          className="grid grid-cols-2 gap-2"
        >
          <ChoiceOption className="py-2">
            <RadioGroupItem value="mine" />
            My patients
          </ChoiceOption>
          <ChoiceOption className="py-2">
            <RadioGroupItem value="all" />
            All doctors
          </ChoiceOption>
        </RadioGroup>
        {scope === "mine" && (
          <p className="text-xs text-muted-foreground">Shows patients sent to you and patients not yet given to a doctor.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatChip label="Waiting" value={stats.waiting} />
        <StatChip label="With me" value={stats.withMe} />
        <StatChip label="Results back" value={stats.resultsBack} />
        <StatChip label="Finished today" value={stats.finished} />
      </div>

      <WaitingList
        items={todayQuery.isPending ? undefined : waiting}
        isLoading={todayQuery.isPending}
        error={todayQuery.isError ? todayQuery.error : undefined}
        onRetry={() => void todayQuery.refetch()}
        getRowId={(e) => e.id}
        getPatient={(e) => ({ name: naturalName(e.patientName), hospitalNumber: e.patientPublicId })}
        getPriority={(e) => (e.priority as TriagePriorityCode) || "PENDING"}
        getArrivedAt={(e) => e.vitalsCompletedAt ?? e.checkedInAt ?? e.createdAt ?? new Date().toISOString()}
        getWhat={(e) => <ComplaintAndVitals encounter={e} vitals={vitalsById.get(e.id)} />}
        getStatus={(e) => ({
          label:
            e.status === "IN_CONSULTATION" && e.assignedClinicianId && e.assignedClinicianId !== user?.userId && cleanPersonName(e.clinicianName)
              ? `With ${cleanPersonName(e.clinicianName)}`
              : encounterStatusLabel(e.status),
          tone: encounterStatusTone(e.status),
        })}
        primaryActionLabel={actionLabel}
        onOpen={onOpen}
        actionsDisabled={callIn.isPending}
        refetchIntervalMs={REFRESH_MS}
        empty={{
          illustration: "all-done",
          tone: "good-news",
          title: scope === "mine" ? "No patients waiting for you" : "No patients waiting for a doctor",
          description: "New patients will appear here after the nurse has seen them.",
        }}
      />

      {labRows.length > 0 && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Waiting for results</h2>
            <p className="text-xs text-muted-foreground">Patients you sent for tests. Open them again when the results are back.</p>
          </div>
          <ul className="divide-y divide-border">
            {labRows.map(({ encounter: e, orders, back, loading }) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{naturalName(e.patientName)}</p>
                  <p className="text-xs text-muted-foreground">
                    <FlaskConical className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    {loading ? "Checking tests…" : orders.map((o) => o.serviceName).join(", ") || "No tests found"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={back ? "success" : "pending"}>{back ? "Results back" : "Results not back yet"}</StatusPill>
                  {back && canCallIn ? (
                    <Button size="sm" disabled={callIn.isPending} onClick={() => callIn.mutate(e)}>
                      Call in again
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openConsult(e)}>
                      Open
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ComplaintAndVitals({ encounter, vitals }: { encounter: EncounterDto; vitals: VitalsDto | undefined }) {
  const age = ageYears(encounter);
  const parts: Array<{ text: string; tone: "normal" | "warning" | "danger" }> = [];
  const num = (v: string | number | null) => (v === null || v === "" ? null : Number(v));
  const tone = (key: VitalKey, v: number | null): "normal" | "warning" | "danger" => {
    if (v === null || !Number.isFinite(v) || age === null) return "normal";
    const f = flagVital(key, v, age);
    return isDangerFlag(f) ? "danger" : f === "normal" ? "normal" : "warning";
  };
  if (vitals) {
    const t = num(vitals.temperatureC);
    if (t !== null) parts.push({ text: `T ${t} °C`, tone: tone("temperature", t) });
    const s = num(vitals.systolicMmHg);
    const d = num(vitals.diastolicMmHg);
    if (s !== null && d !== null) {
      const tones = [tone("systolic", s), tone("diastolic", d)];
      parts.push({ text: `BP ${s}/${d}`, tone: tones.includes("danger") ? "danger" : tones.includes("warning") ? "warning" : "normal" });
    }
    const sp = num(vitals.spo2Pct);
    if (sp !== null) parts.push({ text: `SpO₂ ${sp}%`, tone: tone("spo2", sp) });
  }
  return (
    <div className="space-y-0.5">
      <p className="text-sm text-foreground">{encounter.reason || encounter.serviceName || "—"}</p>
      {parts.length > 0 && (
        <p className="flex flex-wrap gap-x-2 font-clinical text-xs">
          {parts.map((p) => (
            <span
              key={p.text}
              className={cn(
                "inline-flex items-center gap-0.5",
                p.tone === "danger" ? "font-semibold text-destructive" : p.tone === "warning" ? "text-warning" : "text-muted-foreground",
              )}
            >
              {p.tone !== "normal" && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
              {p.text}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
    </div>
  );
}
