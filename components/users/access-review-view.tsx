"use client";

import { useMemo, useState } from "react";
import { Check, Download } from "lucide-react";

import { NAV_GROUP_LABELS, NAV_GROUP_ORDER, NAV_ITEMS, type NavGroup } from "@/config/navigation";
import { ROLE_OPTIONS, defaultModulesForRole } from "@/components/users/users-management-constants";
import { displayName } from "@/lib/display-name";
import { roleLabel } from "@/lib/status-labels";
import { StatusPill } from "@/components/common/status-pill";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from "@/types/auth.types";
import type { UserListItem } from "@/types/users.types";

interface AccessReviewViewProps {
  users: UserListItem[];
}

export function AccessReviewView({ users }: AccessReviewViewProps) {
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [groupFilter, setGroupFilter] = useState<"all" | NavGroup>("all");

  const visibleGroups = groupFilter === "all" ? NAV_GROUP_ORDER : [groupFilter];
  const visibleItems = NAV_ITEMS.filter((item) => visibleGroups.includes(item.group));

  const rows = useMemo(() => users.filter((u) => roleFilter === "all" || u.role === roleFilter), [users, roleFilter]);

  function hasMoreThanUsual(user: UserListItem): boolean {
    const usual = new Set(defaultModulesForRole(user.role));
    return user.assignedModules.some((m) => !usual.has(m));
  }

  function downloadSpreadsheet() {
    const header = ["Name", "Username", "Job", ...visibleItems.map((i) => i.label)];
    const lines = [header.join(",")];
    for (const user of rows) {
      const cells = visibleItems.map((item) => (user.assignedModules.includes(item.module) ? "Yes" : "No"));
      lines.push(
        [`"${displayName(user)}"`, user.username, `"${roleLabel(user.role)}"`, ...cells].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "who-can-open-what.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Check who can open what</CardTitle>
          <CardDescription>Every member of staff, and which sections they can open.</CardDescription>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={downloadSpreadsheet} disabled={rows.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          Download as spreadsheet
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | UserRole)}>
            <SelectTrigger className="h-9 w-44">
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
          <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v as "all" | NavGroup)}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Section group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Every section</SelectItem>
              {NAV_GROUP_ORDER.map((group) => (
                <SelectItem key={group} value={group}>
                  {NAV_GROUP_LABELS[group]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState illustration="no-results" title="No staff match these filters" description="Try a different job." />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="sticky left-0 z-10 min-w-[200px] bg-surface-subtle px-3 py-2">Staff</th>
                  {visibleItems.map((item) => (
                    <th key={item.module} className="px-2 py-2 text-center whitespace-nowrap">
                      {item.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td className="sticky left-0 z-10 min-w-[200px] bg-card px-3 py-2 align-top">
                      <p className="font-medium text-foreground">{displayName(user)}</p>
                      <p className="text-xs text-muted-foreground">{roleLabel(user.role)}</p>
                      {hasMoreThanUsual(user) && (
                        <StatusPill tone="warning" className="mt-1">
                          More access than usual
                        </StatusPill>
                      )}
                    </td>
                    {visibleItems.map((item) => (
                      <td key={item.module} className="px-2 py-2 text-center">
                        {user.assignedModules.includes(item.module) ? (
                          <Check className="mx-auto h-4 w-4 text-success" aria-label="Can open" />
                        ) : (
                          <span className="text-muted-foreground" aria-label="Cannot open">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
