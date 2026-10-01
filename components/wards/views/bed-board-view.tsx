"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BedDouble } from "lucide-react";
import { toast } from "sonner";

import { AdmitDialog } from "@/components/wards/admit-dialog";
import { useWardBoard } from "@/components/wards/use-ward-board";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { naturalName } from "@/lib/display-name";
import {
  canAdmitAndDischarge,
  canRecordWardCare,
  isAdmin,
} from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { bedKindLabel, bedState, dayOfStay } from "@/lib/wards";
import { ipdService } from "@/services/ipd.service";
import { useAuthStore } from "@/store/auth.store";

/** NUR-07 — every bed, who's in it and for how long. */
export function BedBoardView() {
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const admin = Boolean(role && isAdmin(role));
  const [wardFilter, setWardFilter] = useState<string>("ALL");
  const [admitAt, setAdmitAt] = useState<{ ward: string; bed: string } | null>(
    null,
  );
  const board = useWardBoard();

  if (board.error)
    return <ErrorState error={board.error} onRetry={board.refetch} />;
  if (board.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (board.wards.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState
          illustration="empty-list"
          title="No wards set up yet"
          description={
            admin
              ? "Add the hospital's wards and beds in Facility settings."
              : "Ask the facility administrator to set up the wards and beds."
          }
          action={
            admin
              ? { label: "Set up wards", href: "/facility?view=wards" }
              : undefined
          }
        />
      </div>
    );
  }

  const wards = board.wards.filter(
    (w) => wardFilter === "ALL" || w.id === wardFilter,
  );

  return (
    <div className="space-y-4">
      {board.sample && (
        <InlineNotice tone="info">
          These wards are set up in this browser (sample data) until ward set-up
          is available on the server. Admissions are real.
          {admin && (
            <>
              {" "}
              <Link
                href="/facility?view=wards"
                className="font-medium underline"
              >
                Change wards and beds
              </Link>
            </>
          )}
        </InlineNotice>
      )}
      <div role="tablist" aria-label="Ward" className="flex flex-wrap gap-2">
        {[{ id: "ALL", name: "All wards" }, ...board.wards].map((w) => (
          <button
            key={w.id}
            role="tab"
            type="button"
            aria-selected={wardFilter === w.id}
            onClick={() => setWardFilter(w.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              wardFilter === w.id
                ? "border-primary bg-primary-soft font-medium text-primary"
                : "border-border bg-card hover:bg-muted/50",
            )}
          >
            {w.name}
          </button>
        ))}
      </div>

      {wards.map((ward) => {
        const used = ward.beds.filter((b) => b.state === "OCCUPIED").length;
        return (
          <section
            key={ward.id}
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {ward.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {used} of {ward.beds.length} beds used · {ward.free.length} free
              </p>
            </div>
            {ward.beds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No beds in this ward yet.
              </p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                {ward.beds.map((bed) => {
                  const pill = bedState(bed.state);
                  const day = dayOfStay(bed.admission?.admittedAt);
                  return (
                    <li key={bed.id}>
                      <div
                        className={cn(
                          "flex h-full flex-col gap-1.5 rounded-lg border p-3 text-sm",
                          bed.state === "OCCUPIED"
                            ? "border-primary-border bg-primary-soft/40"
                            : "border-border bg-card",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-clinical font-semibold whitespace-nowrap text-foreground">
                            <BedDouble
                              className="h-4 w-4 text-muted-foreground"
                              aria-hidden="true"
                            />{" "}
                            {bed.label}
                          </span>
                          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                        </div>
                        {bed.state === "OCCUPIED" ? (
                          <button
                            type="button"
                            className="text-left hover:underline"
                            disabled={!bed.admission}
                            onClick={() =>
                              bed.admission &&
                              router.push(
                                `/wards?view=admission&admissionId=${bed.admission.id}`,
                              )
                            }
                          >
                            <span className="block truncate font-medium text-foreground">
                              {bed.admission
                                ? naturalName(bed.admission.patientName)
                                : "Occupied"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {day
                                ? `Day ${day}`
                                : (bed.admission?.patientPublicId ?? "")}
                            </span>
                          </button>
                        ) : bed.state === "GOING_HOME" ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {bed.goingHome
                              ? `${naturalName(bed.goingHome.patientName)} is leaving`
                              : ""}
                          </span>
                        ) : bed.state === "CLEANING" ? (
                          canRecordWardCare(role) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                ipdService.markBedReady(bed.key);
                                void qc.invalidateQueries({
                                  queryKey: queryKeys.ipd.goingHome,
                                });
                                toast.success(
                                  `Bed ${bed.label} is ready for the next patient.`,
                                );
                              }}
                            >
                              Mark bed ready
                            </Button>
                          )
                        ) : (
                          canAdmitAndDischarge(role) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="justify-start px-0"
                              onClick={() =>
                                setAdmitAt({ ward: ward.name, bed: bed.label })
                              }
                            >
                              Admit a patient here
                            </Button>
                          )
                        )}
                        {bed.kind !== "STANDARD" && bed.state === "FREE" && (
                          <span className="text-xs text-muted-foreground">
                            {bedKindLabel(bed.kind)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <AdmitDialog
        open={admitAt !== null}
        onOpenChange={(o) => !o && setAdmitAt(null)}
        presetWard={admitAt?.ward}
        presetBed={admitAt?.bed}
      />
    </div>
  );
}
