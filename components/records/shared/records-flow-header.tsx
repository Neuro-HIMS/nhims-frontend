function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
      <p className="font-clinical text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function RecordsFlowHeader() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Records Workflow
          </p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Patient Search and Registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search first by ID, NHIS, or name before creating any new record.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4">
          <MetricChip label="Clients in Queue" value="26" />
          <MetricChip label="First-Time Today" value="8" />
          <MetricChip label="Appointments Booked" value="21" />
          <MetricChip label="NHIS Verified" value="19" />
        </div>
      </div>
    </div>
  );
}


