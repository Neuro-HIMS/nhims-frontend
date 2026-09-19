"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { loginSchema, type LoginInput } from "@/schemas/auth.schema";
import { useAuth, type LoginErrorKind } from "@/hooks/auth/use-auth";
import { getLandingPathForUser } from "@/lib/access-control";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNotice } from "@/components/common/inline-notice";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface LoginFormProps {
  sessionExpired?: boolean;
  next?: string;
}

export function LoginForm({ sessionExpired, next }: LoginFormProps) {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showTotp, setShowTotp] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; kind: LoginErrorKind } | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", totpCode: "" },
  });

  useEffect(() => {
    // If a prior native form submit leaked credentials into query params,
    // immediately scrub them from the URL and clear the password field.
    const params = new URLSearchParams(window.location.search);
    const hasCredentialParams = params.has("username") || params.has("password");
    if (!hasCredentialParams) return;

    form.reset({
      username: params.get("username") ?? "",
      password: "",
      totpCode: "",
    });
    window.history.replaceState({}, document.title, "/login");
  }, [form]);

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const result = await login(values);
    if (!result.ok) {
      setServerError({ message: result.error, kind: result.kind ?? "unknown" });
      if (result.kind === "totp-required" || result.kind === "totp-invalid") {
        setShowTotp(true);
      }
      return;
    }
    if (result.user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    router.replace(next && next.startsWith("/") ? next : getLandingPathForUser(result.user));
  }

  return (
    <div className="space-y-4">
      <div className="login-card rounded-xl bg-card p-6 text-card-foreground">
        <h3 className="mb-1 text-xl font-semibold">Sign in</h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Use the username and password your facility gave you.
        </p>

        {sessionExpired && !serverError && (
          <div className="mb-4">
            <InlineNotice tone="pending">
              You were signed out to keep patient records safe. Sign in again to continue.
            </InlineNotice>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            method="post"
            className="space-y-4"
            noValidate
          >
            {serverError && (
              <InlineNotice tone={serverError.kind === "totp-required" ? "info" : "error"}>
                {serverError.message}
              </InlineNotice>
            )}

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-card-foreground">Username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={isLoading}
                      className="login-input h-10 rounded-md font-clinical"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm text-card-foreground">Password</FormLabel>
                    <Link href="/login?step=forgot" className="text-xs font-medium text-accent hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="login-input h-10 rounded-md pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!showTotp && (
              <button
                type="button"
                onClick={() => setShowTotp(true)}
                className="text-xs font-medium text-accent hover:underline"
              >
                I use a code from my phone
              </button>
            )}

            {showTotp && (
              <FormField
                control={form.control}
                name="totpCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-card-foreground">
                      6-digit code from your phone (only if you&apos;ve turned this on)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="e.g. 123456"
                        disabled={isLoading}
                        className="login-input h-10 rounded-md font-clinical"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              className="h-10 w-full rounded-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
