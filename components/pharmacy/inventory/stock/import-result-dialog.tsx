"use client";

import { FormDialog } from "@/components/common/form-dialog";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import type { StockCsvImportResultDto } from "@/types/pharmacy-inventory.types";

/** Splits "Row 4: Unknown stock code" into its row number and message. */
function splitRow(error: string): { row: string; message: string } {
  const m = /^\s*(?:row|line)\s*#?\s*(\d+)\s*[:\-–]\s*(.*)$/i.exec(error);
  return m ? { row: m[1], message: m[2] } : { row: "—", message: error };
}

/** PHA-11 — what happened to each row of an uploaded stock spreadsheet. */
export function ImportResultDialog({
  result,
  onOpenChange,
}: {
  result: StockCsvImportResultDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const rows = (result?.errors ?? []).map(splitRow);
  return (
    <FormDialog
      open={result !== null}
      onOpenChange={onOpenChange}
      size="md"
      title="Spreadsheet uploaded"
      description="Rows without a problem were added to stock as new batches. Any rows listed below were left out: fix them and upload just those rows again."
      footer={<Button onClick={() => onOpenChange(false)}>Done</Button>}
    >
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="success">{`${result?.imported ?? 0} added`}</StatusPill>
        <StatusPill tone={(result?.skipped ?? 0) > 0 ? "warning" : "neutral"}>{`${result?.skipped ?? 0} left out`}</StatusPill>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground uppercase">
                <th className="w-20 px-3 py-2 font-medium tracking-wide">Row</th>
                <th className="px-3 py-2 font-medium tracking-wide">Problem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-clinical text-xs">{r.row}</td>
                  <td className="px-3 py-2">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Every row was added.</p>
      )}
    </FormDialog>
  );
}
