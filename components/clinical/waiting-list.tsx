"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Clock } from "lucide-react";

import { EmptyState, type EmptyStateProps } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { StatusPill, type PillTone } from "@/components/common/status-pill";
import { TableSkeleton } from "@/components/common/skeletons";
import { TriagePill } from "@/components/clinical/triage-pill";
import { Button } from "@/components/ui/button";
import { sortByUrgencyThenArrival } from "@/lib/sort-by-urgency";
import { cn } from "@/lib/utils";
import type { TriagePriorityCode } from "@/types/clinical.types";

const LONG_WAIT_MINUTES = 60;

interface WaitingListProps<T> {
  items: T[] | undefined;
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  getPatient: (t: T) => { name: string; hospitalNumber: string; age?: string; sex?: string };
  getPriority?: (t: T) => TriagePriorityCode | "PENDING";
  getArrivedAt: (t: T) => string;
  getWhat: (t: T) => string;
  getStatus: (t: T) => { label: string; tone: PillTone; icon?: LucideIcon };
  primaryActionLabel: string | ((t: T) => string);
  onOpen: (t: T) => void;
  empty: EmptyStateProps;
  getRowId: (t: T) => string;
  /** Shown as a small hint under the toolbar area, e.g. "Refreshes automatically every 30s." */
  refetchIntervalMs?: number;
}

/** The one queue table for every station (nurse, doctor, lab, imaging, pharmacy) — 03-components.md §3. */
export function WaitingList<T>({
  items,
  isLoading,
  error,
  onRetry,
  getPatient,
  getPriority,
  getArrivedAt,
  getWhat,
  getStatus,
  primaryActionLabel,
  onOpen,
  empty,
  getRowId,
  refetchIntervalMs,
}: WaitingListProps<T>) {
  if (isLoading) return <TableSkeleton rows={5} columns={5} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!items || items.length === 0) return <EmptyState {...empty} />;

  const sorted = getPriority
    ? sortByUrgencyThenArrival(items, getPriority, getArrivedAt)
    : [...items].sort((a, b) => getArrivedAt(a).localeCompare(getArrivedAt(b)));

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              <Th>Waiting</Th>
              <Th>Patient</Th>
              {getPriority && <Th>Urgency</Th>}
              <Th>What&apos;s needed</Th>
              <Th>Stage</Th>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((item) => {
              const patient = getPatient(item);
              const status = getStatus(item);
              const priority = getPriority?.(item);
              const wait = formatWait(getArrivedAt(item));
              const id = getRowId(item);
              const label = typeof primaryActionLabel === "function" ? primaryActionLabel(item) : primaryActionLabel;

              return (
                <tr
                  key={id}
                  className={cn(
                    "table-row-interactive",
                    priority === "EMERGENCY" && "triage-row-emergency",
                  )}
                  onClick={() => onOpen(item)}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-clinical text-xs",
                        wait.longWait ? "text-warning" : "text-muted-foreground",
                      )}
                    >
                      {wait.longWait ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {wait.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="patient-id mt-0.5">
                      {patient.hospitalNumber}
                      {patient.age || patient.sex ? ` · ${[patient.age, patient.sex].filter(Boolean).join(" ")}` : ""}
                    </p>
                  </td>
                  {getPriority && (
                    <td className="px-4 py-3">
                      <TriagePill priority={priority ?? "PENDING"} />
                    </td>
                  )}
                  <td className="px-4 py-3 text-foreground">{getWhat(item)}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={status.tone} icon={status.icon}>
                      {status.label}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" onClick={() => onOpen(item)}>
                      {label}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {refetchIntervalMs && (
        <p className="text-xs text-muted-foreground">
          Refreshes automatically every {Math.round(refetchIntervalMs / 1000)}s.
        </p>
      )}
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-2.5 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase", className)}>
      {children}
    </th>
  );
}

function formatWait(arrivedAtIso: string): { label: string; longWait: boolean } {
  const arrived = new Date(arrivedAtIso).getTime();
  if (Number.isNaN(arrived)) return { label: "—", longWait: false };
  const minutes = Math.max(0, Math.round((Date.now() - arrived) / 60_000));
  const longWait = minutes >= LONG_WAIT_MINUTES;
  if (minutes < 60) return { label: `Waiting ${minutes} min`, longWait };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { label: `Waiting ${h} h ${m} min`, longWait };
}
