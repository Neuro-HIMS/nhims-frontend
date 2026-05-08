"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";

import { ChangePasswordSettingsCard } from "@/components/settings/change-password-settings-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { extractErrorMessage } from "@/components/users/users-management-utils";

const TIER2_TOTP_ROLES = new Set(["SUPER_ADMIN", "FACILITY_ADMIN", "HIO"]);

export default function SecuritySettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const eligible = Boolean(user && TIER2_TOTP_ROLES.has(user.role));
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disablePwd, setDisablePwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);

  async function handleBegin() {
    setBusy(true);
    try {
      const res = await authService.beginTotpEnrollment();
      setSecret(res.secret);
      setUri(res.otpAuthUri);
      toast.message("Secret generated", { description: "Add it to your authenticator app, then confirm below." });
    } catch {
      toast.error("Could not start enrolment. Check role eligibility and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!code.trim()) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    try {
      await authService.completeTotpEnrollment(code.trim());
      toast.success("Two-factor authentication is now required at sign-in.");
      setSecret(null);
      setUri(null);
      setCode("");
      try {
        const me = await authService.getCurrentUser();
        useAuthStore.getState().setUser(me);
      } catch {
        /* optional */
      }
    } catch {
      toast.error("Verification failed. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!disablePwd.trim()) {
      toast.error("Enter your password to disable TOTP.");
      return;
    }
    setBusy(true);
    try {
      await authService.disableTotp(disablePwd.trim());
      toast.success("Two-factor authentication disabled.");
      setDisablePwd("");
      try {
        const me = await authService.getCurrentUser();
        useAuthStore.getState().setUser(me);
      } catch {
        /* ignore */
      }
    } catch {
      toast.error("Could not disable TOTP. Check your password.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReissueSession() {
    setSessionBusy(true);
    try {
      const lr = await authService.reissueSession();
      setUser(lr.user);
      toast.success("Session refreshed with latest permissions and facility branding.");
    } catch (e) {
      toast.error(extractErrorMessage(e, "Could not refresh session."));
    } finally {
      setSessionBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Password, session, and two-factor settings for your account.
        </p>
      </div>

      <ChangePasswordSettingsCard />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Session</CardTitle>
          </div>
          <CardDescription>
            Reload your JWT and profile from the server after an administrator changes your role, modules, or facility
            branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={sessionBusy} onClick={() => void handleReissueSession()}>
            {sessionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh session &amp; permissions
          </Button>
          <p className="text-xs text-muted-foreground">
            Forgot your password?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign out
            </Link>{" "}
            and use &quot;Forgot password&quot; on the sign-in page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Two-factor authentication (TOTP)</CardTitle>
          </div>
          <CardDescription>
            Tier-2 administrator accounts (Super Admin, Facility Admin, HIO) can bind a time-based one-time password
            app. After enrolment, sign-in requires both password and a 6-digit code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!eligible && (
            <p className="text-sm text-muted-foreground">
              Your role is not eligible for self-service TOTP management on this deployment.
            </p>
          )}
          {eligible && user && !user.totpEnabled && (
            <div className="space-y-3">
              {!secret && (
                <Button type="button" disabled={busy} onClick={() => void handleBegin()}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate authenticator secret
                </Button>
              )}
              {secret && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Secret (base32)</p>
                  <code className="block break-all text-xs">{secret}</code>
                  {uri && (
                    <>
                      <p className="pt-2 font-medium">otpauth URI</p>
                      <code className="block break-all text-xs">{uri}</code>
                    </>
                  )}
                  <div className="space-y-2 pt-3">
                    <Label htmlFor="totp-verify">6-digit code</Label>
                    <Input
                      id="totp-verify"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      className="max-w-xs"
                    />
                    <Button type="button" disabled={busy} onClick={() => void handleComplete()}>
                      Confirm and enable TOTP
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {eligible && user?.totpEnabled && (
            <div className="space-y-3">
              <p className="text-sm text-foreground">Two-factor authentication is enabled for your account.</p>
              <div className="space-y-2 max-w-md">
                <Label htmlFor="totp-disable-pw">Password (to disable)</Label>
                <Input
                  id="totp-disable-pw"
                  type="password"
                  autoComplete="current-password"
                  value={disablePwd}
                  onChange={(e) => setDisablePwd(e.target.value)}
                />
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void handleDisable()}>
                  Disable TOTP
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
