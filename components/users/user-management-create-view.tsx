import { useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import type { AppModule, UserRole } from "@/types/auth.types";
import { ROLE_OPTIONS, defaultModulesForRole } from "@/components/users/users-management-constants";
import { SectionsCheckboxGroups } from "@/components/users/sections-checkbox-groups";
import { roleLabel } from "@/lib/status-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export interface CreateFormState {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  assignedModules: AppModule[];
}

interface UserManagementCreateViewProps {
  createForm: CreateFormState;
  setCreateForm: Dispatch<SetStateAction<CreateFormState>>;
  formErrors: Partial<Record<keyof CreateFormState, string>>;
  isCreating: boolean;
  onCreateAccount: () => void;
}

export function UserManagementCreateView({
  createForm,
  setCreateForm,
  formErrors,
  isCreating,
  onCreateAccount,
}: UserManagementCreateViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const showError = (key: keyof CreateFormState) =>
    formErrors[key] ? <p className="text-xs text-destructive">{formErrors[key]}</p> : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a staff member</CardTitle>
        <CardDescription>Their name, job and a temporary password to share with them privately.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">First name</p>
            <Input
              value={createForm.firstName}
              onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
            />
            {showError("firstName")}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Last name</p>
            <Input
              value={createForm.lastName}
              onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
            />
            {showError("lastName")}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Username</p>
            <Input
              value={createForm.username}
              onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
              className="font-clinical"
              autoCapitalize="none"
              spellCheck={false}
            />
            {showError("username")}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Email</p>
            <Input
              type="email"
              placeholder="e.g. ama.mensah@facility.gov.gh"
              value={createForm.email}
              onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
            />
            {showError("email")}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Temporary password</p>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {showError("password")}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Confirm temporary password</p>
            <Input
              type={showPassword ? "text" : "password"}
              value={createForm.confirmPassword}
              onChange={(e) => setCreateForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            />
            {showError("confirmPassword")}
          </div>
        </div>

        <div className="max-w-sm space-y-1">
          <p className="text-sm font-medium text-foreground">Job</p>
          <Select
            value={createForm.role}
            onValueChange={(value) =>
              setCreateForm((p) => ({
                ...p,
                role: value as UserRole,
                assignedModules: defaultModulesForRole(value as UserRole),
              }))
            }
          >
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
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Sections they can open</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreateForm((p) => ({ ...p, assignedModules: defaultModulesForRole(p.role) }))}
            >
              Give the usual access for this job
            </Button>
          </div>
          <SectionsCheckboxGroups
            selected={createForm.assignedModules}
            onToggle={(module, checked) =>
              setCreateForm((p) => ({
                ...p,
                assignedModules: checked
                  ? Array.from(new Set([...p.assignedModules, module]))
                  : p.assignedModules.filter((m) => m !== module),
              }))
            }
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onCreateAccount} disabled={isCreating}>
          {isCreating ? <Spinner className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
          {isCreating ? "Creating account…" : "Create account"}
        </Button>
      </CardFooter>
    </Card>
  );
}
