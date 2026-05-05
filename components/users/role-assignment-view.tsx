import type { AppModule, UserRole } from "@/types/auth.types";
import type { UserListItem } from "@/types/users.types";
import { MODULE_OPTIONS, ROLE_OPTIONS } from "@/components/users/users-management-constants";
import { formatRole } from "@/components/users/users-management-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoleAssignmentViewProps {
  users: UserListItem[];
  selectedUser: UserListItem;
  onSelectUser: (userId: string) => void;
  onRoleChange: (role: UserRole) => void;
  onApplyRolePreset: () => void;
  onToggleModule: (module: AppModule, checked: boolean) => void;
}

export function RoleAssignmentView({
  users,
  selectedUser,
  onSelectUser,
  onRoleChange,
  onApplyRolePreset,
  onToggleModule,
}: RoleAssignmentViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Assignment</CardTitle>
        <CardDescription>Assign role and module permissions using checkboxes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedUser.id} onValueChange={onSelectUser}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.username})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedUser.role} onValueChange={(value) => onRoleChange(value as UserRole)}>
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
        <Button variant="outline" onClick={onApplyRolePreset}>
          Apply Default Modules for Role
        </Button>
        <div className="rounded-md border p-3">
          <p className="mb-3 text-sm font-medium">Module Access</p>
          <div className="grid gap-2 md:grid-cols-2">
            {MODULE_OPTIONS.map((module) => {
              const checked = selectedUser.assignedModules.includes(module.module);
              return (
                <label key={module.module} className="flex cursor-pointer items-center gap-2 rounded border px-2 py-2">
                  <Checkbox checked={checked} onCheckedChange={(next) => onToggleModule(module.module, next === true)} />
                  <span className="text-sm">{module.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
