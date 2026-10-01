import type { BedBoardDto, IpdBoardDto } from "@/types/ipd.types";

/**
 * Sample wards (area `ipd-wards`) for a facility that has none set up — backend-gaps.md#WRD-setup.
 * Beds have no catalogue id (`sample-…`), so admissions use the ward and bed names.
 */
const SAMPLE: { name: string; code: string; prefix: string; beds: number }[] = [
  { name: "Male Medical Ward", code: "MMW", prefix: "MM", beds: 8 },
  { name: "Female Medical Ward", code: "FMW", prefix: "FM", beds: 8 },
  { name: "Children's Ward", code: "CW", prefix: "CW", beds: 6 },
];

export function sampleBoard(occupied: Map<string, { admissionId: string; patientName: string; patientPublicId: string }>, key: (ward: string, bed: string) => string): IpdBoardDto {
  return {
    wards: SAMPLE.map((w) => ({
      id: `sample-${w.code}`,
      name: w.name,
      code: w.code,
      beds: Array.from({ length: w.beds }, (_, i): BedBoardDto => {
        const label = `${w.prefix}-${String(i + 1).padStart(2, "0")}`;
        const who = occupied.get(key(w.name, label));
        return {
          id: `sample-${w.code}-${i + 1}`,
          label,
          occupied: Boolean(who),
          activeAdmissionId: who?.admissionId ?? null,
          patientName: who?.patientName ?? "",
          patientPublicId: who?.patientPublicId ?? "",
        };
      }),
    })),
  };
}

/** Beds waiting to be cleaned after a patient left (area `bed-cleaning`) — backend-gaps.md#NUR-10. */
export interface GoingHome {
  admissionId: string;
  patientName: string;
  ward: string;
  bed: string;
  dischargedAt: string;
  outcome: string;
  left: boolean;
}

const goingHome = new Map<string, GoingHome>();
const cleaning = new Set<string>();

export function mockAddGoingHome(g: GoingHome): void {
  goingHome.set(g.admissionId, g);
}

export function mockGoingHome(): GoingHome[] {
  return [...goingHome.values()].filter((g) => !g.left).sort((a, b) => a.dischargedAt.localeCompare(b.dischargedAt));
}

export function mockConfirmLeft(admissionId: string, bedKey: string): void {
  const g = goingHome.get(admissionId);
  if (g) g.left = true;
  if (bedKey) cleaning.add(bedKey);
}

export function mockCleaningBeds(): string[] {
  return [...cleaning];
}

export function mockBedReady(bedKey: string): void {
  cleaning.delete(bedKey);
}
