// Mirrors com.nero.hims.appointments.api.dto.

export type AppointmentStatus =
  | "SCHEDULED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW" | "CANCELLED";

export type AppointmentPriority = "ROUTINE" | "URGENT" | "EMERGENCY";

export type VisitType =
  | "OPD" | "ANC" | "POSTNATAL" | "LAB" | "RADIOLOGY" | "WARD"
  | "EMERGENCY" | "DENTAL" | "PHARMACY" | "SPECIALIST" | "FOLLOW_UP";

export interface AppointmentDto {
  id: string;
  appointmentNumber: string;
  patientId: string | null;
  patientPublicId: string;
  patientName: string;
  serviceId: string | null;
  serviceCode: string;
  serviceName: string;
  department: string;
  visitType: VisitType | string;
  payerType: string;
  feeMinor: number;
  currency: string;
  clinicianUserId: string | null;
  clinicianName: string;
  scheduledFor: string | null;
  durationMinutes: number;
  priority: AppointmentPriority | string;
  status: AppointmentStatus | string;
  reason: string;
  referralSource: string;
  notes: string;
  billId: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ClinicianDto {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  active: boolean;
}

export interface CreateAppointmentPayload {
  patientId: string;
  serviceId?: string | null;
  clientStatus?: string;
  nhisMemberNumber?: string;
  nhisActive?: boolean;
  nhisExpiryDate?: string;
  visitType?: VisitType | string;
  payerType?: string;
  feeMinorOverride?: number | null;
  clinicianUserId?: string | null;
  clinicianName?: string;
  scheduledFor: string;
  durationMinutes?: number;
  priority?: AppointmentPriority | string;
  reason?: string;
  referralSource?: string;
  notes?: string;
}

export interface RescheduleAppointmentPayload {
  scheduledFor: string;
  clinicianUserId?: string | null;
  clinicianName?: string;
}
