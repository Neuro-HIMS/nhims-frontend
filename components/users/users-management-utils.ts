import { AxiosError } from "axios";
import type { UserRole } from "@/types/auth.types";

export function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as AxiosError<{ message?: string }>;
  return err.response?.data?.message ?? fallback;
}

export function formatRole(role: UserRole): string {
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatLastLogin(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}
