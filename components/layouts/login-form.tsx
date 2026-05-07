"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

import { loginSchema, type LoginInput } from "@/schemas/auth.schema";
import { useAuth } from "@/hooks/auth/use-auth";
import { getLandingPathForUser } from "@/lib/access-control";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
      setServerError(result.error);
      return;
    }
    if (result.user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    router.replace(getLandingPathForUser(result.user));
  }

  return (
    <div className="space-y-4">
      <div className="login-card rounded-[5px] bg-card p-6 text-card-foreground">
        <h3 className="mb-1 text-xl font-semibold">Sign in</h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Enter your credentials to access your workspace.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            method="post"
            action="/login"
            className="space-y-4"
            noValidate
          >
            {serverError && (
              <div
                className="alert-critical flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
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
                      placeholder="Enter your username"
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
                  <FormLabel className="text-sm text-card-foreground">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
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

            <FormField
              control={form.control}
              name="totpCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-card-foreground">Authenticator code (if enabled)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit code"
                      disabled={isLoading}
                      className="login-input h-10 rounded-md font-clinical"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
