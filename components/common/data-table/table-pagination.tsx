import { Button } from "@/components/ui/button";

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** "Showing 1–20 of 134" + Previous/Next (design brief §2.6). */
export function TablePagination({ page, pageSize, total, onPageChange }: TablePaginationProps) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <div className="flex items-center justify-between border-t border-border px-3 py-2.5 text-sm text-muted-foreground">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
