import { KeyRound, MoreHorizontal } from "lucide-react";

import type { UserRole } from "@/types/auth.types";
import type { UserListItem } from "@/types/users.types";
import { ROLE_OPTIONS } from "@/components/users/users-management-constants";
import { formatLastLogin, formatRole } from "@/components/users/users-management-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  isActionLoading: boolean;
  actionUserId: string | null;
  actionType: "reset-password" | "toggle-status" | null;
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
  isActionLoading,
  actionUserId,
  actionType,
}: StaffAccountsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Accounts</CardTitle>
        <CardDescription>Manage account status and actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Search by name" value={search} onChange={(e) => onSearchChange(e.target.value)} />
          <Select value={roleFilter} onValueChange={(value) => onRoleFilterChange(value as "all" | UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>
                  {formatRole(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as "all" | "active" | "inactive")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end text-sm text-muted-foreground">{users.length} users</div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Email verification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Loading accounts...
                  </span>
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{formatLastLogin(user.lastLoginAt)}</TableCell>
                <TableCell>Not verified</TableCell>
                <TableCell>
                  <Badge variant={user.active ? "secondary" : "outline"}>{user.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditAccess(user.id)}>Edit access</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResetPassword(user)} disabled={isActionLoading}>
                        {isActionLoading && actionUserId === user.id && actionType === "reset-password" ? (
                          <Spinner className="mr-2 h-4 w-4" />
                        ) : (
                          <KeyRound className="mr-2 h-4 w-4" />
                        )}
                        {isActionLoading && actionUserId === user.id && actionType === "reset-password"
                          ? "Resetting password..."
                          : "Reset password"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(user, !user.active)} disabled={isActionLoading}>
                        {isActionLoading && actionUserId === user.id && actionType === "toggle-status" ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4" />
                            Updating status...
                          </>
                        ) : (
                          <>{user.active ? "Disable" : "Enable"}</>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && users.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
      </CardContent>
    </Card>
  );
}
