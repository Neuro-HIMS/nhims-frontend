"use client";

import { useState } from "react";
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
      const message =
        err instanceof Error
          ? mapLoginError(err.message)
          : "Unable to sign in. Please try again.";
      return { ok: false, error: message };
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

// ── Map backend error messages to user-facing strings
// The Java backend sends generic error messages — we humanise them here.
function mapLoginError(message: string): string {
  if (message.toLowerCase().includes("bad credentials") ||
      message.toLowerCase().includes("invalid username or password")) {
    return "Incorrect username or password. Please check your credentials.";
  }
  if (message.toLowerCase().includes("account locked") ||
      message.toLowerCase().includes("user account is locked")) {
    return "Your account has been locked after multiple failed attempts. Contact your Facility Administrator.";
  }
  if (message.toLowerCase().includes("account disabled") ||
      message.toLowerCase().includes("user is disabled")) {
    return "Your account is inactive. Contact your Facility Administrator.";
  }
  if (message.toLowerCase().includes("account expired")) {
    return "Your account has expired. Contact your Facility Administrator.";
  }
  if (message.toLowerCase().includes("two-factor") || message.toLowerCase().includes("authentication code")) {
    return message;
  }
  return "Unable to sign in. Please check your credentials and try again.";
}

