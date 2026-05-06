import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  AppointmentDto,
  ClinicianDto,
  CreateAppointmentPayload,
  RescheduleAppointmentPayload,
} from "@/types/appointments.types";

export const appointmentsService = {
  async search(params?: {
    status?: string;
    from?: string;
    to?: string;
    clinicianId?: string;
  }): Promise<AppointmentDto[]> {
    const res = await apiClient.get<ApiResponse<AppointmentDto[]>>("/appointments", { params });
    return res.data.data;
  },

  async today(): Promise<AppointmentDto[]> {
    const res = await apiClient.get<ApiResponse<AppointmentDto[]>>("/appointments/today");
    return res.data.data;
  },

  async byPatient(patientId: string): Promise<AppointmentDto[]> {
    const res = await apiClient.get<ApiResponse<AppointmentDto[]>>(`/appointments/by-patient/${patientId}`);
    return res.data.data;
  },

  async get(id: string): Promise<AppointmentDto> {
    const res = await apiClient.get<ApiResponse<AppointmentDto>>(`/appointments/${id}`);
    return res.data.data;
  },

  async book(payload: CreateAppointmentPayload): Promise<AppointmentDto> {
    const res = await apiClient.post<ApiResponse<AppointmentDto>>("/appointments", payload);
    return res.data.data;
  },

  async reschedule(id: string, payload: RescheduleAppointmentPayload): Promise<AppointmentDto> {
    const res = await apiClient.put<ApiResponse<AppointmentDto>>(`/appointments/${id}/reschedule`, payload);
    return res.data.data;
  },

  async checkIn(id: string): Promise<AppointmentDto> {
    const res = await apiClient.post<ApiResponse<AppointmentDto>>(`/appointments/${id}/check-in`);
    return res.data.data;
  },

  async start(id: string): Promise<AppointmentDto> {
    const res = await apiClient.post<ApiResponse<AppointmentDto>>(`/appointments/${id}/start`);
    return res.data.data;
  },

  async complete(id: string, opts?: { openBill?: boolean; payerTypeOverride?: string }): Promise<AppointmentDto> {
    const res = await apiClient.post<ApiResponse<AppointmentDto>>(`/appointments/${id}/complete`, opts ?? {});
    return res.data.data;
  },

  async noShow(id: string): Promise<AppointmentDto> {
    const res = await apiClient.post<ApiResponse<AppointmentDto>>(`/appointments/${id}/no-show`);
    return res.data.data;
  },

  async cancel(id: string, reason?: string): Promise<AppointmentDto> {
    const res = await apiClient.post<ApiResponse<AppointmentDto>>(`/appointments/${id}/cancel`, { reason });
    return res.data.data;
  },

  async clinicians(): Promise<ClinicianDto[]> {
    const res = await apiClient.get<ApiResponse<ClinicianDto[]>>("/appointments/clinicians");
    return res.data.data;
  },
};
