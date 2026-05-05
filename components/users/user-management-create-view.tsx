import { UserPlus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import type { UserRole } from "@/types/auth.types";
import { ROLE_OPTIONS } from "@/components/users/users-management-constants";
import { formatRole } from "@/components/users/users-management-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface CreateFormState {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
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
  const showError = (key: keyof CreateFormState) =>
    formErrors[key] ? <p className="text-xs text-destructive">{formErrors[key]}</p> : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Staff Account</CardTitle>
        <CardDescription>Add a user and assign a starting role.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Input
            placeholder="First name"
            value={createForm.firstName}
            onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
          />
          {showError("firstName")}
        </div>
        <div className="space-y-1">
          <Input
            placeholder="Last name"
            value={createForm.lastName}
            onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
          />
          {showError("lastName")}
        </div>
        <div className="space-y-1">
          <Input
            placeholder="Username"
            value={createForm.username}
            onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
          />
          {showError("username")}
        </div>
        <div className="space-y-1">
          <Input
            placeholder="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
          />
          {showError("email")}
        </div>
        <div className="space-y-1">
          <Input
            placeholder="Password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
          />
          {showError("password")}
        </div>
        <div className="space-y-1">
          <Input
            placeholder="Confirm password"
            type="password"
            value={createForm.confirmPassword}
            onChange={(e) => setCreateForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
          {showError("confirmPassword")}
        </div>
        <div className="md:col-span-2">
          <Select value={createForm.role} onValueChange={(value) => setCreateForm((p) => ({ ...p, role: value as UserRole }))}>
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
      </CardContent>
      <CardFooter>
        <Button onClick={onCreateAccount} disabled={isCreating}>
          {isCreating ? <Spinner className="mr-1 h-4 w-4" /> : <UserPlus className="mr-1 h-4 w-4" />}
          {isCreating ? "Creating..." : "Create Account"}
        </Button>
      </CardFooter>
    </Card>
  );
}
