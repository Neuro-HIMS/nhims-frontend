"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  /** A handful of fields in one or two columns. */
  md: "sm:max-w-2xl",
  /** Several grouped sections. */
  lg: "sm:max-w-3xl",
  /** Tables or line items inside the form (stock receipts, result entry). */
  xl: "sm:max-w-5xl",
} as const;

export type FormDialogSize = keyof typeof SIZE_CLASS;

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: FormDialogSize;
  /** Buttons row — cancel/secondary first, the one primary action last. */
  footer: ReactNode;
  children: ReactNode;
  /** Optional submit handler: wraps the body in a <form> so Enter submits. */
  onSubmit?: () => void;
  className?: string;
}

/**
 * The one dialog shell for forms with more than a few fields (03-components.md §5):
 * wide, a fixed header and footer, and a body that scrolls on its own so the
 * primary action is always visible. Group fields with {@link FormDialogSection}.
 * Short confirmations still use ConfirmDialog.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  size = "lg",
  footer,
  children,
  onSubmit,
  className,
}: FormDialogProps) {
  const body = (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-subtle px-6 py-3">
        {footer}
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0",
          SIZE_CLASS[size],
          className,
        )}
      >
        <DialogHeader className="border-b border-border px-6 pt-5 pb-4 pr-12">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {onSubmit ? (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {body}
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{body}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormDialogSectionProps {
  title?: string;
  description?: string;
  /** Field columns from the `sm` breakpoint up. Use 1 for choice tiles that need the full width. */
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}

const COLUMN_CLASS = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" } as const;

/** A titled group of fields inside a FormDialog. Put `sm:col-span-2` on a field that needs the full row. */
export function FormDialogSection({ title, description, columns = 2, children, className }: FormDialogSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || description) && (
        <div className="space-y-0.5 border-b border-border pb-1.5">
          {title && <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className={cn("grid gap-4", COLUMN_CLASS[columns])}>{children}</div>
    </section>
  );
}
