import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

/** Always shows the allergy list, or says plainly there are none — never blank. */
export function AllergyPill({ allergies, className }: { allergies: string[]; className?: string }) {
  if (allergies.length === 0) {
    return <span className={cn("status-pill status-pill-neutral", className)}>No known allergies</span>;
  }
  return (
    <span className={cn("status-pill status-pill-error", className)}>
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      Allergies: {allergies.join(", ")}
    </span>
  );
}
