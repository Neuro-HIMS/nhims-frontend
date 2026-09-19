"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { ArrowLeft, Loader2 } from "lucide-react";

import { authService } from "@/services/auth.service";
import { newPasswordSchema } from "@/schemas/password.schema";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNotice } from "@/components/common/inline-notice";
import { PasswordRuleChecklist } from "@/components/common/password-rule-checklist";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const newPassword = useWatch({ control: form.control, name: "newPassword" });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setLoading(true);
    setExpired(false);
    try {
      await authService.resetPasswordWithToken(token, values.newPassword);
      notify.success("Password changed. Sign in with your new password.");
      router.replace("/login");
    } catch (err) {
      if (err instanceof AxiosError && (err.response?.status === 400 || err.response?.status === 404)) {
        setExpired(true);
      } else {
        notify.error("We couldn't reset your password. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="login-card rounded-xl bg-card p-6 text-card-foreground">
        <InlineNotice tone="error">This reset link has expired. Ask for a new one.</InlineNotice>
        <Link href="/login?step=forgot" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="login-card rounded-xl bg-card p-6 text-card-foreground">
      <h3 className="mb-1 text-xl font-semibold">Choose a new password</h3>
      <p className="mb-5 text-sm text-muted-foreground">Please choose a new password to continue.</p>

      {expired ? (
        <div className="space-y-4">
          <InlineNotice tone="error">This reset link has expired. Ask for a new one.</InlineNotice>
          <Link href="/login?step=forgot" className="flex items-center justify-center gap-1.5 text-sm font-medium text-accent hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Request a new link
          </Link>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-card-foreground">New password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" autoComplete="new-password" disabled={loading} className="login-input h-10 rounded-md" />
                  </FormControl>
                  <PasswordRuleChecklist value={newPassword} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-card-foreground">Confirm new password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" autoComplete="new-password" disabled={loading} className="login-input h-10 rounded-md" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="h-10 w-full rounded-md" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save new password"
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
