"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditApiService } from "@/services/audit.service";
import type { AuditEventDto } from "@/types/audit.types";

const SUB_NAV = [
  { label: "User Events", view: "users", href: "/audit-log?view=users" },
  { label: "Security Events", view: "security", href: "/audit-log?view=security" },
  { label: "System Events", view: "system", href: "/audit-log?view=system" },
];

const SECURITY_ACTIONS = new Set([
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "PASSWORD_RESET",
  "USER_ACCESS_UPDATE",
]);

const USER_ACTIONS = new Set([
  "PATIENT_REGISTER",
  "PATIENT_VIEW",
  "PRESCRIPTION_PLACED",
  "PRESCRIPTION_DISPENSED",
  "LAB_CRITICAL_VALUE",
]);

export function AuditLogWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "users";

  const eventsQuery = useQuery({
    queryKey: ["audit", "events"],
    queryFn: () => auditApiService.listEvents({ limit: 400 }),
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const all = eventsQuery.data ?? [];
    if (view === "security") return all.filter((e) => SECURITY_ACTIONS.has(e.action));
    if (view === "users") return all.filter((e) => USER_ACTIONS.has(e.action));
    return all.filter(
      (e) => !SECURITY_ACTIONS.has(e.action) && !USER_ACTIONS.has(e.action),
    );
  }, [eventsQuery.data, view]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Log</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Traceability of user actions, security events, and clinical operations (facility-scoped).
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/audit-log" />
      <div className="pt-2">
        {eventsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading audit events…
          </div>
        ) : eventsQuery.isError ? (
          <p className="text-sm text-destructive">Could not load audit events.</p>
        ) : (
          <EventsTable events={rows} category={view} allEvents={eventsQuery.data ?? []} />
        )}
      </div>
    </div>
  );
}

function EventsTable({
  events,
  category,
  allEvents,
}: {
  events: AuditEventDto[];
  category: string;
  allEvents: AuditEventDto[];
}) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = events.filter((e) => {
    const matchQ =
      !query.trim() ||
      e.actorUsername.toLowerCase().includes(query.toLowerCase()) ||
      e.details.toLowerCase().includes(query.toLowerCase()) ||
      e.action.toLowerCase().includes(query.toLowerCase());
    const matchAction = actionFilter === "all" || e.action === actionFilter;
    return matchQ && matchAction;
  });

  const actions = Array.from(new Set(events.map((e) => e.action))).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user, action, or details…"
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions ({category})</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{allEvents.length} total in feed</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Timestamp
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                User
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Action
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Resource / details
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((e) => (
              <tr key={e.id} className="table-row-interactive">
                <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">
                  {e.createdAt ?? "—"}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{e.actorUsername || "—"}</td>
                <td className="px-4 py-3">
                  <span className="status-pill status-pill-pending text-xs">{e.action}</span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/90">{e.resourceType}</span>
                  {e.resourceId ? ` · ${e.resourceId.slice(0, 8)}…` : ""}
                  {e.details ? ` — ${e.details}` : ""}
                </td>
                <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">
                  {e.ipAddress || "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No events match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
