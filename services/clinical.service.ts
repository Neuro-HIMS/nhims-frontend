import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { BillDto } from "@/types/finance.types";
import type {
  AdmissionDto,
  AdmitPayload,
  AssignClinicianPayload,
  ClinicalServiceDto,
  ConsultationNoteDto,
  CreateConsultationNotePayload,
  CreateLabOrderPayload,
  CreateMedicalAlertPayload,
  CreatePrescriptionPayload,
  CreateReferralPayload,
  DischargePayload,
  DispensePayload,
  EncounterDto,
  FolderViewDto,
  LabOrderDto,
  LabOrderStatus,
  MedicalAlertDto,
  PrescriptionDto,
  PrescriptionStatus,
  RecordTriagePayload,
  RecordVitalsPayload,
  ReferralDecisionPayload,
  ReferralDto,
  SubmitLabResultsPayload,
  TransitionEncounterPayload,
  TriageDto,
  VitalsDto,
} from "@/types/clinical.types";

/**
 * Client for the `/api/clinical/encounters` surface — the workflow hub
 * for patient visits. Use this instead of the legacy `useEncountersStore`
 * which is being retired.
 */
export const clinicalService = {
  async today(): Promise<EncounterDto[]> {
    const res = await apiClient.get<ApiResponse<EncounterDto[]>>("/clinical/encounters/today");
    return res.data.data;
  },

  async search(params?: {
    status?: string;
    station?: string;
    from?: string;
    to?: string;
  }): Promise<EncounterDto[]> {
    const res = await apiClient.get<ApiResponse<EncounterDto[]>>("/clinical/encounters", { params });
    return res.data.data;
  },

  async byPatient(patientId: string): Promise<EncounterDto[]> {
    const res = await apiClient.get<ApiResponse<EncounterDto[]>>(
      `/clinical/encounters/by-patient/${patientId}`,
    );
    return res.data.data;
  },

  async byId(id: string): Promise<EncounterDto> {
    const res = await apiClient.get<ApiResponse<EncounterDto>>(`/clinical/encounters/${id}`);
    return res.data.data;
  },

  async transition(id: string, payload: TransitionEncounterPayload): Promise<EncounterDto> {
    const res = await apiClient.post<ApiResponse<EncounterDto>>(
      `/clinical/encounters/${id}/transition`,
      payload,
    );
    return res.data.data;
  },

  async assignClinician(id: string, payload: AssignClinicianPayload): Promise<EncounterDto> {
    const res = await apiClient.post<ApiResponse<EncounterDto>>(
      `/clinical/encounters/${id}/assign-clinician`,
      payload,
    );
    return res.data.data;
  },

  async cancel(id: string, reason?: string): Promise<EncounterDto> {
    const res = await apiClient.post<ApiResponse<EncounterDto>>(
      `/clinical/encounters/${id}/cancel`,
      { reason: reason ?? "" },
    );
    return res.data.data;
  },

  async complete(id: string, force = false): Promise<EncounterDto> {
    const res = await apiClient.post<ApiResponse<EncounterDto>>(
      `/clinical/encounters/${id}/complete`,
      null,
      { params: force ? { force: true } : undefined },
    );
    return res.data.data;
  },

  async blockers(id: string): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<string[]>>(
      `/clinical/encounters/${id}/blockers`,
    );
    return res.data.data;
  },

  async encounterBill(id: string): Promise<BillDto | null> {
    const res = await apiClient.get<ApiResponse<BillDto | null>>(
      `/clinical/encounters/${id}/bill`,
    );
    return res.data.data;
  },

  // ── Vitals ──────────────────────────────────────────────────────────────
  async recordVitals(encounterId: string, payload: RecordVitalsPayload): Promise<VitalsDto> {
    const res = await apiClient.post<ApiResponse<VitalsDto>>(
      `/clinical/encounters/${encounterId}/vitals`,
      payload,
    );
    return res.data.data;
  },

  async encounterVitals(encounterId: string): Promise<VitalsDto[]> {
    const res = await apiClient.get<ApiResponse<VitalsDto[]>>(
      `/clinical/encounters/${encounterId}/vitals`,
    );
    return res.data.data;
  },

  async patientVitals(patientId: string): Promise<VitalsDto[]> {
    const res = await apiClient.get<ApiResponse<VitalsDto[]>>(
      `/clinical/patients/${patientId}/vitals`,
    );
    return res.data.data;
  },

  // ── Triage ──────────────────────────────────────────────────────────────
  async recordTriage(encounterId: string, payload: RecordTriagePayload): Promise<TriageDto> {
    const res = await apiClient.post<ApiResponse<TriageDto>>(
      `/clinical/encounters/${encounterId}/triage`,
      payload,
    );
    return res.data.data;
  },

  async triageHistory(encounterId: string): Promise<TriageDto[]> {
    const res = await apiClient.get<ApiResponse<TriageDto[]>>(
      `/clinical/encounters/${encounterId}/triage`,
    );
    return res.data.data;
  },

  // ── Consultation notes ──────────────────────────────────────────────────
  async createConsultationNote(
    encounterId: string,
    payload: CreateConsultationNotePayload,
  ): Promise<ConsultationNoteDto> {
    const res = await apiClient.post<ApiResponse<ConsultationNoteDto>>(
      `/clinical/encounters/${encounterId}/consultation-notes`,
      payload,
    );
    return res.data.data;
  },

  async listConsultationNotes(encounterId: string): Promise<ConsultationNoteDto[]> {
    const res = await apiClient.get<ApiResponse<ConsultationNoteDto[]>>(
      `/clinical/encounters/${encounterId}/consultation-notes`,
    );
    return res.data.data;
  },

  // ── Clinical catalog look-up (read-only) ────────────────────────────────
  async catalog(group?: string): Promise<ClinicalServiceDto[]> {
    const res = await apiClient.get<ApiResponse<ClinicalServiceDto[]>>("/clinical/catalog/services", {
      params: group ? { group } : undefined,
    });
    return res.data.data;
  },

  // ── Lab orders ──────────────────────────────────────────────────────────
  async placeLabOrder(encounterId: string, payload: CreateLabOrderPayload): Promise<LabOrderDto> {
    const res = await apiClient.post<ApiResponse<LabOrderDto>>(
      `/clinical/encounters/${encounterId}/lab-orders`,
      payload,
    );
    return res.data.data;
  },

  async listLabOrdersForEncounter(encounterId: string): Promise<LabOrderDto[]> {
    const res = await apiClient.get<ApiResponse<LabOrderDto[]>>(
      `/clinical/encounters/${encounterId}/lab-orders`,
    );
    return res.data.data;
  },

  async labWorklist(status?: string): Promise<LabOrderDto[]> {
    const res = await apiClient.get<ApiResponse<LabOrderDto[]>>("/clinical/lab-orders", {
      params: status ? { status } : undefined,
    });
    return res.data.data;
  },

  async getLabOrder(id: string): Promise<LabOrderDto> {
    const res = await apiClient.get<ApiResponse<LabOrderDto>>(`/clinical/lab-orders/${id}`);
    return res.data.data;
  },

  async updateLabOrderStatus(id: string, status: LabOrderStatus): Promise<LabOrderDto> {
    const res = await apiClient.patch<ApiResponse<LabOrderDto>>(`/clinical/lab-orders/${id}/status`, {
      status,
    });
    return res.data.data;
  },

  async submitLabResults(id: string, payload: SubmitLabResultsPayload): Promise<LabOrderDto> {
    const res = await apiClient.post<ApiResponse<LabOrderDto>>(
      `/clinical/lab-orders/${id}/results`,
      payload,
    );
    return res.data.data;
  },

  // ── Prescriptions / Pharmacy ─────────────────────────────────────────────
  async placePrescription(
    encounterId: string,
    payload: CreatePrescriptionPayload,
  ): Promise<PrescriptionDto> {
    const res = await apiClient.post<ApiResponse<PrescriptionDto>>(
      `/clinical/encounters/${encounterId}/prescriptions`,
      payload,
    );
    return res.data.data;
  },

  async listPrescriptionsForEncounter(encounterId: string): Promise<PrescriptionDto[]> {
    const res = await apiClient.get<ApiResponse<PrescriptionDto[]>>(
      `/clinical/encounters/${encounterId}/prescriptions`,
    );
    return res.data.data;
  },

  async pharmacyWorklist(status?: string): Promise<PrescriptionDto[]> {
    const res = await apiClient.get<ApiResponse<PrescriptionDto[]>>("/clinical/prescriptions", {
      params: status ? { status } : undefined,
    });
    return res.data.data;
  },

  async getPrescription(id: string): Promise<PrescriptionDto> {
    const res = await apiClient.get<ApiResponse<PrescriptionDto>>(`/clinical/prescriptions/${id}`);
    return res.data.data;
  },

  async updatePrescriptionStatus(
    id: string,
    status: PrescriptionStatus,
    reason?: string,
  ): Promise<PrescriptionDto> {
    const res = await apiClient.patch<ApiResponse<PrescriptionDto>>(
      `/clinical/prescriptions/${id}/status`,
      { status, reason: reason ?? "" },
    );
    return res.data.data;
  },

  async dispensePrescription(id: string, payload: DispensePayload): Promise<PrescriptionDto> {
    const res = await apiClient.post<ApiResponse<PrescriptionDto>>(
      `/clinical/prescriptions/${id}/dispense`,
      payload,
    );
    return res.data.data;
  },

  // ── Admissions ──────────────────────────────────────────────────────────
  async admit(encounterId: string, payload: AdmitPayload): Promise<AdmissionDto> {
    const res = await apiClient.post<ApiResponse<AdmissionDto>>(
      `/clinical/encounters/${encounterId}/admit`,
      payload,
    );
    return res.data.data;
  },

  async listAdmissionsForEncounter(encounterId: string): Promise<AdmissionDto[]> {
    const res = await apiClient.get<ApiResponse<AdmissionDto[]>>(
      `/clinical/encounters/${encounterId}/admissions`,
    );
    return res.data.data;
  },

  async listAdmissionsForPatient(patientId: string): Promise<AdmissionDto[]> {
    const res = await apiClient.get<ApiResponse<AdmissionDto[]>>(
      `/clinical/patients/${patientId}/admissions`,
    );
    return res.data.data;
  },

  async activeAdmissions(): Promise<AdmissionDto[]> {
    const res = await apiClient.get<ApiResponse<AdmissionDto[]>>("/clinical/admissions/active");
    return res.data.data;
  },

  async discharge(admissionId: string, payload: DischargePayload): Promise<AdmissionDto> {
    const res = await apiClient.post<ApiResponse<AdmissionDto>>(
      `/clinical/admissions/${admissionId}/discharge`,
      payload,
    );
    return res.data.data;
  },

  // ── Referrals ───────────────────────────────────────────────────────────
  async placeReferral(encounterId: string, payload: CreateReferralPayload): Promise<ReferralDto> {
    const res = await apiClient.post<ApiResponse<ReferralDto>>(
      `/clinical/encounters/${encounterId}/referrals`,
      payload,
    );
    return res.data.data;
  },

  async listReferralsForEncounter(encounterId: string): Promise<ReferralDto[]> {
    const res = await apiClient.get<ApiResponse<ReferralDto[]>>(
      `/clinical/encounters/${encounterId}/referrals`,
    );
    return res.data.data;
  },

  async referralInbox(params?: { department?: string; status?: string }): Promise<ReferralDto[]> {
    const res = await apiClient.get<ApiResponse<ReferralDto[]>>("/clinical/referrals", { params });
    return res.data.data;
  },

  async decideReferral(id: string, payload: ReferralDecisionPayload): Promise<ReferralDto> {
    const res = await apiClient.patch<ApiResponse<ReferralDto>>(
      `/clinical/referrals/${id}`,
      payload,
    );
    return res.data.data;
  },

  // ── Medical alerts ──────────────────────────────────────────────────────
  async createAlert(patientId: string, payload: CreateMedicalAlertPayload): Promise<MedicalAlertDto> {
    const res = await apiClient.post<ApiResponse<MedicalAlertDto>>(
      `/clinical/patients/${patientId}/alerts`,
      payload,
    );
    return res.data.data;
  },

  async listAlerts(patientId: string, includeInactive = false): Promise<MedicalAlertDto[]> {
    const res = await apiClient.get<ApiResponse<MedicalAlertDto[]>>(
      `/clinical/patients/${patientId}/alerts`,
      { params: includeInactive ? { includeInactive: true } : undefined },
    );
    return res.data.data;
  },

  async deactivateAlert(id: string): Promise<MedicalAlertDto> {
    const res = await apiClient.delete<ApiResponse<MedicalAlertDto>>(`/clinical/alerts/${id}`);
    return res.data.data;
  },

  // ── Role-shaped folder view ─────────────────────────────────────────────
  async getFolder(encounterId: string): Promise<FolderViewDto> {
    const res = await apiClient.get<ApiResponse<FolderViewDto>>(
      `/clinical/encounters/${encounterId}/folder`,
    );
    return res.data.data;
  },
};
