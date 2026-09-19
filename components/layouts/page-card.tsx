import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageCardProps {
  /** Plain words, sentence case — a name for the place, not a sentence. */
  title: string;
  /** One helpful sentence saying what you do here. Required — never placeholder text. */
  description: string;
  /** At most one primary button. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** The standard page-top card: bold title, one-line description, actions on the right (design brief §2.5). */
export function PageCard({ title, description, actions, children, className }: PageCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
