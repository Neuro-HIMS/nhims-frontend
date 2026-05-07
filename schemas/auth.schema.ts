import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username is too long")
    .trim(),
  password: z
    .string()
    .min(1, "Password is required")
    .max(50, "Password is too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/, "Password must contain at least 10 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character"),
  totpCode: z.string().max(10).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;