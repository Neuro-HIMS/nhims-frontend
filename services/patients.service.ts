import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  NextPatientReferenceDto,
  NhisVerificationResultDto,
  PatientDto,
  PatientSearchParams,
  PatientSummaryDto,
  RegisterPatientPayload,
  UpdatePatientPayload,
} from "@/types/patients.types";

export const patientsService = {
  async peekNextReference(): Promise<NextPatientReferenceDto> {
    const response = await apiClient.get<ApiResponse<NextPatientReferenceDto>>("/patients/references/next");
    return response.data.data;
  },

  async register(payload: RegisterPatientPayload): Promise<PatientDto> {
    const response = await apiClient.post<ApiResponse<PatientDto>>("/patients", payload);
    return response.data.data;
  },

  async getById(patientId: string): Promise<PatientDto> {
    const response = await apiClient.get<ApiResponse<PatientDto>>(`/patients/${patientId}`);
    return response.data.data;
  },

  async update(patientId: string, payload: UpdatePatientPayload): Promise<PatientDto> {
    const response = await apiClient.put<ApiResponse<PatientDto>>(`/patients/${patientId}`, payload);
    return response.data.data;
  },

  async verifyNhis(memberNumber: string): Promise<NhisVerificationResultDto> {
    const response = await apiClient.post<ApiResponse<NhisVerificationResultDto>>("/records/nhis/verify", {
      memberNumber,
    });
    return response.data.data;
  },

  async search(params: PatientSearchParams): Promise<PatientSummaryDto[]> {
    const sp =
      params.mode === "name"
        ? { mode: params.mode, firstName: params.firstName, lastName: params.lastName }
        : { mode: params.mode, q: params.q };
    const response = await apiClient.get<ApiResponse<PatientSummaryDto[]>>("/patients/search", { params: sp });
    return response.data.data;
  },
};
