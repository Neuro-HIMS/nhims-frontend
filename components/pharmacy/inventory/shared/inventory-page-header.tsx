"use client";

import { Download, Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

interface InventoryPageHeaderProps {
  title: string;
  description: string;
  /** Opens primary modal/dialog — wired by parent */
  onAdd?: () => void;
  addLabel?: string;
  /** Stock CSV (lots snapshot); hidden when neither handler is set */
  onImportStockCsv?: () => void;
  onExportStockCsv?: () => void;
  stockCsvBusy?: boolean;
}

export function InventoryPageHeader({
  title,
  description,
  onAdd,
  addLabel = "Add",
  onImportStockCsv,
  onExportStockCsv,
  stockCsvBusy,
}: InventoryPageHeaderProps) {
  const showCsv = Boolean(onImportStockCsv || onExportStockCsv);

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-shrink-0 flex-wrap gap-2">
        {showCsv ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!onImportStockCsv || stockCsvBusy}
              title="Upload CSV to bulk receive stock (one new lot per row)"
              onClick={() => onImportStockCsv?.()}
            >
              <Upload className="mr-1.5 h-4 w-4" /> Import
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!onExportStockCsv || stockCsvBusy}
              title="Download stock lots as CSV (UTF-8)"
              onClick={() => void onExportStockCsv?.()}
            >
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
          </>
        ) : null}
        {onAdd ? (
          <Button type="button" size="sm" className="font-medium" onClick={onAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> {addLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
