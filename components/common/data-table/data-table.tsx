import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";

import { EmptyState, type EmptyStateProps } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { TableSkeleton } from "@/components/common/skeletons";
import { TablePagination, type TablePaginationProps } from "@/components/common/data-table/table-pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Fragment, useState } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  /** Hidden in the tablet/card layout (e.g. a column already shown in the card header). */
  hideOnTablet?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Required — the caller must decide the empty copy for this list. */
  empty: EmptyStateProps;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectedIdsChange?: (ids: Set<string>) => void;
  expandable?: (row: T) => ReactNode;
  pagination?: TablePaginationProps;
  /** Custom card for the sub-1024px layout; falls back to a generic label/value card built from `columns`. */
  mobileCard?: (row: T) => ReactNode;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
}

/** The one table for lists — sticky-feeling header, row actions, empty/error/loading, tablet card mode. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  error,
  onRetry,
  empty,
  toolbar,
  onRowClick,
  rowActions,
  selectable,
  selectedIds,
  onSelectedIdsChange,
  expandable,
  pagination,
  mobileCard,
  onSort,
  sortKey,
  sortDirection,
}: DataTableProps<T>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {toolbar}

      {isLoading ? (
        <TableSkeleton rows={5} columns={columns.length} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState {...empty} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-subtle hover:bg-surface-subtle">
                  {selectable && <TableHead className="w-10" />}
                  {expandable && <TableHead className="w-8" />}
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "text-xs font-medium tracking-wide text-muted-foreground uppercase",
                        col.sortable && "cursor-pointer select-none",
                        col.className
                      )}
                      onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {col.sortable && sortKey === col.key && (
                          <ChevronDown
                            className={cn("h-3 w-3 transition-transform", sortDirection === "asc" && "rotate-180")}
                          />
                        )}
                      </span>
                    </TableHead>
                  ))}
                  {rowActions && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const id = getRowId(row);
                  const isExpanded = expandedId === id;
                  return (
                    <Fragment key={id}>
                      <TableRow
                        key={id}
                        className={cn("h-12", onRowClick && "table-row-interactive")}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        tabIndex={onRowClick ? 0 : undefined}
                        onKeyDown={
                          onRowClick
                            ? (e) => {
                                if (e.key === "Enter") onRowClick(row);
                              }
                            : undefined
                        }
                      >
                        {selectable && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds?.has(id) ?? false}
                              onCheckedChange={(checked) => {
                                if (!onSelectedIdsChange || !selectedIds) return;
                                const next = new Set(selectedIds);
                                if (checked) next.add(id);
                                else next.delete(id);
                                onSelectedIdsChange(next);
                              }}
                              aria-label="Select row"
                            />
                          </TableCell>
                        )}
                        {expandable && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : id)}
                              aria-label={isExpanded ? "Collapse row" : "Expand row"}
                              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                            >
                              <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                            </button>
                          </TableCell>
                        )}
                        {columns.map((col) => (
                          <TableCell key={col.key} className={col.className}>
                            {col.cell(row)}
                          </TableCell>
                        ))}
                        {rowActions && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                  aria-label="Row actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">{rowActions(row)}</DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                      {expandable && isExpanded && (
                        <TableRow key={`${id}-expanded`} className="bg-surface-subtle hover:bg-surface-subtle">
                          <TableCell colSpan={columns.length + (selectable ? 1 : 0) + 2}>{expandable(row)}</TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Tablet/phone card layout */}
          <div className="divide-y divide-border lg:hidden">
            {rows.map((row) => {
              const id = getRowId(row);
              return (
                <div
                  key={id}
                  className={cn("p-4", onRowClick && "table-row-interactive")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {mobileCard ? (
                    mobileCard(row)
                  ) : (
                    <dl className="space-y-1.5">
                      {columns
                        .filter((c) => !c.hideOnTablet)
                        .map((col) => (
                          <div key={col.key} className="flex items-baseline justify-between gap-3 text-sm">
                            <dt className="shrink-0 text-xs font-medium text-muted-foreground uppercase">{col.header}</dt>
                            <dd className="min-w-0 text-right text-foreground">{col.cell(row)}</dd>
                          </div>
                        ))}
                    </dl>
                  )}
                  {rowActions && (
                    <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Row actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">{rowActions(row)}</DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination && <TablePagination {...pagination} />}
        </>
      )}
    </div>
  );
}
