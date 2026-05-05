"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUB_NAV = [
  { label: "User Events", view: "users", href: "/audit-log?view=users" },
  { label: "Security Events", view: "security", href: "/audit-log?view=security" },
  { label: "System Events", view: "system", href: "/audit-log?view=system" },
];

export function AuditLogWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "users";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Log</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Traceability of user actions, security events, and system operations.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/audit-log" />
      <div className="pt-2">
        {view === "users" && <EventsTable events={USER_EVENTS} category="User Events" />}
        {view === "security" && <EventsTable events={SECURITY_EVENTS} category="Security Events" />}
        {view === "system" && <EventsTable events={SYSTEM_EVENTS} category="System Events" />}
      </div>
    </div>
  );
}

function EventsTable({ events, category }: { events: AuditEvent[]; category: string }) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = events.filter((e) => {
    const matchQ = !query.trim() || e.user.toLowerCase().includes(query.toLowerCase()) || e.description.toLowerCase().includes(query.toLowerCase());
    const matchAction = actionFilter === "all" || e.action === actionFilter;
    return matchQ && matchAction;
  });

  const actions = Array.from(new Set(events.map((e) => e.action)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1" style={{ maxWidth: 400 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user or description…"
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Timestamp</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">User</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((e, i) => (
              <tr key={i} className="table-row-interactive">
                <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">{e.timestamp}</td>
                <td className="px-4 py-3 font-medium text-foreground">{e.user}</td>
                <td className="px-4 py-3">
                  <span className={`status-pill text-xs ${
                    e.severity === "warning" ? "bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]" :
                    e.severity === "error" ? "status-pill-inactive" :
                    "status-pill-pending"
                  }`}>
                    {e.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{e.description}</td>
                <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">{e.ip}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No events match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type AuditEvent = {
  timestamp: string;
  user: string;
  action: string;
  description: string;
  ip: string;
  severity: "info" | "warning" | "error";
};

const USER_EVENTS: AuditEvent[] = [
  { timestamp: "2026-05-03 09:47", user: "records", action: "CREATE", description: "New patient registered — GH-2026-05512", ip: "192.168.1.14", severity: "info" },
  { timestamp: "2026-05-03 09:31", user: "lab", action: "UPDATE", description: "Lab result entered for order LAB-002", ip: "192.168.1.22", severity: "info" },
  { timestamp: "2026-05-03 09:15", user: "billing", action: "PAYMENT", description: "Payment recorded — RCT-20260503-001", ip: "192.168.1.18", severity: "info" },
  { timestamp: "2026-05-03 09:04", user: "nurse.multi", action: "UPDATE", description: "Triage priority assigned — GH-2026-04821", ip: "192.168.1.10", severity: "info" },
  { timestamp: "2026-05-03 08:54", user: "records", action: "VIEW", description: "Patient record accessed — GH-2026-03109", ip: "192.168.1.14", severity: "info" },
];

const SECURITY_EVENTS: AuditEvent[] = [
  { timestamp: "2026-05-03 08:12", user: "unknown", action: "LOGIN_FAIL", description: "Failed login attempt for username 'admin'", ip: "41.222.10.5", severity: "warning" },
  { timestamp: "2026-05-02 23:58", user: "system", action: "SESSION_EXPIRE", description: "Session expired — user 'nurse.multi'", ip: "192.168.1.10", severity: "info" },
  { timestamp: "2026-05-02 18:30", user: "admin", action: "ROLE_CHANGE", description: "Role updated for user 'billing' → BILLING_OFFICER", ip: "192.168.1.1", severity: "warning" },
];

const SYSTEM_EVENTS: AuditEvent[] = [
  { timestamp: "2026-05-03 06:00", user: "system", action: "BACKUP", description: "Automated daily database backup completed successfully", ip: "127.0.0.1", severity: "info" },
  { timestamp: "2026-05-03 05:45", user: "system", action: "SYNC", description: "Offline queue sync — 3 records pushed", ip: "127.0.0.1", severity: "info" },
  { timestamp: "2026-05-02 06:00", user: "system", action: "BACKUP", description: "Automated daily database backup completed successfully", ip: "127.0.0.1", severity: "info" },
];
