"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { cn } from "@/lib/utils";

/** Soft banner matching laboratory / folder cue styling */
export function FolderRecordFeedBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-foreground">
      <span className="flex gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
        <span>{children}</span>
      </span>
    </div>
  );
}

/**
 * One row in the folder “feed”: left rail index + icon, header summary, expandable body for full record output.
 */
export function FolderRecordExpandableRow({
  railIndex,
  icon: Icon,
  eyebrow,
  title,
  preview,
  footerTime,
  badges,
  headerActions,
  defaultOpen = false,
  cardClassName,
  children,
}: {
  railIndex: number;
  icon: LucideIcon;
  eyebrow: string;
  title: ReactNode;
  preview?: ReactNode;
  footerTime?: string | null;
  badges?: ReactNode;
  headerActions?: ReactNode;
  defaultOpen?: boolean;
  cardClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn("overflow-hidden", cardClassName)}>
        <CardContent className="space-y-0 p-0">
          <div className="flex gap-3 border-b border-border/60 bg-muted/20 px-3 py-3 sm:px-4">
            <div className="flex w-11 shrink-0 flex-col items-center pt-0.5">
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{railIndex}</span>
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-muted-foreground/20 bg-card text-muted-foreground shadow-sm">
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
              <div className="text-sm font-medium leading-snug text-foreground">{title}</div>
              {preview ? <div className="text-xs leading-snug text-muted-foreground">{preview}</div> : null}
              {footerTime ? <p className="text-xs text-muted-foreground">{formatDateTime(footerTime)}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
              {badges}
              {headerActions}
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-dashed">
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
                  {open ? "Hide" : "Details"}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent>
            <div className="space-y-3 border-t border-border/40 px-4 py-4 sm:pl-[4.75rem]">{children}</div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

/** Label / value block for expanded clinical output */
export function FolderRecordField({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid gap-1 border-b border-border/40 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,148px)_1fr] sm:gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{value}</div>
    </div>
  );
}
