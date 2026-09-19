import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export type InlineNoticeTone = "info" | "warning" | "pending" | "error" | "success";

const TONE_ICON = {
  info: Info,
  warning: AlertTriangle,
  pending: Clock,
  error: AlertCircle,
  success: CheckCircle2,
} as const;

const TONE_CLASSES: Record<InlineNoticeTone, string> = {
  info: "border-info/30 bg-info-bg text-info",
  warning: "border-warning/30 bg-warning-bg text-warning",
  pending: "border-pending/30 bg-pending-bg text-pending",
  error: "border-destructive/30 bg-error-bg text-destructive",
  success: "border-success/30 bg-success-bg text-success",
};

interface InlineNoticeProps {
  tone: InlineNoticeTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

/** Soft banner inside a card — warnings, pending states and plain in-page notices (design brief §8.5). */
export function InlineNotice({ tone, title, children, action }: InlineNoticeProps) {
  const Icon = TONE_ICON[tone];
  return (
    <div
      className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm", TONE_CLASSES[tone])}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        <div className="opacity-90">{children}</div>
        {action}
      </div>
    </div>
  );
}
