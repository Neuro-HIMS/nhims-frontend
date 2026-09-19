import { z } from "zod";

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

/** Shown as a live checklist wherever a new password is chosen (§8.1). */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 10 characters", test: (v) => v.length >= 10 },
  { id: "upper", label: "An uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "A lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "A number", test: (v) => /\d/.test(v) },
  { id: "special", label: "A special character (like @ or !)", test: (v) => /[@$!%*?&]/.test(v) },
];

export function passwordMeetsRules(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

export const newPasswordSchema = z
  .string()
  .min(1, "Choose a new password")
  .refine(passwordMeetsRules, "Choose a password that meets all the rules below.");
