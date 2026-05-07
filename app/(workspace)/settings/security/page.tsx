"use client";

import { useMemo, useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

const TIER2_TOTP_ROLES = new Set(["SUPER_ADMIN", "FACILITY_ADMIN", "HIO"]);

export default function SecuritySettingsPage() {
  const user = useAuthStore((s) => s.user);
  const eligible = useMemo(() => (user ? TIER2_TOTP_ROLES.has(user.role) : false), [user]);
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disablePwd, setDisablePwd] = useState("");
  const [busy, setBusy] = useState(false);

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
        /* session refresh optional */
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">Authenticator (TOTP) for privileged accounts.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Two-factor authentication</CardTitle>
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
          {eligible && !user?.totpEnabled && (
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
                  <div className="pt-3 space-y-2">
                    <Label htmlFor="totp-verify">6-digit code</Label>
                    <Input
                      id="totp-verify"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
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
              <div className="space-y-2">
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
