"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { FormDialog } from "@/components/common/form-dialog";
import { UploadDropzone } from "@/components/common/upload-dropzone";
import { Button } from "@/components/ui/button";
import { getFriendlyError } from "@/lib/api-errors";
import type { StockCsvImportResultDto } from "@/types/pharmacy-inventory.types";

/** Column names the backend reads (`PharmacyStockImportExportService`). */
const TEMPLATE = [
  "sku_code,display_name,batch_no,expiry_date,quantity,unit,supplier_name,reference_note",
  ",Paracetamol 500 mg tablets,PARA-2401,2027-06-30,500,tablet,,Invoice 1234",
].join("\n");

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "stock-upload-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** PHA-11 — upload a stock spreadsheet. Each row becomes a new batch. */
export function ImportStockDialog({
  open,
  onOpenChange,
  onImport,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => Promise<StockCsvImportResultDto>;
  onImported: (result: StockCsvImportResultDto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function upload(file: File) {
    if (!/\.csv$/i.test(file.name)) {
      setError("Choose a .csv spreadsheet. In Excel, use Save as → CSV.");
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      const result = await onImport(file);
      onOpenChange(false);
      onImported(result);
    } catch (e) {
      setError(getFriendlyError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        setError(undefined);
        onOpenChange(o);
      }}
      size="md"
      title="Upload a stock spreadsheet"
      description="Each row is added to stock as a new batch. Use the template, or a stock list you downloaded from this page."
      footer={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
        <div className="space-y-2">
          <UploadDropzone accept=".csv,text/csv" maxSizeMb={20} onFile={(f) => void upload(f)} helperText="Spreadsheet (.csv), up to 20 MB" errorText={error} disabled={busy} />
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> Adding the rows to stock…
            </p>
          )}
        </div>
        <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-4 text-sm">
          <p className="font-medium text-foreground">Template</p>
          <p className="text-xs text-muted-foreground">
            Each row needs the stock code or the medicine name exactly as in the medicines list, and a quantity. Dates are written 2027-06-30.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
            <Download className="mr-1.5 h-4 w-4" /> Download template
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
