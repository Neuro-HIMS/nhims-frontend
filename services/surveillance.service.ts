import { apiClient } from "./api-client";
import { isMockEnabled } from "@/services/mocks/mock-config";
import { withMock } from "@/services/mocks/with-mock";
import { mockFlagForSurveillance } from "@/services/mocks/handlers/surveillance";
import type { ApiResponse } from "@/types/api.types";

export interface SurveillanceFlagInput {
  encounterId: string;
  patientId: string;
  conditionId: string;
  conditionName: string;
}

export interface SurveillanceFlagDto extends SurveillanceFlagInput {
  id: string;
  flaggedAt: string;
}

export const surveillanceService = {
  /** Whether flagging works here (only mocked until the endpoint exists) — the checkbox is hidden otherwise. */
  available(): boolean {
    return isMockEnabled("surveillance");
  },

  /**
   * TODO(backend): POST /clinical/surveillance-flags — records a notifiable-disease case for the
   * disease-surveillance officer — see docs/agents/backend-gaps.md#DOC-04-surveillance.
   * Mocked under NEXT_PUBLIC_MOCK_AREAS=surveillance (or "all").
   */
  async flag(input: SurveillanceFlagInput): Promise<SurveillanceFlagDto> {
    return withMock(
      "surveillance",
      async () => {
        const res = await apiClient.post<ApiResponse<SurveillanceFlagDto>>("/clinical/surveillance-flags", input);
        return res.data.data;
      },
      () => mockFlagForSurveillance(input),
    );
  },
};
