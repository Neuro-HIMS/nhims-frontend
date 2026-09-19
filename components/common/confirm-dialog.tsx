"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Name the exact thing: "Cancel Ama Mensah's appointment on 21/09/2026?" */
  title: string;
  description: React.ReactNode;
  cancelLabel?: string;
  /** Required — say exactly what happens: "Yes, cancel appointment". Never "Confirm"/"OK". */
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  /** Fields between description and actions (e.g. cancellation reason). */
  footerExtra?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Go back",
  confirmLabel,
  destructive,
  pending,
  footerExtra,
  onConfirm,
}: ConfirmDialogProps) {
  async function handleConfirm() {
    try {
      await Promise.resolve(onConfirm());
      onOpenChange(false);
    } catch {
      /* parent shows toast — keep dialog open */
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-left">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {footerExtra ? <div className="grid gap-2">{footerExtra}</div> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? "Please wait…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
