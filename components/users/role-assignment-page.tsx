"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Save } from "lucide-react";

import type { AppModule, UserRole } from "@/types/auth.types";
import type { UserListItem } from "@/types/users.types";
import { authService } from "@/services/auth.service";
import { usersService } from "@/services/users.service";
import { useAuthStore } from "@/store/auth.store";
import { MODULE_OPTIONS, ROLE_OPTIONS, defaultModulesForRole } from "@/components/users/users-management-constants";
import { extractErrorMessage, formatRole } from "@/components/users/users-management-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface RoleAssignmentPageProps {
  userId: string;
}

export function RoleAssignmentPage({ userId }: RoleAssignmentPageProps) {
  const router = useRouter();
  const setSessionUser = useAuthStore((s) => s.setUser);
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const [user, setUser] = useState<UserListItem | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadUser() {
    setLoading(true);
    try {
      setUser(await usersService.getById(userId));
    } catch (error) {
      setMessage(extractErrorMessage(error, "Failed to load user profile."));
    } finally {
      setLoading(false);
    }
  }

  function toggleModule(module: AppModule, checked: boolean) {
    if (!user) return;
    const nextModules = checked
      ? Array.from(new Set([...user.assignedModules, module]))
      : user.assignedModules.filter((m) => m !== module);
    setUser({ ...user, assignedModules: nextModules });
  }

  function applyPreset() {
    if (!user) return;
    setUser({ ...user, assignedModules: defaultModulesForRole(user.role) });
    setMessage(`Default modules applied for ${formatRole(user.role)}.`);
  }

  async function saveChanges() {
    if (!user) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const updated = await usersService.updateAccess(user.id, user.role, user.assignedModules);
      setUser(updated);
      setMessage(`Access settings saved for ${updated.firstName} ${updated.lastName}.`);
      if (currentUserId === updated.id) {
        const session = await authService.reissueSession();
        setSessionUser(session.user);
        router.refresh();
      }
    } catch (error) {
      setMessage(extractErrorMessage(error, "Failed to save access settings."));
    } finally {
      setIsSaving(false);
    }
  }

  const visibleModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MODULE_OPTIONS;
    return MODULE_OPTIONS.filter((item) => item.label.toLowerCase().includes(q));
  }, [search]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => router.push("/users?view=staff")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Staff Accounts
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Role Assignment</h1>
          <p className="text-sm text-muted-foreground">Update role and module access for a specific user account.</p>
        </div>
        <Button onClick={() => void saveChanges()} disabled={!user || isSaving || loading}>
          {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Access"}
        </Button>
      </header>

      {message && (
        <div className="notice-info flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              Loading user details...
            </span>
          </CardContent>
        </Card>
      )}

      {user && (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
              <CardDescription>Account identity and status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Name</div>
                <div className="font-medium">{user.firstName} {user.lastName}</div>
                <div className="text-muted-foreground">Username</div>
                <div className="font-medium">{user.username}</div>
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium break-all">{user.email}</div>
                <div className="text-muted-foreground">Facility</div>
                <div className="font-medium">{user.facilityName} ({user.facilityCode})</div>
                <div className="text-muted-foreground">Status</div>
                <div><Badge variant={user.active ? "secondary" : "outline"}>{user.active ? "Active" : "Inactive"}</Badge></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>Assign role and module permissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Role</p>
                  <Select value={user.role} onValueChange={(value) => setUser({ ...user, role: value as UserRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {formatRole(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Module search</p>
                  <Input placeholder="Filter modules..." value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
              </div>
              <div>
                <Button variant="outline" onClick={applyPreset}>Apply Default Modules for Role</Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {visibleModules.map((module) => {
                  const checked = user.assignedModules.includes(module.module);
                  return (
                    <label key={module.module} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2">
                      <Checkbox checked={checked} onCheckedChange={(next) => toggleModule(module.module, next === true)} />
                      <span className="text-sm">{module.label}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
