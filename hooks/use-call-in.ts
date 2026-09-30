"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { displayName } from "@/lib/display-name";
import { getFriendlyError } from "@/lib/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import type { EncounterDto } from "@/types/clinical.types";

/**
 * DOC-01 "Call in": assign the visit to me and move it to "With doctor", so every
 * other doctor's and nurse's list shows it as taken.
 */
export function useCallIn(onCalledIn?: (e: EncounterDto) => void) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (encounter: EncounterDto) => {
      if (user && encounter.assignedClinicianId !== user.userId) {
        await clinicalService.assignClinician(encounter.id, {
          clinicianUserId: user.userId,
          clinicianName: displayName(user) || undefined,
        });
      }
      if (encounter.status === "IN_CONSULTATION") return encounter;
      return clinicalService.transition(encounter.id, { to: "IN_CONSULTATION", station: "CONSULTATION" });
    },
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      qc.invalidateQueries({ queryKey: queryKeys.opd.queue });
      onCalledIn?.(e);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });
}
