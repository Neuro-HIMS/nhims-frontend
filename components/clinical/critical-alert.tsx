"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Pinned, can't-miss warning for allergy conflicts, critical lab values, and
 * similar (02-design-system.md §8). Never a toast, never color-only, never
 * behind a tab — and it stays up until the nurse/doctor explicitly acts on it.
 */
export function CriticalAlert({
  title,
  body,
  acknowledgeLabel,
  onAcknowledge,
}: {
  title: string;
  body: string;
  acknowledgeLabel: string;
  onAcknowledge: () => void | Promise<void>;
}) {
  const [acknowledging, setAcknowledging] = useState(false);

  async function handleAcknowledge() {
    setAcknowledging(true);
    try {
      await onAcknowledge();
    } finally {
      setAcknowledging(false);
    }
  }

  return (
    <div className="alert-critical flex items-start gap-3 rounded-lg border px-4 py-3" role="alert">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm opacity-90">{body}</p>
      </div>
      <Button size="sm" variant="outline" disabled={acknowledging} onClick={() => void handleAcknowledge()} className="shrink-0">
        {acknowledging ? "Saving…" : acknowledgeLabel}
      </Button>
    </div>
  );
}
