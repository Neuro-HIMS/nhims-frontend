import axios from "axios";
import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "hmis_access_token";
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

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      clearAccessToken();
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const onAuthPage = path.endsWith("/login") || path.endsWith("/change-password");
        const reqUrl = String((error as { config?: { url?: string } }).config?.url ?? "");
        const isLoginAttempt = reqUrl.includes("/auth/login");
        if (!onAuthPage && !isLoginAttempt) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);