import axios from "axios";
import Cookies from "js-cookie";

import type { ApiResponse } from "@/types/api.types";
import type { LoginResponse } from "@/types/auth.types";

const ACCESS_TOKEN_KEY = "hmis_access_token";
const REFRESH_TOKEN_KEY = "hmis_refresh_token";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/** Default REST timeout; CSV/export/import should override with {@link EXPORT_REQUEST_TIMEOUT_MS}. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const EXPORT_REQUEST_TIMEOUT_MS = 120_000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
});

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  Cookies.set(ACCESS_TOKEN_KEY, token, {
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAccessToken(): void {
  Cookies.remove(ACCESS_TOKEN_KEY);
}

export function setRefreshToken(token: string | null | undefined): void {
  if (typeof sessionStorage === "undefined") return;
  if (!token) sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  else sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

type RetriableConfig = { _hmisRetried?: boolean; url?: string; headers?: Record<string, string> };

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const method = (config.method ?? "get").toLowerCase();
  if (!["get", "head", "options", "trace"].includes(method)) {
    const csrf = readCookie("XSRF-TOKEN");
    if (csrf) {
      config.headers["X-XSRF-TOKEN"] = csrf;
    }
  }
  return config;
});

function forceLoginRedirect(): void {
  clearAccessToken();
  clearRefreshToken();
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const onAuthPage = path.endsWith("/login") || path.endsWith("/change-password");
    if (!onAuthPage) {
      window.location.href = "/login";
    }
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config as RetriableConfig | undefined;

    if (status !== 401 || !original || original._hmisRetried) {
      if (status === 401) {
        forceLoginRedirect();
      }
      return Promise.reject(error);
    }

    const reqUrl = String(original.url ?? "");
    if (reqUrl.includes("/auth/login") || reqUrl.includes("/auth/refresh")) {
      forceLoginRedirect();
      return Promise.reject(error);
    }

    const rt = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(REFRESH_TOKEN_KEY) : null;
    if (!rt) {
      forceLoginRedirect();
      return Promise.reject(error);
    }

    original._hmisRetried = true;
    try {
      const { data } = await axios.post<ApiResponse<LoginResponse>>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: rt },
        { withCredentials: true, headers: { "Content-Type": "application/json" } },
      );
      const lr = data.data;
      setAccessToken(lr.accessToken);
      setRefreshToken(lr.refreshToken);
      const retryCfg = error.config;
      if (retryCfg.headers) {
        retryCfg.headers.Authorization = `Bearer ${lr.accessToken}`;
      }
      return apiClient.request(retryCfg);
    } catch {
      forceLoginRedirect();
      return Promise.reject(error);
    }
  },
);
