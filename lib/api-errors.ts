import { AxiosError } from "axios";

import type { ApiError } from "@/types/api.types";

export interface FriendlyError {
  title: string;
  message: string;
  fieldErrors?: Record<string, string>;
  reference?: string;
}

/**
 * The one place an HTTP error becomes screen text. Never render `error.message`,
 * a status code or raw server JSON directly — always go through this.
 */
export function getFriendlyError(error: unknown, context?: string): FriendlyError {
  if (!(error instanceof AxiosError)) {
    return { title: "Something went wrong", message: "Please try again." };
  }

  if (!error.response) {
    return { title: "We couldn't connect", message: "Check your internet connection and try again." };
  }

  const status = error.response.status;
  const body = error.response.data as Partial<ApiError> | undefined;

  if (status === 400 && body?.fieldErrors?.length) {
    const fieldErrors: Record<string, string> = {};
    for (const fe of body.fieldErrors) fieldErrors[fe.field] = fe.message;
    return { title: "Some details need fixing", message: "Fix the highlighted fields and try again.", fieldErrors };
  }

  switch (status) {
    case 400:
      return { title: "That didn't work", message: "Check the details and try again." };
    case 401:
      return {
        title: "You've been signed out",
        message: "You were signed out to keep patient records safe. Sign in again to continue.",
      };
    case 403:
      return {
        title: "You don't have access",
        message: "You don't have access to this. If you need it, ask your facility administrator.",
      };
    case 404:
      return { title: "We couldn't find that", message: "It may have been removed or moved. Go back and try again." };
    case 409:
      return {
        title: "Someone else changed this",
        message: "This was updated by someone else while you were working. Refresh to see the latest, then try again.",
      };
    case 413:
      return { title: "This file is too large", message: "Choose a smaller file and try again." };
    case 422: {
      const backendMessage = plainLanguageMessage(body?.message);
      return {
        title: "That couldn't be saved",
        message: backendMessage ?? (context ? `Check ${context} and try again.` : "Check the details and try again."),
      };
    }
    default:
      if (status >= 500) {
        return {
          title: "Something went wrong on our side",
          message: "Please try again in a moment. If it keeps happening, tell your facility administrator.",
          reference: shortReference(),
        };
      }
      return { title: "That didn't work", message: "Please try again." };
  }
}

/** Only pass a backend message through if it plainly reads like a sentence, not a technical dump. */
function plainLanguageMessage(message: string | null | undefined): string | null {
  if (!message) return null;
  if (message.length > 160) return null;
  if (/exception|stack trace|\bat java\.|\bnull\b|\bundefined\b|:\s*\d{3}\b/i.test(message)) return null;
  if (!/^[A-Z]/.test(message.trim())) return null;
  return message;
}

function shortReference(): string {
  return Date.now().toString(36).slice(-4).toUpperCase();
}
