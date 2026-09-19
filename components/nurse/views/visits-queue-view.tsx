"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WaitingList } from "@/components/clinical/waiting-list";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { encounterStatusLabel, encounterStatusTone } from "@/lib/status-labels";
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import type { EncounterDto, TriagePriorityCode } from "@/types/clinical.types";

export function VisitsQueueView() {
  const router = useRouter();
  const qc = useQueryClient();

  const todayQuery = useQuery({
    queryKey: queryKeys.clinical.today,
    queryFn: () => clinicalService.today(),
    refetchInterval: 30_000,
  });

  const checkInMut = useMutation({
    mutationFn: (id: string) => clinicalService.transition(id, { to: "AT_VITALS" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clinical.all }),
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const [stageFilter, setStageFilter] = useState("ALL");
  const [triageFilter, setTriageFilter] = useState("ALL");
  const [clinicFilter, setClinicFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const list = useMemo(() => todayQuery.data ?? [], [todayQuery.data]);

  const clinics = useMemo(
    () => Array.from(new Set(list.map((e) => e.department).filter(Boolean))).sort(),
    [list],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((e) => {
      if (stageFilter !== "ALL" && e.status !== stageFilter) return false;
      if (triageFilter !== "ALL" && e.priority !== triageFilter) return false;
      if (clinicFilter !== "ALL" && e.department !== clinicFilter) return false;
      if (!q) return true;
      return (
        e.patientName.toLowerCase().includes(q) ||
        e.patientPublicId.toLowerCase().includes(q) ||
        e.encounterNumber.toLowerCase().includes(q)
      );
    });
  }, [list, stageFilter, triageFilter, clinicFilter, query]);

  const stats = useMemo(
    () => ({
      waitingForVitals: list.filter((e) => e.status === "AT_VITALS").length,
      waitingForDoctor: list.filter((e) => e.status === "AT_CONSULTATION").length,
      withDoctor: list.filter((e) => e.status === "IN_CONSULTATION").length,
      finishedToday: list.filter((e) => e.status === "COMPLETED").length,
    }),
    [list],
  );

  function openEncounter(e: EncounterDto) {
    if (e.status === "SCHEDULED") {
      checkInMut.mutate(e.id, {
        onSuccess: () => router.push(`/nurse?view=triage&encounterId=${e.id}&patientId=${e.patientId}`),
      });
      return;
    }
    if (e.status === "AT_VITALS") {
      router.push(`/nurse?view=triage&encounterId=${e.id}&patientId=${e.patientId}`);
      return;
    }
    router.push(`/nurse?view=folder&patientId=${e.patientId}&visitId=${e.id}`);
  }

  function actionLabel(e: EncounterDto): string {
    if (e.status === "SCHEDULED" || e.status === "CHECKED_IN") return "Start triage";
    if (e.status === "AT_VITALS") return "Record vitals";
    return "Open";
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip label="Waiting for vitals" value={stats.waitingForVitals} />
        <StatChip label="Waiting for doctor" value={stats.waitingForDoctor} />
        <StatChip label="With doctor" value={stats.withDoctor} />
        <StatChip label="Finished today" value={stats.finishedToday} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, hospital number, or visit number"
          className="max-w-xs"
        />
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Every stage</SelectItem>
            <SelectItem value="SCHEDULED">Booked</SelectItem>
            <SelectItem value="CHECKED_IN">Checked in</SelectItem>
            <SelectItem value="AT_VITALS">Waiting for vitals</SelectItem>
            <SelectItem value="AT_CONSULTATION">Waiting for doctor</SelectItem>
            <SelectItem value="IN_CONSULTATION">With doctor</SelectItem>
            <SelectItem value="COMPLETED">Finished</SelectItem>
          </SelectContent>
        </Select>
        <Select value={triageFilter} onValueChange={setTriageFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Every urgency</SelectItem>
            <SelectItem value="EMERGENCY">Emergency</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="ROUTINE">Routine</SelectItem>
          </SelectContent>
        </Select>
        {clinics.length > 1 && (
          <Select value={clinicFilter} onValueChange={setClinicFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Every clinic</SelectItem>
              {clinics.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <WaitingList
        items={todayQuery.isPending ? undefined : filtered}
        isLoading={todayQuery.isPending}
        error={todayQuery.isError ? todayQuery.error : undefined}
        onRetry={() => void todayQuery.refetch()}
        getRowId={(e) => e.id}
        getPatient={(e) => ({ name: e.patientName, hospitalNumber: e.patientPublicId })}
        getPriority={(e) => (e.priority as TriagePriorityCode) || "PENDING"}
        getArrivedAt={(e) => e.checkedInAt ?? e.scheduledFor ?? e.createdAt ?? new Date().toISOString()}
        getWhat={(e) => e.reason || e.serviceName}
        getStatus={(e) => ({ label: encounterStatusLabel(e.status), tone: encounterStatusTone(e.status) })}
        primaryActionLabel={actionLabel}
        onOpen={openEncounter}
        refetchIntervalMs={30_000}
        empty={{
          illustration: "all-done",
          tone: "good-news",
          title: "No patients waiting",
          description: "Everyone has been seen.",
        }}
      />
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
