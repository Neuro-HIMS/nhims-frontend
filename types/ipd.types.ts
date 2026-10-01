/** IPD ward board — mirrors {@link com.nero.hims.ipd.api.dto.IpdBoardDto}. */

export interface NursingTaskStubDto {
  id: string;
  label: string;
  status: string;
  admissionId: string;
  patientName: string;
  detail: string;
}

export interface IpdNursingOverviewDto {
  marTasks: NursingTaskStubDto[];
  tprTasks: NursingTaskStubDto[];
  notice: string;
}

export interface IpdMarEntryDto {
  id: string;
  admissionId: string;
  scheduledFor: string;
  drugDisplay: string;
  dose: string;
  route: string;
  status: string;
  givenAt: string | null;
  notes: string;
}

export interface IpdTprReadingDto {
  id: string;
  admissionId: string;
  recordedAt: string;
  tempC: string;
  pulse: string;
  respRate: string;
  bpSys: string;
  bpDia: string;
  notes: string;
}

export interface IpdBoardDto {
  wards: WardBoardDto[];
}

export interface WardBoardDto {
  id: string;
  name: string;
  code: string;
  beds: BedBoardDto[];
}

export interface BedBoardDto {
  id: string;
  label: string;
  occupied: boolean;
  activeAdmissionId: string | null;
  patientName: string;
  patientPublicId: string;
}

// ── Ward set-up (facility settings) — sample data until the backend has ward/bed endpoints
//    (backend-gaps.md#WRD-setup). ─────────────────────────────────────────────────────────

export type WardKind = "GENERAL" | "MATERNITY" | "CHILDREN" | "SURGICAL" | "INTENSIVE" | "ISOLATION" | "PRIVATE" | "OTHER";
export type WardFor = "MEN" | "WOMEN" | "CHILDREN" | "MIXED";
export type BedKind = "STANDARD" | "PRIVATE" | "INTENSIVE" | "COT" | "DELIVERY";

export interface ConfiguredBed {
  id: string;
  label: string;
  kind: BedKind;
  notes: string;
  active: boolean;
}

export interface ConfiguredWard {
  id: string;
  name: string;
  code: string;
  kind: WardKind;
  for: WardFor;
  floor: string;
  notes: string;
  active: boolean;
  beds: ConfiguredBed[];
}
