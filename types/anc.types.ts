export interface AncClientRowDto {
  patientId: string;
  patientPublicId: string;
  patientName: string;
  ancVisitCount: number;
  lastVisitAt: string;
  lmp: string | null;
  edd: string | null;
  activePregnancyId: string | null;
  pregnancyRiskNotes: boolean;
}

export interface AncVisitRowDto {
  patientName: string;
  patientPublicId: string;
  visitLabel: string;
  clinicianName: string;
  visitAt: string;
  encounterStatus: string;
}

export interface AncDashboardDto {
  activeAncClients: number;
  dueThisMonth: number;
  highRiskClients: number;
  clients: AncClientRowDto[];
  recentVisits: AncVisitRowDto[];
}
