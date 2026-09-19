"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Shield, User } from "lucide-react";

import { PageCard } from "@/components/layouts/page-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";
import { roleLabel } from "@/lib/status-labels";
import { NAV_ITEMS } from "@/config/navigation";

export default function ProfileSettingsPage() {
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [busy, setBusy] = useState(false);

  const refreshProfile = useCallback(async () => {
    setBusy(true);
    try {
      const fresh = await authService.getCurrentUser();
      setUser(fresh);
    } catch (e) {
      notify.error(getFriendlyError(e).message);
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
      <div className="mx-auto max-w-3xl space-y-6">
        <PageCard title="My profile" description="Your name and contact details." />
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-56 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-14 animate-pulse rounded-md bg-muted" />
              <div className="h-14 animate-pulse rounded-md bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = (
    `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}` ||
    user.username.slice(0, 2)
  ).toUpperCase();

  const sectionLabels = (user.assignedModules ?? [])
    .map((m) => NAV_ITEMS.find((item) => item.module === m)?.label)
    .filter((label): label is string => Boolean(label));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageCard
        title="My profile"
        description="Your name and contact details."
        actions={
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void refreshProfile()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">
              {initials}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-lg">
                {user.firstName} {user.lastName}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Job" value={roleLabel(user.role)} icon={Shield} />
            <Detail label="Facility" value={user.facilityName} />
          </div>
          {sectionLabels.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">What you can open</p>
              <p className="text-sm text-foreground">{sectionLabels.join(" · ")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
        {value || "—"}
      </p>
    </div>
  );
}
