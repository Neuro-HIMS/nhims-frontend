"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, UserPlus } from "lucide-react";

import type { UserRole } from "@/types/auth.types";
import type { UserListItem } from "@/types/users.types";
import { usersService } from "@/services/users.service";
import { AccessReviewView } from "@/components/users/access-review-view";
import {
  defaultModulesForRole,
  isViewId,
  SUB_NAV,
  type ViewId,
} from "@/components/users/users-management-constants";
import { StaffAccountsView } from "@/components/users/staff-accounts-view";
import { UserManagementCreateView, type CreateFormState } from "@/components/users/user-management-create-view";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { Button } from "@/components/ui/button";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";

const EMPTY_FORM: CreateFormState = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "RECORDS_OFFICER",
  assignedModules: defaultModulesForRole("RECORDS_OFFICER"),
};

export function UsersManagementWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView: ViewId = isViewId(searchParams.get("view")) ? (searchParams.get("view") as ViewId) : "staff";

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{ name: string; username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pendingDisableUser, setPendingDisableUser] = useState<UserListItem | null>(null);
  const [pendingPasswordResetUser, setPendingPasswordResetUser] = useState<UserListItem | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [issuedReset, setIssuedReset] = useState<{ name: string; token: string } | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_FORM);
  const [createFormErrors, setCreateFormErrors] = useState<Partial<Record<keyof CreateFormState, string>>>({});

  useEffect(() => {
    if (!isViewId(searchParams.get("view"))) updateView("staff");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await usersService.list());
    } catch (error) {
      notify.error(getFriendlyError(error).message);
    } finally {
      setLoading(false);
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
      const textMatch =
        !q ||
        user.username.toLowerCase().includes(q) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      const statusMatch = statusFilter === "all" || (statusFilter === "active" ? user.active : !user.active);
      return textMatch && roleMatch && statusMatch;
    });
  }, [users, search, roleFilter, statusFilter]);

  async function createAccount() {
    const validationErrors = validateCreateForm(createForm);
    setCreateFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setIsCreating(true);
    try {
      const created = await usersService.create({
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        assignedModules: createForm.assignedModules,
      });
      setUsers((prev) => [created, ...prev]);
      setJustCreated({
        name: `${created.firstName} ${created.lastName}`,
        username: created.username,
        password: createForm.password,
      });
      setCreateForm(EMPTY_FORM);
      setCreateFormErrors({});
    } catch (error) {
      notify.error(getFriendlyError(error).message);
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleStatus(user: UserListItem, active: boolean) {
    setIsActionLoading(true);
    try {
      const updated = await usersService.updateStatus(user.id, active);
      setUsers((prev) => prev.map((m) => (m.id === user.id ? updated : m)));
      notify.success(active ? `${user.firstName} can sign in again.` : `${user.firstName}'s account was deactivated.`);
      setPendingDisableUser(null);
    } catch (error) {
      notify.error(getFriendlyError(error).message);
      throw error;
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleResetPassword(user: UserListItem) {
    setIsActionLoading(true);
    try {
      const result = await usersService.resetPassword(user.id);
      setIssuedReset({ name: `${user.firstName} ${user.lastName}`, token: result.passwordResetToken });
      setPendingPasswordResetUser(null);
    } catch (error) {
      notify.error(getFriendlyError(error).message);
      throw error;
    } finally {
      setIsActionLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageCard
        title="Staff and access"
        description="Staff accounts and what each person can open."
        actions={
          activeView !== "new" && (
            <Button onClick={() => updateView("new")}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add staff member
            </Button>
          )
        }
      />

      {activeView !== "new" && <ModuleSubNav items={SUB_NAV} basePath="/users" />}
      {activeView === "new" && (
        <Button variant="secondary" size="sm" onClick={() => { setJustCreated(null); updateView("staff"); }}>
          Back to staff
        </Button>
      )}

      {activeView === "new" && justCreated && (
        <div className="rounded-xl border border-success/30 bg-success-bg p-5">
          <p className="text-base font-semibold text-foreground">Account created for {justCreated.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Temporary password — share it with {justCreated.name.split(" ")[0]} privately. They&apos;ll choose their
            own when they first sign in.
          </p>
          <div className="mt-3 rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Username</p>
            <p className="font-clinical text-sm text-foreground">{justCreated.username}</p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">Temporary password</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="font-clinical flex-1 rounded-md bg-muted px-2.5 py-1.5 text-sm">{justCreated.password}</code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(justCreated.password);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setJustCreated(null)}>
              Add another staff member
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setJustCreated(null);
                updateView("staff");
              }}
            >
              Back to staff
            </Button>
          </div>
        </div>
      )}

      {activeView === "new" && !justCreated && (
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
        />
      )}

      {activeView === "access" && <AccessReviewView users={users} />}

      {issuedReset && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-foreground">
            Temporary password for <span className="font-semibold">{issuedReset.name}</span> — share it with them
            privately. They&apos;ll choose their own when they next sign in.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="font-clinical flex-1 rounded-md bg-muted px-2.5 py-1.5 text-sm">{issuedReset.token}</code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(issuedReset.token)}
            >
              <Copy className="mr-1.5 h-4 w-4" />
              Copy
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setIssuedReset(null)}>
              Done
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDisableUser !== null}
        onOpenChange={(open) => !open && setPendingDisableUser(null)}
        title={pendingDisableUser ? `Deactivate ${pendingDisableUser.firstName} ${pendingDisableUser.lastName}'s account?` : ""}
        description="They won't be able to sign in. Their past work stays in the records."
        cancelLabel="Keep account"
        confirmLabel="Yes, deactivate"
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
        title={pendingPasswordResetUser ? `Reset the password for ${pendingPasswordResetUser.firstName} ${pendingPasswordResetUser.lastName}?` : ""}
        description="You'll get a temporary password to share with them privately. Their current password stops working."
        cancelLabel="Go back"
        confirmLabel="Yes, reset password"
        pending={isActionLoading}
        onConfirm={async () => {
          if (!pendingPasswordResetUser) return;
          await handleResetPassword(pendingPasswordResetUser);
        }}
      />
    </section>
  );
}

function validateCreateForm(form: CreateFormState): Partial<Record<keyof CreateFormState, string>> {
  const errors: Partial<Record<keyof CreateFormState, string>> = {};

  if (!form.firstName.trim()) errors.firstName = "Enter a first name.";
  if (!form.lastName.trim()) errors.lastName = "Enter a last name.";
  if (!form.username.trim()) errors.username = "Enter a username.";
  if (!form.email.trim()) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address.";

  if (!form.password) {
    errors.password = "Choose a temporary password.";
  } else {
    const hasUpper = /[A-Z]/.test(form.password);
    const hasLower = /[a-z]/.test(form.password);
    const hasDigit = /\d/.test(form.password);
    const hasSpecial = /[^A-Za-z\d]/.test(form.password);
    if (form.password.length < 10 || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      errors.password = "Use at least 10 characters with an uppercase letter, a lowercase letter, a number and a symbol.";
    }
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Confirm the temporary password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords don't match.";
  }

  return errors;
}
