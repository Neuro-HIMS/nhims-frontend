export interface AncClientRowDto {
  patientId: string;
  patientPublicId: string;
  patientName: string;
  ancVisitCount: number;
  lastVisitAt: string;
  lmp: string | null;
  edd: string | null;
  activePregnancyId: string | null;
  /** True when manual risk notes exist or automated risk is MEDIUM/HIGH. */
  elevatedRisk: boolean;
  riskLevel: string | null;
  riskEvalSummary: string | null;
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
