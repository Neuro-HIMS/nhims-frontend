"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";

import type { UserRole } from "@/types/auth.types";
import type { AccessReviewItem, UserListItem } from "@/types/users.types";
import { usersService } from "@/services/users.service";
import { AccessReviewView } from "@/components/users/access-review-view";
import {
  defaultModulesForRole,
  isViewId,
  PLACEHOLDER_CLINICAL_MODULES,
  SUB_NAV,
  type ViewId,
} from "@/components/users/users-management-constants";
import { StaffAccountsView } from "@/components/users/staff-accounts-view";
import { UserManagementCreateView } from "@/components/users/user-management-create-view";
import { extractErrorMessage } from "@/components/users/users-management-utils";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface UsersManagementWorkspaceProps {
  facilityId: string;
  facilityName: string;
}

export function UsersManagementWorkspace({ facilityId, facilityName }: UsersManagementWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView: ViewId = isViewId(searchParams.get("view")) ? (searchParams.get("view") as ViewId) : "management";

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [accessReview, setAccessReview] = useState<AccessReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"reset-password" | "toggle-status" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  /** Disable account confirmation */
  const [pendingDisableUser, setPendingDisableUser] = useState<UserListItem | null>(null);
  const [pendingPasswordResetUser, setPendingPasswordResetUser] = useState<UserListItem | null>(null);
  const [issuedPasswordResetToken, setIssuedPasswordResetToken] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "RECORDS_OFFICER" as UserRole,
  });
  const [createFormErrors, setCreateFormErrors] = useState<Partial<Record<keyof typeof createForm, string>>>({});

  useEffect(() => {
    if (!isViewId(searchParams.get("view"))) updateView("management");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    void loadUsers();
    void loadAccessReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsers(showRefreshState = false) {
    if (showRefreshState) setIsRefreshing(true);
    setLoading(true);
    try {
      const response = await usersService.list();
      setUsers(response);
    } catch (error) {
      setMessage(extractErrorMessage(error, "Failed to load users."));
    } finally {
      setLoading(false);
      if (showRefreshState) setIsRefreshing(false);
    }
  }

  async function loadAccessReview() {
    try {
      setAccessReview(await usersService.accessReview());
    } catch {
      // keep module section resilient
    }
  }

  function updateView(view: ViewId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = search.trim().toLowerCase();
      const textMatch = !q
        || user.username.toLowerCase().includes(q)
        || `${user.firstName} ${user.lastName}`.toLowerCase().includes(q)
        || user.email.toLowerCase().includes(q);
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      const statusMatch = statusFilter === "all" || (statusFilter === "active" ? user.active : !user.active);
      return textMatch && roleMatch && statusMatch;
    });
  }, [users, search, roleFilter, statusFilter]);

  async function createAccount() {
    const validationErrors = validateCreateForm(createForm);
    setCreateFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setMessage("Fix validation errors before creating the account.");
      return;
    }
    setIsCreating(true);
    try {
      const created = await usersService.create({
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        facilityId,
        assignedModules: defaultModulesForRole(createForm.role),
      });
      setUsers((prev) => [created, ...prev]);
      setCreateForm({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "RECORDS_OFFICER",
      });
      setCreateFormErrors({});
      setMessage(`Created account for ${created.firstName} ${created.lastName}.`);
      await loadAccessReview();
    } catch (error) {
      setMessage(extractErrorMessage(error, "Could not create account."));
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleStatus(user: UserListItem, active: boolean) {
    setIsActionLoading(true);
    setActionUserId(user.id);
    setActionType("toggle-status");
    try {
      const updated = await usersService.updateStatus(user.id, active);
      setUsers((prev) => prev.map((m) => (m.id === user.id ? updated : m)));
      setMessage(`Account ${active ? "enabled" : "disabled"} for ${user.username}.`);
      setPendingDisableUser(null);
    } catch (error) {
      setMessage(extractErrorMessage(error, "Unable to update account status."));
      throw error;
    } finally {
      setIsActionLoading(false);
      setActionUserId(null);
      setActionType(null);
    }
  }

  async function handleResetPassword(user: UserListItem) {
    setIssuedPasswordResetToken(null);
    setIsActionLoading(true);
    setActionUserId(user.id);
    setActionType("reset-password");
    try {
      const result = await usersService.resetPassword(user.id);
      setMessage(result.message);
      setIssuedPasswordResetToken(result.passwordResetToken);
      setPendingPasswordResetUser(null);
    } catch (error) {
      setMessage(extractErrorMessage(error, "Unable to reset password."));
      throw error;
    } finally {
      setIsActionLoading(false);
      setActionUserId(null);
      setActionType(null);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage staff accounts, roles and access for {facilityName}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadUsers(true)} disabled={isRefreshing}>
            {isRefreshing ? <Spinner className="mr-1 h-4 w-4" /> : <RotateCcw className="mr-1 h-4 w-4" />}
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </header>

      <ModuleSubNav items={SUB_NAV} basePath="/users" />

      {message && (
        <div className="notice-info flex flex-col gap-2 rounded-md border px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
          {issuedPasswordResetToken && (
            <div className="ml-6 space-y-1 rounded-md bg-muted/50 p-2">
              <p className="text-xs font-medium text-muted-foreground">One-time reset token — copy and send securely:</p>
              <code className="block break-all text-xs">{issuedPasswordResetToken}</code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-1"
                onClick={() => void navigator.clipboard.writeText(issuedPasswordResetToken)}
              >
                Copy token
              </Button>
            </div>
          )}
        </div>
      )}

      {activeView === "management" && (
        <UserManagementCreateView
          createForm={createForm}
          setCreateForm={setCreateForm}
          formErrors={createFormErrors}
          isCreating={isCreating}
          onCreateAccount={() => void createAccount()}
        />
      )}

      {activeView === "staff" && (
        <StaffAccountsView
          users={filteredUsers}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onEditAccess={(userId) => router.push(`/users/role-assignment/${userId}`)}
          onResetPassword={(user) => setPendingPasswordResetUser(user)}
          onToggleStatus={(user, nextActive) => {
            if (nextActive) void toggleStatus(user, true);
            else setPendingDisableUser(user);
          }}
          isActionLoading={isActionLoading}
          actionUserId={actionUserId}
          actionType={actionType}
        />
      )}

      {activeView === "access" && <AccessReviewView accessReview={accessReview} />}

      <ConfirmDialog
        open={pendingDisableUser !== null}
        onOpenChange={(open) => !open && setPendingDisableUser(null)}
        title="Disable staff account?"
        description={
          pendingDisableUser
            ? `${pendingDisableUser.firstName} ${pendingDisableUser.lastName} (${pendingDisableUser.username}) will not be able to sign in until re-enabled.`
            : ""
        }
        confirmLabel="Disable account"
        destructive
        pending={isActionLoading}
        onConfirm={async () => {
          if (!pendingDisableUser) return;
          await toggleStatus(pendingDisableUser, false);
        }}
      />

      <ConfirmDialog
        open={pendingPasswordResetUser !== null}
        onOpenChange={(open) => !open && setPendingPasswordResetUser(null)}
        title="Reset password?"
        description={
          pendingPasswordResetUser
            ? `A one-time password reset token will be shown for ${pendingPasswordResetUser.username} after you confirm. Copy it and share it only through a secure channel. The user completes reset on the sign-in page (Forgot password).`
            : ""
        }
        confirmLabel="Reset password"
        pending={isActionLoading}
        onConfirm={async () => {
          if (!pendingPasswordResetUser) return;
          await handleResetPassword(pendingPasswordResetUser);
        }}
      />
    </section>
  );
}

function validateCreateForm(form: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Partial<Record<keyof typeof form, string>> {
  const errors: Partial<Record<keyof typeof form, string>> = {};

  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  if (!form.username.trim()) errors.username = "Username is required.";
  if (!form.email.trim()) errors.email = "Email is required.";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email.";

  if (!form.password) {
    errors.password = "Password is required.";
  } else {
    const hasUpper = /[A-Z]/.test(form.password);
    const hasLower = /[a-z]/.test(form.password);
    const hasDigit = /\d/.test(form.password);
    const hasSpecial = /[^A-Za-z\d]/.test(form.password);
    if (form.password.length < 12 || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      errors.password = "Use 12+ chars with upper, lower, number, and special symbol.";
    }
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Confirm password is required.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}
