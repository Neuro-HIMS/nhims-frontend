"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import type { AppModule, UserRole } from "@/types/auth.types";
import type { UserListItem } from "@/types/users.types";
import { authService } from "@/services/auth.service";
import { usersService } from "@/services/users.service";
import { useAuthStore } from "@/store/auth.store";
import { useDisabledSections } from "@/hooks/use-disabled-sections";
import {
  PLACEHOLDER_CLINICAL_MODULES,
  ROLE_OPTIONS,
  defaultModulesForRole,
} from "@/components/users/users-management-constants";
import { SectionsCheckboxGroups } from "@/components/users/sections-checkbox-groups";
import { roleLabel } from "@/lib/status-labels";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoleAssignmentPageProps {
  userId: string;
}

export function RoleAssignmentPage({ userId }: RoleAssignmentPageProps) {
  const router = useRouter();
  const setSessionUser = useAuthStore((s) => s.setUser);
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const disabledModules = useDisabledSections();

  const [user, setUser] = useState<UserListItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const roleChangeResolvedRef = useRef(false);

  async function loadUser() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await usersService.getById(userId);
      setUser({
        ...data,
        assignedModules: data.assignedModules.filter((m) => !PLACEHOLDER_CLINICAL_MODULES.has(m)),
      });
    } catch (error) {
      setLoadError(getFriendlyError(error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function toggleModule(module: AppModule, checked: boolean) {
    if (!user || PLACEHOLDER_CLINICAL_MODULES.has(module)) return;
    const nextModules = checked
      ? Array.from(new Set([...user.assignedModules, module]))
      : user.assignedModules.filter((m) => m !== module);
    setUser({ ...user, assignedModules: nextModules });
  }

  function handleRoleSelect(nextRole: UserRole) {
    if (!user || nextRole === user.role) return;
    setPendingRole(nextRole);
  }

  async function saveChanges() {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await usersService.updateAccess(user.id, user.role, user.assignedModules);
      setUser(updated);
      notify.success(`Access saved for ${updated.firstName} ${updated.lastName}.`);
      if (currentUserId === updated.id) {
        const session = await authService.reissueSession();
        setSessionUser(session.user);
        router.refresh();
      }
    } catch (error) {
      notify.error(getFriendlyError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="px-0" onClick={() => router.push("/users?view=staff")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to staff
        </Button>
        <Button onClick={() => void saveChanges()} disabled={!user || isSaving || loading}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving…" : "Save access"}
        </Button>
      </div>

      {loadError && <InlineNotice tone="error">{loadError}</InlineNotice>}

      {loading && <CardSkeleton />}

      {user && (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {user.firstName} {user.lastName}
              </CardTitle>
              <CardDescription>{user.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium break-all">{user.email}</div>
                <div className="text-muted-foreground">Facility</div>
                <div className="font-medium">{user.facilityName}</div>
                <div className="text-muted-foreground">Status</div>
                <div>
                  <StatusPill tone={user.active ? "success" : "neutral"}>{user.active ? "Active" : "Inactive"}</StatusPill>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job and access</CardTitle>
              <CardDescription>What this person can open.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm space-y-1">
                <p className="text-sm font-medium text-foreground">Job</p>
                <Select value={user.role} onValueChange={(value) => handleRoleSelect(value as UserRole)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Sections they can open</p>
                <SectionsCheckboxGroups
                  selected={user.assignedModules}
                  onToggle={toggleModule}
                  disabledModules={disabledModules}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={pendingRole !== null}
        onOpenChange={(open) => {
          if (open) return;
          // Any dismissal that isn't the explicit "Use usual sections" confirm (the "Keep current
          // sections" button, Escape, or the backdrop) applies the job change but leaves sections as-is.
          if (!roleChangeResolvedRef.current && user && pendingRole) {
            setUser({ ...user, role: pendingRole });
          }
          roleChangeResolvedRef.current = false;
          setPendingRole(null);
        }}
        title={`Also change their sections to the usual set for a ${pendingRole ? roleLabel(pendingRole) : ""}?`}
        description="You can still add or remove individual sections afterwards."
        cancelLabel="Keep current sections"
        confirmLabel="Use usual sections"
        onConfirm={() => {
          if (!user || !pendingRole) return;
          roleChangeResolvedRef.current = true;
          setUser({ ...user, role: pendingRole, assignedModules: defaultModulesForRole(pendingRole) });
        }}
      />
    </section>
  );
}
