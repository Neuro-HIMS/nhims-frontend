import type { AppointmentDto, VisitType } from "@/types/appointments.types";

export type BookingResult = {
  appointment: AppointmentDto;
  patientName: string;
  serviceName: string;
};

export type BookingPriority = {
  value: string;
  label: string;
};

export const VISIT_TYPES: Array<{ value: VisitType; label: string }> = [
  { value: "OPD", label: "OPD" },
  { value: "ANC", label: "ANC" },
  { value: "POSTNATAL", label: "Postnatal" },
  { value: "LAB", label: "Laboratory" },
  { value: "RADIOLOGY", label: "Radiology" },
  { value: "WARD", label: "Ward Review" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "DENTAL", label: "Dental" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "SPECIALIST", label: "Specialist" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

export const PRIORITIES: BookingPriority[] = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
];
