// Clinical encounter DTOs that mirror the backend `clinical` package.
// Encounter is the unit of work that flows through the hospital — created
// automatically from each booked appointment.

export type EncounterStatus =
  | "SCHEDULED"
  | "CHECKED_IN"
  | "AT_VITALS"
  | "AT_CONSULTATION"
  | "IN_CONSULTATION"
  | "AT_LAB"
  | "AT_PHARMACY"
  | "AT_BILLING"
  | "ADMITTED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type EncounterStation =
  | "RECEPTION"
  | "VITALS"
  | "CONSULTATION"
  | "LAB"
  | "PHARMACY"
  | "BILLING"
  | "WARD";

export type EncounterPriority = "ROUTINE" | "URGENT" | "EMERGENCY";

export interface EncounterDto {
  id: string;
  facilityId: string;
  encounterNumber: string;
  patientId: string;
  patientPublicId: string;
  patientName: string;
  patientSex: string;
  patientPhone: string;
  patientDob: string;
  appointmentId: string | null;
  appointmentNumber: string;
  billId: string | null;
  status: EncounterStatus;
  currentStation: EncounterStation;
  priority: EncounterPriority;
  visitType: string;
  department: string;
  assignedClinicianId: string | null;
  clinicianName: string;
  serviceName: string;
  payerType: string;
  nhisActiveSnapshot: boolean;
  nhisMemberNoSnapshot: string;
  reason: string;
  notes: string;
  scheduledFor: string | null;
  checkedInAt: string | null;
  vitalsCompletedAt: string | null;
  consultStartedAt: string | null;
  consultCompletedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TransitionEncounterPayload {
  to: EncounterStatus;
  station?: EncounterStation;
  reason?: string;
}

export interface AssignClinicianPayload {
  clinicianUserId: string;
  clinicianName?: string;
}

// ── Vitals ────────────────────────────────────────────────────────────────
export interface VitalsDto {
  id: string;
  encounterId: string;
  patientId: string;
  systolicMmHg: number | null;
  diastolicMmHg: number | null;
  temperatureC: string | number | null;
  pulseBpm: number | null;
  respiratoryRateBpm: number | null;
  spo2Pct: number | null;
  weightKg: string | number | null;
  heightCm: string | number | null;
  bmi: string | number | null;
  painScore: number | null;
  notes: string;
  recordedByName: string;
  recordedAt: string | null;
}

export interface RecordVitalsPayload {
  systolicMmHg?: number | null;
  diastolicMmHg?: number | null;
  temperatureC?: number | null;
  pulseBpm?: number | null;
  respiratoryRateBpm?: number | null;
  spo2Pct?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  painScore?: number | null;
  notes?: string;
}

// ── Triage ────────────────────────────────────────────────────────────────
export type TriagePriorityCode = "ROUTINE" | "URGENT" | "EMERGENCY" | "SEMI_URGENT";

export interface TriageDto {
  id: string;
  encounterId: string;
  priority: TriagePriorityCode;
  acuityScore: number | null;
  chiefComplaint: string;
  reasoning: string;
  recordedByName: string;
  recordedAt: string | null;
}

export interface RecordTriagePayload {
  priority: TriagePriorityCode;
  acuityScore?: number;
  chiefComplaint?: string;
  reasoning?: string;
}

// ── Consultation notes ───────────────────────────────────────────────────
export interface ConsultationNoteDto {
  id: string;
  encounterId: string;
  chiefComplaint: string;
  historyOfPresentComplaint: string;
  examinationFindings: string;
  assessment: string;
  plan: string;
  icd10Code: string;
  authoredByName: string;
  authoredRole: string;
  authoredAt: string | null;
}

export interface CreateConsultationNotePayload {
  chiefComplaint?: string;
  historyOfPresentComplaint?: string;
  examinationFindings?: string;
  assessment?: string;
  plan?: string;
  icd10Code?: string;
  authoredRole?: string;
}

// ── Clinical service catalog (read-only look-up) ─────────────────────────
export interface ClinicalServiceDto {
  id: string;
  serviceCode: string;
  serviceName: string;
  serviceGroup: string;
  nhisTariffCode: string;
  description: string;
  active: boolean;
}

// ── Lab orders ───────────────────────────────────────────────────────────
export type LabOrderStatus =
  | "ORDERED"
  | "PAID"
  | "CLAIMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "AUTHORISED"
  | "CANCELLED";

export interface LabResultRowDto {
  id: string;
  analyte: string;
  value: string;
  units: string;
  referenceRange: string;
  flag: string;
  comment: string;
  recordedByName: string;
  recordedAt: string | null;
}

export interface LabOrderDto {
  id: string;
  encounterId: string;
  patientId: string;
  patientPublicId: string;
  patientName: string;
  serviceId: string | null;
  serviceCode: string;
  serviceName: string;
  status: LabOrderStatus;
  priority: "ROUTINE" | "URGENT" | "EMERGENCY" | "STAT";
  reason: string;
  instructions: string;
  orderedByName: string;
  orderedAt: string | null;
  billItemId: string | null;
  payerType: string;
  startedAt: string | null;
  completedAt: string | null;
  authorisedAt: string | null;
  results: LabResultRowDto[];
}

export interface CreateLabOrderPayload {
  serviceId: string;
  priority?: "ROUTINE" | "URGENT" | "EMERGENCY" | "STAT";
  reason?: string;
  instructions?: string;
  payerType?: string;
}

export interface SubmitLabResultsPayload {
  rows: Array<{
    analyte: string;
    value?: string;
    units?: string;
    referenceRange?: string;
    flag?: string;
    comment?: string;
  }>;
  authoriseImmediately?: boolean;
}

// ── Prescriptions / Pharmacy ─────────────────────────────────────────────
export type PrescriptionStatus =
  | "ORDERED"
  | "AWAITING_PAYMENT"
  | "READY"
  | "PARTIALLY_DISPENSED"
  | "DISPENSED"
  | "CANCELLED";

export type PrescriptionLineStatus =
  | "PENDING"
  | "READY"
  | "PARTIALLY_DISPENSED"
  | "DISPENSED"
  | "CANCELLED";

export interface PrescriptionLineDto {
  id: string;
  serviceId: string | null;
  serviceCode: string;
  drugName: string;
  strength: string;
  form: string;
  route: string;
  frequency: string;
  durationDays: number;
  quantity: string | number;
  dispensedQty: string | number;
  instructions: string;
  status: PrescriptionLineStatus;
  billItemId: string | null;
  payerType: string;
}

export interface DispenseDto {
  id: string;
  lineId: string | null;
  quantity: string | number;
  dispensedByName: string;
  dispensedAt: string | null;
  notes: string;
}

export interface PrescriptionDto {
  id: string;
  encounterId: string | null;
  patientId: string | null;
  patientPublicId: string;
  patientName: string;
  status: PrescriptionStatus;
  notes: string;
  pharmacyNotes: string;
  prescribedByName: string;
  prescribedAt: string | null;
  completedAt: string | null;
  cancellationReason: string;
  lines: PrescriptionLineDto[];
  dispenses: DispenseDto[];
}

export interface CreatePrescriptionLineInput {
  serviceId: string;
  drugName?: string;
  strength?: string;
  form?: string;
  route?: string;
  frequency?: string;
  durationDays?: number;
  quantity: number;
  instructions?: string;
  payerType?: string;
}

export interface CreatePrescriptionPayload {
  notes?: string;
  payerType?: string;
  lines: CreatePrescriptionLineInput[];
}

export interface DispenseLineInput {
  lineId: string;
  quantity: number;
  notes?: string;
}

export interface DispensePayload {
  pharmacyNotes?: string;
  lines: DispenseLineInput[];
}

// ── Admissions / Referrals / Alerts ─────────────────────────────────────
export type AdmissionStatus = "ADMITTED" | "DISCHARGED" | "TRANSFERRED";

export interface AdmissionDto {
  id: string;
  encounterId: string | null;
  patientId: string | null;
  patientPublicId: string;
  patientName: string;
  ward: string;
  bed: string;
  reason: string;
  status: AdmissionStatus;
  admittedByName: string;
  admittedAt: string | null;
  dischargedAt: string | null;
  dischargeSummary: string;
  dischargedByName: string;
}

export interface AdmitPayload {
  ward: string;
  bed?: string;
  reason?: string;
}

export interface DischargePayload {
  summary: string;
}

export type ReferralUrgency = "ROUTINE" | "URGENT" | "STAT";
export type ReferralStatus = "PENDING" | "ACCEPTED" | "COMPLETED" | "REJECTED";

export interface ReferralDto {
  id: string;
  encounterId: string | null;
  patientId: string | null;
  patientPublicId: string;
  patientName: string;
  fromDepartment: string;
  toDepartment: string;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  reason: string;
  response: string;
  referredByName: string;
  referredAt: string | null;
  decidedAt: string | null;
}

export interface CreateReferralPayload {
  fromDepartment?: string;
  toDepartment: string;
  urgency?: ReferralUrgency;
  reason: string;
}

export interface ReferralDecisionPayload {
  decision: "ACCEPT" | "REJECT" | "COMPLETE";
  response?: string;
}

export type MedicalAlertCategory =
  | "ALLERGY"
  | "CHRONIC"
  | "INFECTIOUS"
  | "IMPLANT"
  | "GENERAL";

export type MedicalAlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface MedicalAlertDto {
  id: string;
  patientId: string | null;
  category: MedicalAlertCategory;
  label: string;
  notes: string;
  severity: MedicalAlertSeverity;
  active: boolean;
  recordedByName: string;
  recordedAt: string | null;
  deactivatedAt: string | null;
}

export interface CreateMedicalAlertPayload {
  category?: MedicalAlertCategory;
  label: string;
  notes?: string;
  severity?: MedicalAlertSeverity;
}

// ── Role-shaped folder view ───────────────────────────────────────────────
// The backend resolves which slice the caller's role can see and returns
// `kind: FULL | LAB | PHARMACY | BILLING | RECORDS`. Slices that don't
// apply come back as empty arrays / null so consumers can rely on the
// shape without runtime guards.
import type { BillDto } from "@/types/finance.types";

export type FolderViewKind = "FULL" | "LAB" | "PHARMACY" | "BILLING" | "RECORDS";

export interface FolderViewDto {
  kind: FolderViewKind;
  encounter: EncounterDto;
  vitals: VitalsDto[];
  triage: TriageDto[];
  consultationNotes: ConsultationNoteDto[];
  labOrders: LabOrderDto[];
  prescriptions: PrescriptionDto[];
  admissions: AdmissionDto[];
  referrals: ReferralDto[];
  alerts: MedicalAlertDto[];
  bill: BillDto | null;
}
