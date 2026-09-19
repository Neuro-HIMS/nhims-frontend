import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Enter your username")
    .max(100, "That username looks too long")
    .trim(),
  // No complexity check here — this is the sign-in field, not a new-password field.
  // The server is the source of truth for whether the password is correct.
  password: z.string().min(1, "Enter your password").max(100, "That password looks too long"),
  totpCode: z.string().max(10, "That code is too long. Check the 6-digit code and try again.").optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;