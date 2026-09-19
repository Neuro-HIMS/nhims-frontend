"use client";

import { useState } from "react";
import { AxiosError } from "axios";

import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { AuthResult } from "@/types/auth.types";
import type { LoginInput } from "@/schemas/auth.schema";

// ── useAuth
// The single hook for all auth operations.
// Components call this — they never call authService directly.

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  async function login(credentials: LoginInput): Promise<AuthResult> {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      return { ok: true, user: response.user };
    } catch (err) {
      return { ok: false, ...mapLoginError(err) };
    } finally {
      setIsLoading(false);
    }
  }

  async function logout(): Promise<void> {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      clearUser();
      setIsLoading(false);
    }
  }

  return { login, logout, isLoading };
}

export type LoginErrorKind = "credentials" | "account" | "totp-required" | "totp-invalid" | "offline" | "unknown";

interface LoginErrorResult {
  error: string;
  kind: LoginErrorKind;
}

// ── Map the backend's login error into plain words and a kind the form can react to
// (e.g. reveal the 6-digit code field only once the server asks for it).
function mapLoginError(err: unknown): LoginErrorResult {
  if (err instanceof AxiosError && !err.response) {
    return { kind: "offline", error: "You're offline. Connect to the internet to sign in." };
  }

  const raw = (err instanceof AxiosError ? err.response?.data?.message : undefined) ?? "";
  const message = raw.toLowerCase();

  if (message.includes("locked")) {
    return { kind: "account", error: "Your account is locked. Ask your facility administrator." };
  }
  if (message.includes("disabled")) {
    return { kind: "account", error: "Your account is inactive. Ask your facility administrator." };
  }
  if (message.includes("expired")) {
    return { kind: "account", error: "Your account has expired. Ask your facility administrator." };
  }
  if ((message.includes("two-factor") || message.includes("totp") || message.includes("authentication code")) && message.includes("required")) {
    return { kind: "totp-required", error: "Enter the 6-digit code from your phone to finish signing in." };
  }
  if (message.includes("two-factor") || message.includes("totp") || message.includes("authentication code")) {
    return { kind: "totp-invalid", error: "That code didn't work. Check your phone and try again." };
  }
  if (message.includes("bad credentials") || message.includes("invalid username or password")) {
    return { kind: "credentials", error: "Username or password is incorrect." };
  }
  return { kind: "unknown", error: "Username or password is incorrect." };
}

