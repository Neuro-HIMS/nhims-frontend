"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";

import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNotice } from "@/components/common/inline-notice";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z.object({
  usernameOrEmail: z.string().min(1, "Enter your username"),
});
type FormValues = z.infer<typeof schema>;

const CONFIRMATION =
  "If that username exists, we've sent reset instructions to the email on the account. If you don't get them, ask your facility administrator.";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { usernameOrEmail: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await authService.forgotPassword(values.usernameOrEmail.trim());
    } catch {
      // Same confirmation either way — never reveal whether the account exists.
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className="login-card rounded-xl bg-card p-6 text-card-foreground">
      <h3 className="mb-1 text-xl font-semibold">Reset your password</h3>
      <p className="mb-5 text-sm text-muted-foreground">
        Enter your username and we&apos;ll help you get back in.
      </p>

      {sent ? (
        <div className="space-y-4">
          <InlineNotice tone="info">{CONFIRMATION}</InlineNotice>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="usernameOrEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-card-foreground">Username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={loading}
                      className="login-input h-10 rounded-md font-clinical"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="h-10 w-full rounded-md" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send reset instructions"
              )}
            </Button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </form>
        </Form>
      )}
    </div>
  );
}
