import { ShieldOff } from "lucide-react";

/** For a forbidden view inside an otherwise-accessible page (page-level guards redirect instead). */
export function NoAccessNotice() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ShieldOff className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">You don&apos;t have access to this page.</h2>
      <p className="mt-1 text-sm text-muted-foreground">If you need it, ask your facility administrator.</p>
    </div>
  );
}
