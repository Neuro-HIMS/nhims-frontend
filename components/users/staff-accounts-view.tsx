import { KeyRound, Shield, UserPlus, UserX } from "lucide-react";

import type { UserRole } from "@/types/auth.types";
import type { UserListItem } from "@/types/users.types";
import { ROLE_OPTIONS } from "@/components/users/users-management-constants";
import { DataTable, type DataTableColumn, TableToolbar } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { roleLabel } from "@/lib/status-labels";
import { formatLastLogin } from "@/components/users/users-management-utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StaffAccountsViewProps {
  users: UserListItem[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: "all" | UserRole;
  onRoleFilterChange: (value: "all" | UserRole) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusFilterChange: (value: "all" | "active" | "inactive") => void;
  onEditAccess: (userId: string) => void;
  onResetPassword: (user: UserListItem) => void;
  onToggleStatus: (user: UserListItem, nextActive: boolean) => void;
}

export function StaffAccountsView({
  users,
  loading,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onEditAccess,
  onResetPassword,
  onToggleStatus,
}: StaffAccountsViewProps) {
  const columns: DataTableColumn<UserListItem>[] = [
    {
      key: "name",
      header: "Name",
      cell: (u) => (
        <span className="font-medium text-foreground">
          {u.firstName} {u.lastName}
        </span>
      ),
    },
    { key: "username", header: "Username", cell: (u) => <span className="font-clinical text-xs">{u.username}</span> },
    { key: "job", header: "Job", cell: (u) => roleLabel(u.role) },
    {
      key: "sections",
      header: "Sections",
      cell: (u) => `${u.assignedModules.length} section${u.assignedModules.length === 1 ? "" : "s"}`,
      hideOnTablet: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => <StatusPill tone={u.active ? "success" : "neutral"}>{u.active ? "Active" : "Inactive"}</StatusPill>,
    },
    {
      key: "lastLogin",
      header: "Last sign-in",
      cell: (u) => formatLastLogin(u.lastLoginAt),
      hideOnTablet: true,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={loading ? undefined : users}
      getRowId={(u) => u.id}
      isLoading={loading}
      empty={{
        illustration: "empty-list",
        title: search || roleFilter !== "all" || statusFilter !== "all" ? "No staff match these filters" : "No staff yet",
        description:
          search || roleFilter !== "all" || statusFilter !== "all"
            ? "Try a different name, job or status."
            : "Staff you add will appear here.",
      }}
      toolbar={
        <TableToolbar
          search={{ value: search, onChange: onSearchChange, placeholder: "Search by name or username" }}
          filters={
            <>
              <Select value={roleFilter} onValueChange={(value) => onRoleFilterChange(value as "all" | UserRole)}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every job</SelectItem>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => onStatusFilterChange(value as "all" | "active" | "inactive")}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      }
      rowActions={(user) => (
        <>
          <DropdownMenuItem onClick={() => onEditAccess(user.id)}>
            <Shield className="mr-2 h-4 w-4" />
            Change access
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onResetPassword(user)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggleStatus(user, !user.active)}>
            {user.active ? <UserX className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {user.active ? "Deactivate" : "Reactivate"}
          </DropdownMenuItem>
        </>
      )}
    />
  );
}
