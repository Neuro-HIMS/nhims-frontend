"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Loader2, Mail, RefreshCw, Shield, User, Building2, Layers } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { extractErrorMessage, formatRole } from "@/components/users/users-management-utils";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

export default function ProfileSettingsPage() {
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [busy, setBusy] = useState(false);

  const refreshProfile = useCallback(async () => {
    setBusy(true);
    try {
      const fresh = await authService.getCurrentUser();
      setUser(fresh);
      toast.success("Profile refreshed");
    } catch (e) {
      toast.error(extractErrorMessage(e, "Could not load your profile."));
    } finally {
      setBusy(false);
    }
  }, [setUser]);

  useEffect(() => {
    if (!storeUser) void refreshProfile();
  }, [storeUser, refreshProfile]);

  const user = storeUser;
  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading profile…
      </div>
    );
  }

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Identity details are managed by your administrator. Refresh to pull the latest facility branding and
          permissions from the server.
        </p>
      </div>

      <div className="flex flex-wrap justify-end">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void refreshProfile()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {initials}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-lg">
                {user.firstName} {user.lastName}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {user.username}
                </span>
                {user.email ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </span>
                ) : null}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Role" value={formatRole(user.role)} icon={Shield} />
            <Detail label="User ID" value={user.userId} monospace />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Facility</CardTitle>
          </div>
          <CardDescription>The site you are signed into.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Detail label="Name" value={user.facilityName} />
          <Detail label="Code" value={user.facilityCode} />
          <Detail label="Facility ID" value={user.facilityId} monospace />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Workspace access</CardTitle>
          </div>
          <CardDescription>Modules assigned to your account and enabled for this facility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your modules</p>
            <div className="flex flex-wrap gap-1.5">
              {user.assignedModules?.length ? (
                user.assignedModules.map((m) => (
                  <Badge key={m} variant="secondary">
                    {moduleLabel(m)}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None listed</span>
              )}
            </div>
          </div>
          {user.enabledHmisModuleKeys?.length ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Facility-enabled HMIS modules
              </p>
              <div className="flex flex-wrap gap-1.5">
                {user.enabledHmisModuleKeys.map((m) => (
                  <Badge key={m} variant="outline">
                    {moduleLabel(m)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 shrink-0" />
            <span>
              Two-factor authentication:{" "}
              <span className="font-medium text-foreground">{user.totpEnabled ? "On" : "Off"}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function moduleLabel(key: string): string {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Detail({
  label,
  value,
  monospace,
  icon: Icon,
}: {
  label: string;
  value: string;
  monospace?: boolean;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 flex items-center gap-1.5 text-sm text-foreground ${monospace ? "font-mono text-xs break-all" : ""}`}
      >
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
        {value || "—"}
      </p>
    </div>
  );
}
