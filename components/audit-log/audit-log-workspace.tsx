"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DataTable, type DataTableColumn, TableToolbar } from "@/components/common/data-table";
import { StatusPill } from "@/components/common/status-pill";
import { PageCard } from "@/components/layouts/page-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTableDateTime } from "@/lib/dates";
import { auditApiService } from "@/services/audit.service";
import type { AuditEventDto } from "@/types/audit.types";

type Kind = "all" | "staff" | "security" | "system";

const KIND_LABELS: Record<Exclude<Kind, "all">, string> = {
  staff: "Staff actions",
  security: "Sign-ins and security",
  system: "Automatic changes",
};

function classify(event: AuditEventDto): Exclude<Kind, "all"> {
  const signal = `${event.resourceType} ${event.action}`.toUpperCase();
  if (signal.includes("AUTH") || signal.includes("LOGIN") || signal.includes("SESSION") || signal.includes("PASSWORD") || signal.includes("TOTP")) {
    return "security";
  }
  if (!event.actorUsername || event.actorUsername.toLowerCase() === "system") {
    return "system";
  }
  return "staff";
}

/** "CHANGED_PHONE_NUMBER" → "Changed phone number" — not a full sentence (the backend doesn't send one), but never a raw code. */
function humanize(value: string): string {
  const words = value.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function AuditLogWorkspace() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");

  const eventsQuery = useQuery({
    queryKey: ["audit", "events"],
    queryFn: () => auditApiService.listEvents({ limit: 400 }),
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const all = eventsQuery.data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      const matchesKind = kind === "all" || classify(e) === kind;
      const matchesQuery =
        !q ||
        e.actorUsername.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q);
      return matchesKind && matchesQuery;
    });
  }, [eventsQuery.data, query, kind]);

  const columns: DataTableColumn<AuditEventDto>[] = [
    {
      key: "time",
      header: "Time",
      cell: (e) => <span className="font-clinical text-xs text-muted-foreground">{e.createdAt ? formatTableDateTime(e.createdAt) : "—"}</span>,
    },
    {
      key: "person",
      header: "Person",
      cell: (e) => <span className="font-medium text-foreground">{e.actorUsername || "Automatic"}</span>,
    },
    {
      key: "what",
      header: "What happened",
      cell: (e) => (
        <span>
          <StatusPill tone="neutral" className="mr-1.5">
            {humanize(e.action)}
          </StatusPill>
          {e.details && <span className="text-muted-foreground">{e.details}</span>}
        </span>
      ),
    },
    {
      key: "device",
      header: "Device",
      cell: (e) => <span className="text-xs text-muted-foreground">{e.ipAddress || "—"}</span>,
      hideOnTablet: true,
    },
  ];

  return (
    <div className="space-y-4">
      <PageCard title="Activity history" description="Who did what, and when." />

      <DataTable
        columns={columns}
        rows={eventsQuery.isPending ? undefined : rows}
        getRowId={(e) => e.id}
        isLoading={eventsQuery.isPending}
        error={eventsQuery.isError ? eventsQuery.error : undefined}
        onRetry={() => void eventsQuery.refetch()}
        empty={{
          illustration: "no-results",
          title: query || kind !== "all" ? "Nothing matches these filters" : "No activity yet",
          description: query || kind !== "all" ? "Try a different search or filter." : "Activity will appear here as staff use the system.",
        }}
        toolbar={
          <TableToolbar
            search={{ value: query, onChange: setQuery, placeholder: "Search by person or what happened" }}
            filters={
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger className="h-9 w-52">
                  <SelectValue placeholder="Kind" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every kind</SelectItem>
                  {(Object.keys(KIND_LABELS) as (keyof typeof KIND_LABELS)[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        }
      />
    </div>
  );
}
