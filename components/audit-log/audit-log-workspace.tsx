"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

/** Old tab ids → canonical {@link AuditEventDto.resourceType} or `all`. */
const LEGACY_AUDIT_VIEWS: Record<string, string> = {
  security: "AUTH",
  users: "PATIENT",
  system: "all",
};

function humanizeResourceType(rt: string): string {
  if (rt === "AUTH") return "Authentication";
  if (rt === "USER") return "Users & access";
  if (rt === "PATIENT") return "Patient records";
  return rt.charAt(0) + rt.slice(1).toLowerCase().replace(/_/g, " ");
}

export function AuditLogWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawView = searchParams.get("view") ?? "all";

  useEffect(() => {
    if (rawView && LEGACY_AUDIT_VIEWS[rawView]) {
      router.replace(`/audit-log?view=${encodeURIComponent(LEGACY_AUDIT_VIEWS[rawView])}`);
    }
  }, [rawView, router]);

  const view = (LEGACY_AUDIT_VIEWS[rawView] ?? rawView ?? "all").trim() || "all";

  const eventsQuery = useQuery({
    queryKey: ["audit", "events"],
    queryFn: () => auditApiService.listEvents({ limit: 400 }),
    staleTime: 30_000,
  });

  const subNavItems = useMemo(() => {
    const fromData = (eventsQuery.data ?? [])
      .map((e) => e.resourceType)
      .filter((t): t is string => Boolean(t && t.length > 0));
    const seed = ["AUTH", "USER", "PATIENT"];
    const types = Array.from(new Set([...seed, ...fromData])).sort((a, b) => a.localeCompare(b));
    return [
      { label: "All events", view: "all", href: "/audit-log?view=all" },
      ...types.map((rt) => ({
        label: humanizeResourceType(rt),
        view: rt,
        href: `/audit-log?view=${encodeURIComponent(rt)}`,
      })),
    ];
  }, [eventsQuery.data]);

  const rows = useMemo(() => {
    const all = eventsQuery.data ?? [];
    if (view === "all") return all;
    return all.filter((e) => (e.resourceType ?? "").toUpperCase() === view.toUpperCase());
  }, [eventsQuery.data, view]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Log</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Traceability of user actions, security events, and clinical operations (facility-scoped). Tabs follow{" "}
          <span className="font-medium">resource type</span> values from the feed.
        </p>
      </div>
      <ModuleSubNav items={subNavItems} basePath="/audit-log" />
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
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions ({category === "all" ? "feed" : category})</SelectItem>
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
