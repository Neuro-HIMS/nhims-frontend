"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { bedKey, type BedState } from "@/lib/wards";
import { clinicalService } from "@/services/clinical.service";
import { ipdService, type GoingHome } from "@/services/ipd.service";
import type { AdmissionDto } from "@/types/clinical.types";
import type { ConfiguredBed, ConfiguredWard } from "@/types/ipd.types";

export interface BoardBed extends ConfiguredBed {
  state: BedState;
  admission: AdmissionDto | null;
  goingHome: GoingHome | null;
  key: string;
}

export interface BoardWard extends Omit<ConfiguredWard, "beds"> {
  beds: BoardBed[];
  free: BoardBed[];
}

/**
 * The bed board for every ward screen (beds, admit, settings). Occupancy is worked out here from the
 * active admissions on each render, so the board can't drift from them (no stale cache).
 */
export function useWardBoard() {
  const sourceQuery = useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => ipdService.wardSource(),
    refetchInterval: 30_000,
  });
  const activeQuery = useQuery({
    queryKey: queryKeys.ipd.activeAdmissions,
    queryFn: () => clinicalService.activeAdmissions(),
    refetchInterval: 30_000,
  });
  const localQuery = useQuery({
    queryKey: queryKeys.ipd.goingHome,
    queryFn: () => ({
      goingHome: ipdService.goingHome(),
      cleaning: ipdService.cleaningBeds(),
    }),
    staleTime: 0,
  });

  const wards = useMemo<BoardWard[]>(() => {
    const src = sourceQuery.data;
    if (!src) return [];
    const active = activeQuery.data ?? [];
    const byId = new Map(active.map((a) => [a.id, a] as const));
    const byBed = new Map(
      active
        .filter((a) => a.bed)
        .map((a) => [bedKey(a.ward, a.bed), a] as const),
    );
    const leaving = new Map(
      (localQuery.data?.goingHome ?? [])
        .filter((g) => g.bed)
        .map((g) => [bedKey(g.ward, g.bed), g] as const),
    );
    const cleaning = new Set(localQuery.data?.cleaning ?? []);
    return src.wards.map((w) => {
      const beds = w.beds.map((b): BoardBed => {
        const key = bedKey(w.name, b.label);
        const serverAdmissionId = src.occupiedByServer?.get(b.id);
        const admission =
          (serverAdmissionId ? byId.get(serverAdmissionId) : undefined) ??
          byBed.get(key) ??
          null;
        const occupied =
          Boolean(admission) || (src.occupiedByServer?.has(b.id) ?? false);
        const goingHome = leaving.get(key) ?? null;
        const state: BedState = occupied
          ? "OCCUPIED"
          : goingHome
            ? "GOING_HOME"
            : cleaning.has(key)
              ? "CLEANING"
              : "FREE";
        return { ...b, state, admission, goingHome, key };
      });
      return { ...w, beds, free: beds.filter((b) => b.state === "FREE") };
    });
  }, [sourceQuery.data, activeQuery.data, localQuery.data]);

  return {
    wards,
    sample: sourceQuery.data?.sample ?? false,
    isPending: sourceQuery.isPending || activeQuery.isPending,
    error: sourceQuery.error ?? activeQuery.error ?? null,
    refetch: () => {
      void sourceQuery.refetch();
      void activeQuery.refetch();
      void localQuery.refetch();
    },
  };
}
