"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { formatClinicalDateTime } from "@/lib/dates";
import { naturalName } from "@/lib/display-name";
import { canRecordWardCare } from "@/lib/permissions";
import { DISCHARGE_OUTCOMES } from "@/lib/wards";
import { ipdService, type GoingHome } from "@/services/ipd.service";
import { useAuthStore } from "@/store/auth.store";

/** NUR-10 — patients the doctor has discharged: confirm they've left, then the bed goes for cleaning. */
export function GoingHomeView() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [confirming, setConfirming] = useState<GoingHome | null>(null);
  const [, setTick] = useState(0);

  if (!ipdService.goingHomeAvailable()) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState
          illustration="all-done"
          tone="good-news"
          title="Beds are freed at discharge"
          description="When a doctor discharges a patient, their bed shows as free straight away. Confirming that the patient has left and the bed is clean isn't available yet."
        />
      </div>
    );
  }

  const list = ipdService.goingHome();
  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState illustration="all-done" tone="good-news" title="No one is waiting to go home" description="Patients the doctor discharges appear here until you confirm they've left." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {list.map((g) => (
          <li key={g.admissionId} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{naturalName(g.patientName)}</p>
              <p className="text-xs text-muted-foreground">
                {g.ward}
                {g.bed ? `, bed ${g.bed}` : ""} · discharged {formatClinicalDateTime(g.dischargedAt)}
              </p>
            </div>
            <StatusPill tone="info">{DISCHARGE_OUTCOMES.find((o) => o.code === g.outcome)?.label ?? "Ready to go home"}</StatusPill>
            {canRecordWardCare(role) && (
              <Button size="sm" variant="outline" onClick={() => setConfirming(g)}>
                Confirm they&apos;ve left
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Confirm ${naturalName(confirming?.patientName ?? "")} has left ${confirming?.ward ?? "the ward"}?`}
        description={confirming?.bed ? `Bed ${confirming.bed} will be marked for cleaning.` : "They'll leave this list."}
        confirmLabel="Yes, they've left"
        cancelLabel="Not yet"
        onConfirm={() => {
          if (!confirming) return;
          ipdService.confirmLeft(confirming);
          void qc.invalidateQueries({ queryKey: ["ipd"] });
          toast.success(confirming.bed ? `Bed ${confirming.bed} is marked for cleaning.` : "Done.");
          setConfirming(null);
          setTick((t) => t + 1);
        }}
      />
    </div>
  );
}
