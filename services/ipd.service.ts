import { apiClient } from "@/services/api-client";
import { isMockEnabled } from "@/services/mocks/mock-config";
import {
  mockAddGoingHome,
  mockBedReady,
  mockCleaningBeds,
  mockConfirmLeft,
  mockGoingHome,
  sampleBoard,
  type GoingHome,
} from "@/services/mocks/handlers/ipd";
import { bedKey } from "@/lib/wards";
import type { ApiResponse } from "@/types/api.types";
import type { AdmissionDto } from "@/types/clinical.types";
import type { IpdBoardDto, IpdMarEntryDto, IpdNursingOverviewDto, IpdTprReadingDto } from "@/types/ipd.types";

export type { GoingHome };

export const ipdService = {
  async board(): Promise<IpdBoardDto> {
    const res = await apiClient.get<ApiResponse<IpdBoardDto>>("/ipd/board");
    return res.data.data;
  },

  /**
   * The bed board. When the facility has no wards set up and sample data is on (area `ipd-wards`), shows
   * sample wards whose beds fill from the real active admissions — backend-gaps.md#WRD-setup.
   */
  async boardForScreen(activeAdmissions: AdmissionDto[]): Promise<{ board: IpdBoardDto; sample: boolean }> {
    const board = await ipdService.board();
    if (board.wards.length > 0 || !isMockEnabled("ipd-wards")) return { board, sample: false };
    const occupied = new Map(
      activeAdmissions.map((a) => [bedKey(a.ward, a.bed), { admissionId: a.id, patientName: a.patientName, patientPublicId: a.patientPublicId }] as const),
    );
    return { board: sampleBoard(occupied, bedKey), sample: true };
  },

  async nursingOverview(): Promise<IpdNursingOverviewDto> {
    const res = await apiClient.get<ApiResponse<IpdNursingOverviewDto>>("/ipd/nursing/overview");
    return res.data.data;
  },

  async listMar(admissionId: string): Promise<IpdMarEntryDto[]> {
    const res = await apiClient.get<ApiResponse<IpdMarEntryDto[]>>(`/ipd/nursing/admissions/${admissionId}/mar`);
    return res.data.data;
  },

  async addMar(admissionId: string, body: { scheduledFor: string; drugDisplay: string; dose?: string; route?: string }): Promise<IpdMarEntryDto> {
    const res = await apiClient.post<ApiResponse<IpdMarEntryDto>>(`/ipd/nursing/admissions/${admissionId}/mar`, body);
    return res.data.data;
  },

  /** Record what happened to a dose: GIVEN (with time), HELD or MISSED (with a note). */
  async updateMar(marId: string, body: { status: "GIVEN" | "HELD" | "MISSED" | "DUE"; givenAt?: string; notes?: string }): Promise<IpdMarEntryDto> {
    const res = await apiClient.patch<ApiResponse<IpdMarEntryDto>>(`/ipd/nursing/mar/${marId}`, body);
    return res.data.data;
  },

  async listTpr(admissionId: string): Promise<IpdTprReadingDto[]> {
    const res = await apiClient.get<ApiResponse<IpdTprReadingDto[]>>(`/ipd/nursing/admissions/${admissionId}/tpr`);
    return res.data.data;
  },

  async addTpr(
    admissionId: string,
    body: { recordedAt: string; tempC?: string; pulse?: string; respRate?: string; bpSys?: string; bpDia?: string; notes?: string },
  ): Promise<IpdTprReadingDto> {
    const res = await apiClient.post<ApiResponse<IpdTprReadingDto>>(`/ipd/nursing/admissions/${admissionId}/tpr`, body);
    return res.data.data;
  },

  // ── NUR-10: confirm the patient left, bed cleaning (sample data only) ──────────────────────────
  // TODO(backend): discharge confirmation + bed cleaning state — backend-gaps.md#NUR-10. Without sample
  // data the bed is free as soon as the doctor discharges, and "Going home" explains that.

  goingHomeAvailable(): boolean {
    return isMockEnabled("bed-cleaning");
  },

  noteDischarged(a: AdmissionDto, outcome: string): void {
    if (!isMockEnabled("bed-cleaning")) return;
    mockAddGoingHome({ admissionId: a.id, patientName: a.patientName, ward: a.ward, bed: a.bed, dischargedAt: new Date().toISOString(), outcome, left: false });
  },

  goingHome(): GoingHome[] {
    return isMockEnabled("bed-cleaning") ? mockGoingHome() : [];
  },

  confirmLeft(g: GoingHome): void {
    if (isMockEnabled("bed-cleaning")) mockConfirmLeft(g.admissionId, g.bed ? bedKey(g.ward, g.bed) : "");
  },

  cleaningBeds(): string[] {
    return isMockEnabled("bed-cleaning") ? mockCleaningBeds() : [];
  },

  markBedReady(key: string): void {
    if (isMockEnabled("bed-cleaning")) mockBedReady(key);
  },
};
