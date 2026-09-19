import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TriagePriorityCode } from "@/types/clinical.types";

const LABELS: Record<TriagePriorityCode | "PENDING", string> = {
  EMERGENCY: "Emergency",
  URGENT: "Urgent",
  SEMI_URGENT: "Semi-urgent",
  ROUTINE: "Routine",
  PENDING: "Not triaged yet",
};

const CLASSES: Record<TriagePriorityCode | "PENDING", string> = {
  EMERGENCY:
    "border-[hsl(var(--clinical-emergency)/0.4)] bg-[hsl(var(--clinical-emergency-bg))] text-[hsl(var(--clinical-emergency))]",
  URGENT: "border-[hsl(var(--clinical-urgent)/0.4)] bg-[hsl(var(--clinical-urgent-bg))] text-[hsl(var(--clinical-urgent))]",
  SEMI_URGENT:
    "border-[hsl(var(--clinical-semi-urgent)/0.4)] bg-[hsl(var(--clinical-semi-urgent-bg))] text-[hsl(var(--clinical-semi-urgent))]",
  ROUTINE:
    "border-[hsl(var(--clinical-routine)/0.4)] bg-[hsl(var(--clinical-routine-bg))] text-[hsl(var(--clinical-routine))]",
  PENDING: "status-pill-neutral",
};

/** Triage priority pill — same colors and words everywhere a patient's urgency is shown. */
export function TriagePill({ priority, className }: { priority: TriagePriorityCode | "PENDING"; className?: string }) {
  return (
    <span className={cn("status-pill border", CLASSES[priority], className)}>
      {priority === "EMERGENCY" && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
      {LABELS[priority]}
    </span>
  );
}
