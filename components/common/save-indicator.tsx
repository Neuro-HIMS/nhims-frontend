"use client";

import { Check, Loader2, AlertTriangle } from "lucide-react";
import { useUIStore } from "@/store/ui.store";

export function SaveIndicator() {
  const saveStatus = useUIStore((s) => s.saveStatus);

  if (saveStatus === "idle") return null;

  return (
    <div
      className="flex items-center gap-1.5 text-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      {saveStatus === "saved" && (
        <>
          <Check className="h-3.5 w-3.5 save-saved" aria-hidden="true" />
          <span className="save-saved text-xs">Saved</span>
        </>
      )}
      {saveStatus === "saving" && (
        <>
          <Loader2
            className="h-3.5 w-3.5 save-saving animate-spin"
            aria-hidden="true"
          />
          <span className="save-saving text-xs">Saving...</span>
        </>
      )}
      {saveStatus === "unsaved" && (
        <span className="save-unsaved text-xs">Unsaved changes</span>
      )}
      {saveStatus === "error" && (
        <>
          <AlertTriangle className="h-3.5 w-3.5 save-error" aria-hidden="true" />
          <span className="save-error text-xs">Save failed</span>
        </>
      )}
    </div>
  );
}