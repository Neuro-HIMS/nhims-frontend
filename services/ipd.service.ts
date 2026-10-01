import { apiClient } from "@/services/api-client";
import { isMockEnabled } from "@/services/mocks/mock-config";
import { withMock } from "@/services/mocks/with-mock";
import { mockAddGoingHome, mockBedReady, mockCleaningBeds, mockConfirmLeft, mockGoingHome, type GoingHome } from "@/services/mocks/handlers/ipd";
import { mockAddBeds, mockListWards, mockSaveBed, mockSaveWard } from "@/services/mocks/handlers/ward-setup";
import { bedKey } from "@/lib/wards";
import type { ApiResponse } from "@/types/api.types";
import type { AdmissionDto } from "@/types/clinical.types";
import type { ConfiguredBed, ConfiguredWard, IpdBoardDto, IpdMarEntryDto, IpdNursingOverviewDto, IpdTprReadingDto } from "@/types/ipd.types";

export type { GoingHome };

/** Where the wards on screen come from. */
export interface WardSource {
  wards: ConfiguredWard[];
  /** Beds marked occupied by the server (real wards only), keyed by bed id → admission id. */
  occupiedByServer: Map<string, string | null> | null;
  /** True when the wards come from the browser set-up (sample data), not the server. */
  sample: boolean;
}

function fromBoard(board: IpdBoardDto): WardSource {
  const occupied = new Map<string, string | null>();
  const wards: ConfiguredWard[] = board.wards.map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    kind: "GENERAL",
    for: "MIXED",
    floor: "",
    notes: "",
    active: true,
    beds: w.beds.map((b) => {
      if (b.occupied) occupied.set(b.id, b.activeAdmissionId);
      return { id: b.id, label: b.label, kind: "STANDARD", notes: "", active: true };
    }),
  }));
  return { wards, occupiedByServer: occupied, sample: false };
}

export const ipdService = {
  async board(): Promise<IpdBoardDto> {
    const res = await apiClient.get<ApiResponse<IpdBoardDto>>("/ipd/board");
    return res.data.data;
  },

  /**
   * The wards and beds to show. The server's wards when it has any; otherwise, with sample data on (area
   * `ipd-wards`), the wards set up in Facility settings → Wards and beds (backend-gaps.md#WRD-setup).
   * Occupancy is worked out on screen from the active admissions, so it's never out of step with them.
   */
  async wardSource(): Promise<WardSource> {
    const board = await ipdService.board();
    if (board.wards.length > 0 || !isMockEnabled("ipd-wards")) return fromBoard(board);
    const wards = mockListWards()
      .filter((w) => w.active)
      .map((w) => ({ ...w, beds: w.beds.filter((b) => b.active) }));
    return { wards, occupiedByServer: null, sample: true };
  },

  // ── Ward set-up (Facility settings) ───────────────────────────────────────────────────────────

  /** Wards can be set up here only with sample data, and only while the server has none of its own. */
  wardSetupAvailable(): boolean {
    return isMockEnabled("ipd-wards");
  },

  /** TODO(backend): GET /ipd/wards (with switched-off wards and beds) — backend-gaps.md#WRD-setup. */
  async listConfiguredWards(): Promise<ConfiguredWard[]> {
    return withMock("ipd-wards", async () => fromBoard(await ipdService.board()).wards, () => mockListWards());
  },

  /** TODO(backend): POST/PUT /ipd/wards — backend-gaps.md#WRD-setup. Never called without sample data. */
  async saveWard(ward: Omit<ConfiguredWard, "id" | "beds"> & { id?: string; beds?: ConfiguredBed[] }): Promise<ConfiguredWard> {
    return withMock(
      "ipd-wards",
      async () => {
        throw new Error("Setting up wards isn't available yet.");
      },
      () => mockSaveWard(ward),
    );
  },

  /** TODO(backend): POST /ipd/wards/{id}/beds — backend-gaps.md#WRD-setup. */
  async addBeds(wardId: string, add: { prefix: string; from: number; count: number; kind: ConfiguredBed["kind"] }): Promise<ConfiguredWard> {
    return withMock(
      "ipd-wards",
      async () => {
        throw new Error("Setting up wards isn't available yet.");
      },
      () => mockAddBeds(wardId, add),
    );
  },

  /** TODO(backend): PUT /ipd/wards/{id}/beds/{bedId} — backend-gaps.md#WRD-setup. */
  async saveBed(wardId: string, bed: ConfiguredBed): Promise<ConfiguredWard> {
    return withMock(
      "ipd-wards",
      async () => {
        throw new Error("Setting up wards isn't available yet.");
      },
      () => mockSaveBed(wardId, bed),
    );
  },

  // ── Ward care ─────────────────────────────────────────────────────────────────────────────────

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

  // ── NUR-10: confirm the patient left, bed cleaning (sample data only) ─────────────────────────
  // TODO(backend): discharge confirmation + bed cleaning state — backend-gaps.md#NUR-10. Without sample
  // data the bed is free as soon as the doctor discharges, and "Going home" explains that.

  goingHomeAvailable(): boolean {
    return isMockEnabled("bed-cleaning");
  },

  /** Patients who died don't go through "Going home". */
  noteDischarged(a: AdmissionDto, outcome: string): void {
    if (!isMockEnabled("bed-cleaning") || outcome === "DECEASED") return;
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
