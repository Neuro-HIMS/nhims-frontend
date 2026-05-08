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
  | "WARD"
  | "COMPLETED";

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

export interface ClassificationSummaryDto {
  id: string;
  name: string;
  /** Optional extra wording beyond {@link name}. */
  description: string | null;
  icd11Code: string;
}

export interface ConsultationNoteAdditionalDiagnosisDto {
  id: string;
  classificationId: string | null;
  classificationName: string | null;
  classificationDescription: string | null;
  icd11Code: string | null;
  freeText: string;
  newCase: boolean;
  oldCase: boolean;
  sortOrder: number;
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
  /** Legacy field; new notes leave this empty. */
  icd10Code: string;
  provisionalDiagnosis: string;
  provisionalClassificationId: string | null;
  provisionalClassification: ClassificationSummaryDto | null;
  principalClassification: ClassificationSummaryDto | null;
  principalDiagnosisNewCase: boolean;
  principalDiagnosisOldCase: boolean;
  additionalDiagnoses?: ConsultationNoteAdditionalDiagnosisDto[];
  editableToday: boolean;
  authoredByName: string;
  authoredRole: string;
  authoredAt: string | null;
}

export interface AdditionalDiagnosisInputPayload {
  classificationId?: string | null;
  freeText?: string;
  newCase?: boolean;
  oldCase?: boolean;
}

export interface CreateConsultationNotePayload {
  provisionalDiagnosis?: string;
  provisionalClassificationId?: string | null;
  principalClassificationId?: string | null;
  principalDiagnosisNewCase?: boolean;
  principalDiagnosisOldCase?: boolean;
  additionalDiagnoses?: AdditionalDiagnosisInputPayload[];
  chiefComplaint?: string;
  historyOfPresentComplaint?: string;
  examinationFindings?: string;
  assessment?: string;
  plan?: string;
  authoredRole?: string;
}

// ── Clinical service catalog (read-only look-up) ─────────────────────────
export type LabResultPanelCode = "NONE" | "MALARIA_PANEL";

export interface ClinicalServiceDto {
  id: string;
  serviceCode: string;
  serviceName: string;
  serviceGroup: string;
  nhisTariffCode: string;
  description: string;
  active: boolean;
  /** NONE | MALARIA_PANEL for LAB rows */
  labResultPanel?: LabResultPanelCode | string;
}

/** Facility diagnosis classifications catalogue (consultation pickers). */
export interface ClinicalConditionDto {
  id: string;
  /** Primary condition title — unique per facility (case-insensitive). */
  name: string;
  /** Optional short elaboration; may be null/empty. */
  description: string | null;
  icdHint: string;
  icd11Code: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalConditionPageDto {
  content: ClinicalConditionDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ClassificationImportResultDto {
  imported: number;
  skipped: number;
  errors: string[];
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
  consultationNoteId: string | null;
  provisionalClassificationId: string | null;
  /** Snapshot from latest consultation when order was placed */
  provisionalDiagnosisLabel: string;
  labResultPanel: LabResultPanelCode | string;
  specimenType: string;
  sourceOfRequest: string;
  sampleReceivedAt: string | null;
  pathologyNumber: string | null;
  malariaPanelJson: string | null;
  orderedByName: string;
  orderedAt: string | null;
  billItemId: string | null;
  payerType: string;
  startedAt: string | null;
  completedAt: string | null;
  authorisedAt: string | null;
  results: LabResultRowDto[];
}

export interface LabCriticalAlertDto {
  id: string;
  labOrderId: string;
  encounterId: string;
  patientId: string;
  orderingClinicianId: string | null;
  patientPublicId: string;
  serviceName: string;
  summary: string;
  status: "OPEN" | "ACKED";
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedById: string | null;
}

export type LabSourceOfRequest =
  | "CONSULTING_ROOM"
  | "WARD"
  | "ANC"
  | "WALK_IN"
  | "OTHER";

export interface SubmitLabResultsPathologyPayload {
  specimenType: string;
  sourceOfRequest: LabSourceOfRequest | string;
  /** ISO-8601 offset datetime preferred */
  sampleReceivedAt: string;
  /** Structured malaria / RDT worksheet — required when labResultPanel is MALARIA_PANEL */
  malariaPanel?: Record<string, unknown> | null;
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
  pathology: SubmitLabResultsPathologyPayload;
}

// ── Radiology / imaging orders ───────────────────────────────────────────
export type RadiologyOrderStatus =
  | "ORDERED"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface RadiologyOrderDto {
  id: string;
  encounterId: string;
  encounterNumber: string;
  patientId: string | null;
  patientPublicId: string;
  patientName: string;
  patientSex: string;
  patientDob: string;
  serviceId: string | null;
  serviceCode: string;
  serviceName: string;
  modality: string;
  studyName: string;
  status: RadiologyOrderStatus;
  priority: "ROUTINE" | "URGENT" | "EMERGENCY" | "STAT";
  clinicalNotes: string;
  payerType: string;
  orderedByName: string;
  orderedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  reportText: string;
  reportedByName: string;
  cancellationReason: string;
  /** Minor units — from linked bill item */
  lineTotalMinor: number;
}

export interface CreateRadiologyOrderPayload {
  serviceId: string;
  modality?: string;
  studyName?: string;
  priority?: "ROUTINE" | "URGENT" | "EMERGENCY" | "STAT";
  clinicalNotes?: string;
  payerType?: string;
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
  /** Pesewas — from encounter bill line at order time */
  unitPriceMinor?: number | null;
  currency?: string | null;
  /** Heuristic doses/day × duration — worksheet verification */
  sigSuggestedQuantity?: string | number | null;
  /** When set, stock lots exist for this catalog-mapped inventory item */
  pharmacyInventoryItemId?: string | null;
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
  encounterNumber: string;
  patientSex: string;
  patientAgeDisplay: string;
  dispensaryDiagnosisSnapshot: string;
  consultationChiefComplaintSnapshot: string;
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
  stockLotId: string;
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
  wardStructuredId: string | null;
  bedStructuredId: string | null;
  reason: string;
  status: AdmissionStatus;
  admittedByName: string;
  admittedAt: string | null;
  dischargedAt: string | null;
  dischargeSummary: string;
  dischargedByName: string;
  dischargeOutcome: string;
  dischargeIcd11Codes: string;
  dischargeMedicationSummary: string;
  followUpPlan: string;
}

export interface AdmitPayload {
  ward: string;
  bed?: string;
  reason?: string;
  /** When set, ward/bed strings are derived server-side from the IPD catalogue. */
  bedId?: string | null;
}

export interface DischargePayload {
  summary: string;
  outcome?: string;
  icd11Codes?: string;
  dischargeMedicationSummary?: string;
  followUpPlan?: string;
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
  assignedToUserId: string | null;
  assignedToName: string | null;
}

export interface CreateReferralPayload {
  fromDepartment?: string;
  toDepartment: string;
  urgency?: ReferralUrgency;
  reason: string;
  /** Optional receiving clinician in the same facility (queues under assignee=me). */
  assignedToUserId?: string | null;
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
