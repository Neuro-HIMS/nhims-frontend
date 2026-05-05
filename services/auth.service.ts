import { apiClient, setAccessToken, clearAccessToken } from "./api-client";
import type { LoginRequest, LoginResponse, AuthUser } from "@/types/auth.types";
import type { ApiResponse } from "@/types/api.types";

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      "/auth/login",
      credentials
    );
    const payload = response.data.data;
    setAccessToken(payload.accessToken);
    return payload;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearAccessToken();
    }
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await apiClient.get<ApiResponse<AuthUser>>("/auth/me");
    return response.data.data;
  },

  /** New JWT + user from DB — use after permission or facility branding changes for the signed-in account */
  async reissueSession(): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>("/auth/reissue");
    const payload = response.data.data;
    setAccessToken(payload.accessToken);
    return payload;
  },
} as const;
