"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble } from "lucide-react";
import { toast } from "sonner";

import { AdmitDialog } from "@/components/wards/admit-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { naturalName } from "@/lib/display-name";
import { canAdmitAndDischarge, canRecordWardCare } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { bedKey, bedState, dayOfStay, type BedState } from "@/lib/wards";
import { clinicalService } from "@/services/clinical.service";
import { ipdService } from "@/services/ipd.service";
import { useAuthStore } from "@/store/auth.store";

/** NUR-07 — every bed, who's in it and for how long. */
export function BedBoardView() {
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [wardFilter, setWardFilter] = useState<string>("ALL");
  const [admitAt, setAdmitAt] = useState<{ ward: string; bed: string } | null>(null);
  const [, setTick] = useState(0);

  const activeQuery = useQuery({ queryKey: queryKeys.ipd.activeAdmissions, queryFn: () => clinicalService.activeAdmissions(), refetchInterval: 30_000 });
  const boardQuery = useQuery({
    queryKey: [...queryKeys.ipd.wards, "screen"],
    queryFn: () => ipdService.boardForScreen(activeQuery.data ?? []),
    enabled: activeQuery.isSuccess,
    refetchInterval: 30_000,
  });

  const admissionById = new Map((activeQuery.data ?? []).map((a) => [a.id, a] as const));
  const cleaning = new Set(ipdService.cleaningBeds());

  if (activeQuery.isError || boardQuery.isError) {
    return <ErrorState error={activeQuery.error ?? boardQuery.error} onRetry={() => void (activeQuery.isError ? activeQuery.refetch() : boardQuery.refetch())} />;
  }
  if (activeQuery.isPending || boardQuery.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const { board, sample } = boardQuery.data;
  if (board.wards.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState illustration="empty-list" title="No wards set up yet" description="Ask the system administrator to set up this hospital's wards and beds." />
      </div>
    );
  }

  const wards = board.wards.filter((w) => wardFilter === "ALL" || w.id === wardFilter);
  const stateOf = (wardName: string, bed: { occupied: boolean; label: string }): BedState => (bed.occupied ? "OCCUPIED" : cleaning.has(bedKey(wardName, bed.label)) ? "CLEANING" : "FREE");

  return (
    <div className="space-y-4">
      {sample && <InlineNotice tone="info">Sample wards: this hospital&apos;s wards aren&apos;t set up yet. Admissions are real.</InlineNotice>}
      <div role="tablist" aria-label="Ward" className="flex flex-wrap gap-2">
        {[{ id: "ALL", name: "All wards" }, ...board.wards].map((w) => (
          <button
            key={w.id}
            role="tab"
            type="button"
            aria-selected={wardFilter === w.id}
            onClick={() => setWardFilter(w.id)}
            className={cn("rounded-lg border px-3 py-1.5 text-sm", wardFilter === w.id ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-card hover:bg-muted/50")}
          >
            {w.name}
          </button>
        ))}
      </div>

      {wards.map((ward) => {
        const used = ward.beds.filter((b) => b.occupied).length;
        return (
          <section key={ward.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">{ward.name}</h2>
              <p className="text-sm text-muted-foreground">
                {used} of {ward.beds.length} beds used
              </p>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
              {ward.beds.map((bed) => {
                const st = stateOf(ward.name, bed);
                const pill = bedState(st);
                const adm = bed.activeAdmissionId ? admissionById.get(bed.activeAdmissionId) : undefined;
                const day = dayOfStay(adm?.admittedAt);
                const key = bedKey(ward.name, bed.label);
                return (
                  <li key={bed.id}>
                    <div className={cn("flex h-full flex-col gap-1.5 rounded-lg border p-3 text-sm", st === "OCCUPIED" ? "border-primary-border bg-primary-soft/40" : "border-border bg-card")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-clinical font-semibold text-foreground">
                          <BedDouble className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {bed.label}
                        </span>
                        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                      </div>
                      {st === "OCCUPIED" ? (
                        <button type="button" className="text-left hover:underline" onClick={() => bed.activeAdmissionId && router.push(`/wards?view=admission&admissionId=${bed.activeAdmissionId}`)}>
                          <span className="block truncate font-medium text-foreground">{naturalName(bed.patientName) || bed.patientPublicId}</span>
                          <span className="text-xs text-muted-foreground">{day ? `Day ${day}` : bed.patientPublicId}</span>
                        </button>
                      ) : st === "CLEANING" ? (
                        canRecordWardCare(role) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              ipdService.markBedReady(key);
                              setTick((t) => t + 1);
                              void qc.invalidateQueries({ queryKey: ["ipd"] });
                              toast.success(`Bed ${bed.label} is ready for the next patient.`);
                            }}
                          >
                            Mark bed ready
                          </Button>
                        )
                      ) : (
                        canAdmitAndDischarge(role) && (
                          <Button size="sm" variant="ghost" className="justify-start px-0" onClick={() => setAdmitAt({ ward: ward.name, bed: bed.label })}>
                            Admit a patient here
                          </Button>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <AdmitDialog open={admitAt !== null} onOpenChange={(o) => !o && setAdmitAt(null)} presetWard={admitAt?.ward} presetBed={admitAt?.bed} />
    </div>
  );
}
