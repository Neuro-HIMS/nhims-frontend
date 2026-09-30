"use client";

import { LabResultValue } from "@/components/clinical/lab-result-value";
import { cleanPersonName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import { storedFlag } from "@/lib/lab-results";
import type { LabResultRowDto } from "@/types/clinical.types";

/** Read-only results for one lab order — the same table for the doctor and the lab (DOC-08, LAB-05). */
export function LabResultsTable({ rows }: { rows: LabResultRowDto[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No results recorded.</p>;
  const by = rows.find((r) => cleanPersonName(r.recordedByName));
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Measured</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2 font-medium">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 align-top text-foreground">{r.analyte}</td>
                <td className="px-3 py-2 align-top">
                  <LabResultValue value={r.value || "—"} unit={r.units || undefined} flag={storedFlag(r.flag)} refRange={r.referenceRange || undefined} />
                </td>
                <td className="px-3 py-2 align-top text-xs text-muted-foreground">{r.comment || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {by && (
        <p className="text-xs text-muted-foreground">
          Entered by {cleanPersonName(by.recordedByName)}
          {by.recordedAt ? ` · ${formatClinicalDateTime(by.recordedAt)}` : ""}
        </p>
      )}
    </div>
  );
}
