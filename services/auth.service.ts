import { apiClient, setRefreshToken, clearRefreshToken } from "./api-client";
import { normalizeModuleKeys } from "@/lib/module-keys";
import type { LoginRequest, LoginResponse, AuthUser } from "@/types/auth.types";
import type { ApiResponse } from "@/types/api.types";

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    assignedModules: normalizeModuleKeys(user.assignedModules),
    enabledHmisModuleKeys: user.enabledHmisModuleKeys
      ? normalizeModuleKeys(user.enabledHmisModuleKeys)
      : undefined,
  };
}

function normalizeLoginResponse(payload: LoginResponse): LoginResponse {
  return { ...payload, user: normalizeAuthUser(payload.user) };
}

export const authService = {
  /** Prime HttpOnly-adjacent CSRF cookie for credentialed mutating requests (no Bearer header). */
  async warmCsrfCookie(): Promise<void> {
    await apiClient.get("/auth/csrf");
  },

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      await authService.warmCsrfCookie();
    } catch {
      /* ignore — first-load warmup is best-effort */
    }
    const response = await apiClient.post<ApiResponse<LoginResponse>>("/auth/login", credentials);
    const payload = response.data.data;
    setRefreshToken(payload.refreshToken);
    try {
      await authService.warmCsrfCookie();
    } catch {
      /* ignore */
    }
    return normalizeLoginResponse(payload);
  },

  async refreshSession(): Promise<LoginResponse> {
    const raw =
      typeof sessionStorage !== "undefined" ? sessionStorage.getItem("hmis_refresh_token") : null;
    if (!raw) {
      throw new Error("No refresh token");
    }
    const response = await apiClient.post<ApiResponse<LoginResponse>>("/auth/refresh", {
      refreshToken: raw,
    });
    const payload = response.data.data;
    setRefreshToken(payload.refreshToken);
    return normalizeLoginResponse(payload);
  },

  /** Request password reset — token is only in server audit/logs (no email integration in v1). */
  async forgotPassword(usernameOrEmail: string): Promise<void> {
    await apiClient.post("/auth/forgot-password", { usernameOrEmail });
  },

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    await apiClient.post("/auth/reset-password", { token, newPassword });
  },

  async logout(): Promise<void> {
    try {
      await authService.warmCsrfCookie();
    } catch {
      /* best-effort — logout should still clear client state */
    }
    try {
      await apiClient.post("/auth/logout");
    } catch {
      /* ignore — session may already be invalid or network error */
    } finally {
      clearRefreshToken();
    }
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await apiClient.get<ApiResponse<AuthUser>>("/auth/me");
    return normalizeAuthUser(response.data.data);
  },

  /** New JWT + user from DB — use after permission or facility branding changes for the signed-in account */
  async reissueSession(): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>("/auth/reissue");
    const payload = response.data.data;
    setRefreshToken(payload.refreshToken);
    return normalizeLoginResponse(payload);
  },

  async changePassword(body: { currentPassword: string; newPassword: string }): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>("/auth/change-password", body);
    const payload = response.data.data;
    setRefreshToken(payload.refreshToken);
    return normalizeLoginResponse(payload);
  },

  async beginTotpEnrollment(): Promise<{ secret: string; otpAuthUri: string }> {
    const res = await apiClient.post<ApiResponse<{ secret: string; otpAuthUri: string }>>(
      "/auth/totp/enroll/begin"
    );
    return res.data.data;
  },

  async completeTotpEnrollment(code: string): Promise<void> {
    await apiClient.post("/auth/totp/enroll/complete", { code });
  },

  async disableTotp(password: string): Promise<void> {
    await apiClient.post("/auth/totp/disable", { password });
  },
} as const;
