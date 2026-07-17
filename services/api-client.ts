import axios from "axios";

import type { ApiResponse } from "@/types/api.types";
import type { LoginResponse } from "@/types/auth.types";

const REFRESH_TOKEN_KEY = "hmis_refresh_token";

/**
 * Same-origin `/api/v1` (Next rewrite → Java backend, whose controllers are mounted at `/api/v1/**`)
 * so HttpOnly `hmis_access` is set on the app host.
 * Override with `NEXT_PUBLIC_API_URL` only if you use a dedicated API origin (SSR session may be limited).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || "/api/v1";

/** Default REST timeout; CSV/export/import should override with {@link EXPORT_REQUEST_TIMEOUT_MS}. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const EXPORT_REQUEST_TIMEOUT_MS = 120_000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
});

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

/** Cookie sessions need XSRF-TOKEN before mutating API calls; prime if missing (single-flight). */
let csrfPrimePromise: Promise<void> | null = null;

async function ensureCsrfTokenCookie(): Promise<void> {
  if (typeof document === "undefined") return;
  if (readCookie("XSRF-TOKEN")) return;
  if (!csrfPrimePromise) {
    csrfPrimePromise = axios
      .get(`${API_BASE_URL}/auth/csrf`, { withCredentials: true, timeout: DEFAULT_REQUEST_TIMEOUT_MS })
      .then(() => undefined)
      .finally(() => {
        csrfPrimePromise = null;
      });
  }
  await csrfPrimePromise;
}

apiClient.interceptors.request.use(async (config) => {
  const method = (config.method ?? "get").toLowerCase();
  if (!["get", "head", "options", "trace"].includes(method)) {
    const url = String(config.url ?? "");
    const skipPrime =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      url.includes("/auth/logout");
    if (!skipPrime) {
      await ensureCsrfTokenCookie();
    }
    const csrf = readCookie("XSRF-TOKEN");
    if (csrf) {
      config.headers["X-XSRF-TOKEN"] = csrf;
    }
  }
  return config;
});

function forceLoginRedirect(): void {
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
      setRefreshToken(lr.refreshToken);
      const retryCfg = error.config;
      if (retryCfg.headers) {
        delete (retryCfg.headers as Record<string, unknown>).Authorization;
      }
      return apiClient.request(retryCfg);
    } catch {
      forceLoginRedirect();
      return Promise.reject(error);
    }
  },
);
