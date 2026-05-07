import { apiClient } from "@/services/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { IpdBoardDto } from "@/types/ipd.types";

export const ipdService = {
  async board(): Promise<IpdBoardDto> {
    const res = await apiClient.get<ApiResponse<IpdBoardDto>>("/ipd/board");
    return res.data.data;
  },
};
