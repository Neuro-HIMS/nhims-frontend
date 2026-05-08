import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { AncDashboardDto } from "@/types/anc.types";

export interface AncPregnancyDto {
  id: string;
  patientId: string;
  patientPublicId: string;
  patientName: string;
  lmp: string | null;
  edd: string | null;
  gravida: number | null;
  parity: number | null;
  riskNotes: string;
  riskLevel: string;
  riskEvalSummary: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AncVisitDto {
  id: string;
  pregnancyId: string;
  visitDate: string;
  gestationWeeks: number | null;
  weightKg: string;
  bp: string;
  notes: string;
  encounterId: string | null;
  createdAt: string;
  fundalHeightCm: number | null;
  presentation: string;
  fhrBpm: number | null;
  urineProtein: string;
  urineGlucose: string;
  oedema: string;
  iptpSpDose: number | null;
  ifaReceived: boolean | null;
  itnUse: boolean | null;
  hivResult: string;
  syphilisResult: string;
}

export const ancService = {
  async dashboard(): Promise<AncDashboardDto> {
    const res = await apiClient.get<ApiResponse<AncDashboardDto>>("/anc/dashboard");
    return res.data.data;
  },

  async listPregnancies(patientId: string): Promise<AncPregnancyDto[]> {
    const res = await apiClient.get<ApiResponse<AncPregnancyDto[]>>(`/anc/pregnancies?patientId=${patientId}`);
    return res.data.data;
  },

  async createPregnancy(body: {
    patientId: string;
    lmp?: string;
    edd?: string;
    gravida?: number;
    parity?: number;
    riskNotes?: string;
  }): Promise<AncPregnancyDto> {
    const res = await apiClient.post<ApiResponse<AncPregnancyDto>>("/anc/pregnancies", body);
    return res.data.data;
  },

  async listVisits(pregnancyId: string): Promise<AncVisitDto[]> {
    const res = await apiClient.get<ApiResponse<AncVisitDto[]>>(`/anc/pregnancies/${pregnancyId}/visits`);
    return res.data.data;
  },

  async addVisit(
    pregnancyId: string,
    body: {
      visitDate: string;
      gestationWeeks?: number;
      weightKg?: string;
      bp?: string;
      notes?: string;
      encounterId?: string;
      presentation?: string;
      fundalHeightCm?: number;
      fhrBpm?: number;
      urineProtein?: string;
      urineGlucose?: string;
      oedema?: string;
      iptpSpDose?: number;
      ifaReceived?: boolean;
      itnUse?: boolean;
      hivResult?: string;
      syphilisResult?: string;
    },
  ): Promise<AncVisitDto> {
    const res = await apiClient.post<ApiResponse<AncVisitDto>>(`/anc/pregnancies/${pregnancyId}/visits`, body);
    return res.data.data;
  },

  async recordDelivery(
    pregnancyId: string,
    body?: { deliveryMode?: string; outcomeNotes?: string },
  ): Promise<AncPregnancyDto> {
    const res = await apiClient.post<ApiResponse<AncPregnancyDto>>(`/anc/pregnancies/${pregnancyId}/delivery`, body ?? {});
    return res.data.data;
  },
};
