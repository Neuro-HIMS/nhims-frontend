"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import { ChangePasswordSettingsCard } from "@/components/settings/change-password-settings-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { PageCard } from "@/components/layouts/page-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";

const TIER2_TOTP_ROLES = new Set(["SUPER_ADMIN", "FACILITY_ADMIN", "HIO"]);

export default function SecuritySettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const eligible = Boolean(user && TIER2_TOTP_ROLES.has(user.role));
  const [step, setStep] = useState<"off" | "install" | "verify">("off");
  const [otpAuthUri, setOtpAuthUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disablePwd, setDisablePwd] = useState("");
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);

  async function handleBegin() {
    setBusy(true);
    try {
      const res = await authService.beginTotpEnrollment();
      setSecret(res.secret);
      setOtpAuthUri(res.otpAuthUri);
      setStep("verify");
    } catch (err) {
      notify.error(getFriendlyError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (code.trim().length < 6) {
      notify.error("Enter the 6-digit code from your phone.");
      return;
    }
    setBusy(true);
    try {
      await authService.completeTotpEnrollment(code.trim());
      notify.success("Extra sign-in protection is turned on.");
      setStep("off");
      setOtpAuthUri(null);
      setSecret(null);
      setCode("");
      const me = await authService.getCurrentUser();
      setUser(me);
    } catch {
      notify.error("That code didn't work. Check your phone and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!disablePwd.trim()) {
      notify.error("Enter your password to turn this off.");
      throw new Error("missing password");
    }
    setBusy(true);
    try {
      await authService.disableTotp(disablePwd.trim());
      notify.success("Extra sign-in protection is turned off.");
      setDisablePwd("");
      const me = await authService.getCurrentUser();
      setUser(me);
    } catch (err) {
      notify.error(getFriendlyError(err).message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleReissueSession() {
    setSessionBusy(true);
    try {
      const lr = await authService.reissueSession();
      setUser(lr.user);
      notify.success("Your access is up to date.");
    } catch (e) {
      notify.error(getFriendlyError(e).message);
    } finally {
      setSessionBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageCard title="Sign-in and security" description="Your password and extra sign-in protection." />

      <ChangePasswordSettingsCard />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Your access</CardTitle>
          </div>
          <CardDescription>
            If your facility administrator recently changed your job or what you can open, refresh to pick that up
            without signing out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" disabled={sessionBusy} onClick={() => void handleReissueSession()}>
            {sessionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh my access
          </Button>
        </CardContent>
      </Card>

      {eligible && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Extra sign-in protection</CardTitle>
              </div>
              <span
                className={
                  user?.totpEnabled
                    ? "status-pill status-pill-success"
                    : "status-pill status-pill-neutral"
                }
              >
                {user?.totpEnabled ? "On" : "Off"}
              </span>
            </div>
            <CardDescription>Ask for a 6-digit code from your phone each time you sign in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user?.totpEnabled && step === "off" && (
              <Button type="button" disabled={busy} onClick={() => void handleBegin()}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Turn on
              </Button>
            )}

            {!user?.totpEnabled && step === "verify" && otpAuthUri && (
              <div className="space-y-4">
                <ol className="space-y-3 text-sm text-foreground">
                  <li>
                    <span className="font-medium">1. Install an authenticator app</span> — any app that makes 6-digit
                    codes, on your phone.
                  </li>
                  <li className="space-y-2">
                    <span className="font-medium">2. Scan this code</span>
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                      <div className="rounded-lg border border-border bg-white p-3">
                        <QRCodeSVG value={otpAuthUri} size={144} />
                      </div>
                      {secret && (
                        <p className="text-xs text-muted-foreground">
                          Can&apos;t scan it? Enter this key in your app instead:
                          <br />
                          <span className="font-clinical break-all text-foreground">{secret}</span>
                        </p>
                      )}
                    </div>
                  </li>
                  <li className="space-y-2">
                    <span className="font-medium">3. Enter the 6-digit code</span>
                    <div>
                      <InputOTP maxLength={6} value={code} onChange={setCode}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </li>
                </ol>
                <div className="flex gap-2">
                  <Button type="button" disabled={busy} onClick={() => void handleComplete()}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Turn on
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setStep("off");
                      setOtpAuthUri(null);
                      setSecret(null);
                      setCode("");
                    }}
                  >
                    Cancel setup
                  </Button>
                </div>
              </div>
            )}

            {user?.totpEnabled && (
              <Button type="button" variant="destructive-outline" onClick={() => setConfirmDisableOpen(true)}>
                Turn off
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDisableOpen}
        onOpenChange={setConfirmDisableOpen}
        title="Turn off extra sign-in protection?"
        description="You'll only need your password to sign in after this. Enter your password to confirm."
        confirmLabel="Yes, turn it off"
        destructive
        pending={busy}
        footerExtra={
          <div className="space-y-1.5">
            <label htmlFor="totp-disable-pw" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="totp-disable-pw"
              type="password"
              autoComplete="current-password"
              value={disablePwd}
              onChange={(e) => setDisablePwd(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        }
        onConfirm={handleDisable}
      />

      {!eligible && (
        <InlineNotice tone="info">
          Extra sign-in protection isn&apos;t available for your job yet.
        </InlineNotice>
      )}
    </div>
  );
}
