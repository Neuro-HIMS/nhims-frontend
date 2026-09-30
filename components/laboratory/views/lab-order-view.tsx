"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Plus, Printer, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { BannerSkeleton, CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { LabResultValue, type LabFlag } from "@/components/clinical/lab-result-value";
import { LabResultsTable } from "@/components/clinical/lab/lab-results-table";
import { PatientBanner } from "@/components/clinical/patient-banner";
import {
  emptyMalariaPanel,
  LabMalariaPanelForm,
  LabMalariaPanelReadonly,
  malariaPanelHasSignal,
  parseMalariaPanelJson,
} from "@/components/laboratory/lab-malaria-panel-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { cleanPersonName, naturalName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import {
  describeLabRange,
  flagForRecord,
  flagResult,
  isWaitingToPay,
  labStatus,
  labUrgencyLabel,
  type LabParameter,
} from "@/lib/lab-results";
import { canAuthoriseLabResults, canMoveVisits, canWorkInLab } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { ageInYears } from "@/lib/vitals-ranges";
import { clinicalService } from "@/services/clinical.service";
import { labService, SAMPLE_REJECTION_REASONS } from "@/services/lab.service";
import { patientsService } from "@/services/patients.service";
import { useAuthStore } from "@/store/auth.store";
import type { LabOrderDto, SubmitLabResultsPayload } from "@/types/clinical.types";

const SOURCES: Array<{ value: string; label: string }> = [
  { value: "CONSULTING_ROOM", label: "Consulting room" },
  { value: "WARD", label: "Ward" },
  { value: "ANC", label: "Antenatal clinic" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "OTHER", label: "Other" },
];

/** When all of a visit's tests are done, the patient goes back to the doctor's list (like the backend does on "authorise now"). */
async function returnPatientIfAllDone(encounterId: string, role: string | undefined) {
  // Lab staff can't move visits (backend TRANSITION_ROLES); the doctor's "Waiting for results" card picks the patient up instead.
  if (!canMoveVisits(role as never)) return;
  const orders = await clinicalService.listLabOrdersForEncounter(encounterId);
  const stillOpen = orders.some((o) => !["AUTHORISED", "CANCELLED"].includes(o.status));
  if (stillOpen) return;
  const encounter = await clinicalService.byId(encounterId);
  if (encounter.status === "AT_LAB") {
    await clinicalService.transition(encounterId, { to: "AT_CONSULTATION", station: "CONSULTATION" });
  }
}

/** LAB-02…LAB-05 — one test request, from sample to authorised result. */
export function LabOrderView() {
  const router = useRouter();
  const orderId = useSearchParams().get("orderId");

  const orderQuery = useQuery({
    queryKey: orderId ? queryKeys.clinical.labOrder(orderId) : ["clinical", "lab-orders", "idle"],
    queryFn: () => clinicalService.getLabOrder(orderId!),
    enabled: Boolean(orderId),
  });

  const back = (
    <Button variant="ghost" size="sm" onClick={() => router.push("/laboratory?view=worklist")}>
      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to tests to do
    </Button>
  );

  if (!orderId) {
    return (
      <EmptyState
        illustration="choose-patient"
        title="No test open"
        description="Open a test from To do to collect the sample or enter results."
        action={{ label: "Tests to do", href: "/laboratory?view=worklist" }}
      />
    );
  }
  if (orderQuery.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <BannerSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (orderQuery.isError && !orderQuery.data) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState error={orderQuery.error} onRetry={() => void orderQuery.refetch()} />
      </div>
    );
  }

  const order = orderQuery.data!;
  return (
    <div className="space-y-4">
      {back}
      <PatientBanner patientId={order.patientId} encounterId={order.encounterId} />
      <RequestCard order={order} />
      <OrderStep key={`${order.id}-${order.status}`} order={order} />
    </div>
  );
}

function RequestCard({ order }: { order: LabOrderDto }) {
  const status = labStatus(order.status);
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">{order.serviceName}</h2>
          <p className="text-xs text-muted-foreground">
            Requested by {cleanPersonName(order.orderedByName) || "a clinician"}
            {order.orderedAt ? ` · ${formatClinicalDateTime(order.orderedAt)}` : ""}
            {order.pathologyNumber ? ` · Lab number ${order.pathologyNumber}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusPill tone={order.priority === "STAT" || order.priority === "EMERGENCY" ? "error" : order.priority === "URGENT" ? "warning" : "neutral"}>
            {labUrgencyLabel(order.priority)}
          </StatusPill>
          {isWaitingToPay(order) && <StatusPill tone="pending">Waiting to pay</StatusPill>}
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Detail label="Clinical question" value={order.reason} />
        <Detail label="Note to the lab" value={order.instructions} />
        <Detail label="Diagnosis on the request" value={order.provisionalDiagnosisLabel} />
      </dl>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function OrderStep({ order }: { order: LabOrderDto }) {
  const role = useAuthStore((s) => s.user?.role);
  if (order.status === "CANCELLED") {
    const rejection = labService.rejectionFor(order.id);
    return (
      <InlineNotice tone="info" title={rejection ? "This sample was rejected." : "This test was cancelled."}>
        {rejection ? `Reason: ${rejection.reason}. The doctor has been asked to request a new sample.` : "Nothing more to do here."}
      </InlineNotice>
    );
  }
  if (!canWorkInLab(role)) {
    return (
      <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">Results</h2>
        {order.status === "COMPLETED" || order.status === "AUTHORISED" ? (
          <ResultsReadOnly order={order} />
        ) : (
          <p className="text-sm text-muted-foreground">The lab hasn&apos;t entered results yet.</p>
        )}
      </section>
    );
  }
  if (order.status === "ORDERED" || order.status === "PAID" || order.status === "CLAIMED") return <SampleStep order={order} />;
  if (order.status === "IN_PROGRESS") return <ResultsStep order={order} />;
  return <ReviewStep order={order} />;
}

// ── LAB-02: collect or reject the sample ──────────────────────────────────

function SampleStep({ order }: { order: LabOrderDto }) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const waitingToPay = isWaitingToPay(order);

  const collectMut = useMutation({
    mutationFn: () => clinicalService.updateLabOrderStatus(order.id, "IN_PROGRESS"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Sample collected. You can enter the results now.");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const rejectMut = useMutation({
    mutationFn: async (why: string) => {
      const saved = await labService.rejectSample(order, why);
      // If this was the last open test on the visit, send the patient back to the doctor.
      await returnPatientIfAllDone(order.encounterId, role).catch(() => undefined);
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      setRejectOpen(false);
      toast.success("Sample rejected. The doctor has been told.");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const finalReason = reason === "Other" ? otherReason.trim() : reason;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Sample</h2>
        <p className="text-xs text-muted-foreground">Take the sample, label it, then record it as collected.</p>
      </div>
      {waitingToPay && (
        <InlineNotice tone="pending" title="Waiting for payment at the cashier.">
          {naturalName(order.patientName)} is paying for this test themselves. Take the sample once the cashier has taken payment.
        </InlineNotice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={waitingToPay || collectMut.isPending} onClick={() => collectMut.mutate()}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> {collectMut.isPending ? "Saving…" : "Sample collected"}
        </Button>
        <Button variant="outline" onClick={() => clinicalService.openLabSpecimenLabelPdf(order.id)}>
          <Printer className="mr-1.5 h-4 w-4" /> Print specimen label
        </Button>
        <Button variant="destructive-outline" onClick={() => setRejectOpen(true)}>
          Reject sample
        </Button>
      </div>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={(o) => {
          setRejectOpen(o);
          if (!o) {
            setReason("");
            setOtherReason("");
          }
        }}
        title={`Reject the sample for ${order.serviceName}?`}
        description="The request is closed and the doctor is asked to request a new sample. Choose why."
        confirmLabel="Reject sample"
        cancelLabel="Keep sample"
        destructive
        pending={rejectMut.isPending}
        confirmDisabled={!finalReason}
        footerExtra={
          <div className="space-y-2">
            <RadioGroup aria-label="Why" value={reason} onValueChange={setReason} className="grid gap-1.5 sm:grid-cols-2">
              {SAMPLE_REJECTION_REASONS.map((r) => (
                <ChoiceOption key={r} className="py-1.5">
                  <RadioGroupItem value={r} />
                  {r}
                </ChoiceOption>
              ))}
            </RadioGroup>
            {reason === "Other" && (
              <Input aria-label="Other reason" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder="Say what was wrong" />
            )}
          </div>
        }
        onConfirm={async () => {
          if (!finalReason) {
            toast.error("Choose why the sample is being rejected.");
            throw new Error("missing reason");
          }
          await rejectMut.mutateAsync(finalReason);
        }}
      />
    </section>
  );
}

// ── LAB-03 / LAB-04: enter results, flag, critical check ──────────────────

interface EntryRow {
  key: string;
  param: LabParameter | null;
  analyte: string;
  value: string;
  units: string;
  comment: string;
}

interface ResultsDraft {
  rows: EntryRow[];
  sampleType: string;
  source: string;
  malaria: Record<string, unknown>;
}

const draftKey = (orderId: string) => `nhims:lab-draft:${orderId}`;

function rowKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function ResultsStep({ order }: { order: LabOrderDto }) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canAuthorise = canAuthoriseLabResults(role);
  const isMalariaPanel = String(order.labResultPanel).toUpperCase() === "MALARIA_PANEL";

  const patientQuery = useQuery({
    queryKey: queryKeys.patients.detail(order.patientId),
    queryFn: () => patientsService.getById(order.patientId),
  });
  const age = patientQuery.data
    ? ageInYears(patientQuery.data.birthDate, patientQuery.data.statedAgeValue, patientQuery.data.statedAgeUnit)
    : null;
  const sex = patientQuery.data?.sex === "M" || patientQuery.data?.sex === "F" ? patientQuery.data.sex : null;

  // "Authorise now" also sends the patient back to the doctor (backend), so offer it only for the visit's last open test.
  const siblingsQuery = useQuery({
    queryKey: queryKeys.clinical.labOrders(order.encounterId),
    queryFn: () => clinicalService.listLabOrdersForEncounter(order.encounterId),
  });
  const otherOpenTests = (siblingsQuery.data ?? []).filter(
    (o) => o.id !== order.id && !["AUTHORISED", "CANCELLED"].includes(o.status),
  ).length;

  const setupQuery = useQuery({
    queryKey: ["lab", "setup", order.serviceId ?? order.serviceCode],
    queryFn: () => labService.setupFor({ id: order.serviceId ?? "", serviceCode: order.serviceCode, serviceName: order.serviceName }),
    staleTime: 5 * 60_000,
  });

  const [draft, setDraft] = useState<ResultsDraft | null>(null);
  const [savedDraftAt, setSavedDraftAt] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [criticalOpen, setCriticalOpen] = useState(false);
  const [authoriseNow, setAuthoriseNow] = useState(false);

  // Build the form once the test's setup is known: a saved draft wins, else one row per measurement.
  useEffect(() => {
    if (draft || setupQuery.isPending) return;
    let restored: ResultsDraft | null = null;
    const setup = setupQuery.data;
    try {
      const raw = localStorage.getItem(draftKey(order.id));
      if (raw) {
        restored = JSON.parse(raw) as ResultsDraft;
        // Use the test's current ranges, not the copy saved with the draft.
        restored.rows = restored.rows.map((r) => ({ ...r, param: setup?.parameters.find((p) => p.name === r.analyte) ?? r.param }));
      }
    } catch {
      /* ignore */
    }
    const initial: ResultsDraft = restored ?? {
      rows:
        setup && setup.parameters.length > 0
          ? setup.parameters.map((p) => ({ key: rowKey(), param: p, analyte: p.name, value: "", units: p.unit, comment: "" }))
          : isMalariaPanel
            ? []
            : [{ key: rowKey(), param: null, analyte: order.serviceName, value: "", units: "", comment: "" }],
      sampleType: setup?.sampleType || order.specimenType || "",
      source: order.sourceOfRequest || "CONSULTING_ROOM",
      malaria: order.malariaPanelJson ? parseMalariaPanelJson(order.malariaPanelJson) : emptyMalariaPanel(),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initialisation once the setup has loaded
    setDraft(initial);
    if (restored) setRestored(true);
  }, [draft, setupQuery.isPending, setupQuery.data, order, isMalariaPanel]);

  const flagged = useMemo(
    () =>
      (draft?.rows ?? []).map((r) => ({
        row: r,
        flag: r.param ? flagResult(r.param, r.value, age, sex) : null,
        range: r.param ? describeLabRange(r.param, age, sex) : "",
      })),
    [draft, age, sex],
  );
  const criticals = flagged.filter((f) => f.flag === "CRITICAL");

  const submitMut = useMutation({
    mutationFn: async (told: { how: string } | null) => {
      const d = draft!;
      const rows = flagged
        .filter((f) => f.row.value.trim() || f.row.comment.trim())
        .map((f) => ({
          analyte: f.row.analyte.trim(),
          value: f.row.value.trim(),
          units: f.row.units.trim(),
          referenceRange: f.range,
          flag: flagForRecord(f.flag),
          comment:
            f.flag === "CRITICAL" && told
              ? [f.row.comment.trim(), `Requesting doctor told ${told.how}.`].filter(Boolean).join(" ")
              : f.row.comment.trim(),
        }));
      const payload: SubmitLabResultsPayload = {
        rows,
        authoriseImmediately: canAuthorise && authoriseNow && otherOpenTests === 0,
        pathology: {
          specimenType: d.sampleType.trim(),
          sourceOfRequest: d.source,
          sampleReceivedAt: order.startedAt ?? new Date().toISOString(),
          malariaPanel: isMalariaPanel ? d.malaria : null,
        },
      };
      return clinicalService.submitLabResults(order.id, payload);
    },
    onSuccess: (saved) => {
      try {
        localStorage.removeItem(draftKey(order.id));
      } catch {
        /* ignore */
      }
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      setCriticalOpen(false);
      toast.success(
        saved.status === "AUTHORISED"
          ? "Results saved and authorised. The doctor can see them now."
          : "Results saved. A lab scientist needs to authorise them.",
      );
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  if (!draft) return <CardSkeleton />;

  const patch = (p: Partial<ResultsDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const patchRow = (key: string, p: Partial<EntryRow>) =>
    setDraft((d) => (d ? { ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, ...p } : r)) } : d));

  const hasAnyResult =
    draft.rows.some((r) => r.value.trim()) || (isMalariaPanel && malariaPanelHasSignal(draft.malaria));
  const missingSample = !draft.sampleType.trim();

  function saveDraft() {
    try {
      localStorage.setItem(draftKey(order.id), JSON.stringify(draft));
      setSavedDraftAt(new Date().toISOString());
      toast.success("Draft saved on this computer.");
    } catch {
      toast.error("Couldn't save the draft on this computer.");
    }
  }

  function save() {
    if (missingSample) {
      toast.error("Enter the sample type.");
      return;
    }
    if (!hasAnyResult) {
      toast.error("Enter at least one result.");
      return;
    }
    if (draft!.rows.some((r) => r.value.trim() && !r.analyte.trim())) {
      toast.error("Say what each result measures.");
      return;
    }
    if (criticals.length > 0) {
      setCriticalOpen(true);
      return;
    }
    submitMut.mutate(null);
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Enter results</h2>
          <p className="text-xs text-muted-foreground">
            Sample collected {order.startedAt ? formatClinicalDateTime(order.startedAt) : "just now"}. Normal ranges are for this patient&apos;s age and sex.
          </p>
        </div>
        {(savedDraftAt || restored) && (
          <span className="text-xs text-muted-foreground">{savedDraftAt ? "Draft saved on this computer" : "Draft restored from this computer"}</span>
        )}
      </div>

      {patientQuery.isError && <ErrorState error={patientQuery.error} onRetry={() => void patientQuery.refetch()} title="Couldn't load the patient's age and sex" />}
      {patientQuery.isSuccess && (age === null || sex === null) && (
        <InlineNotice tone="warning">
          This patient&apos;s {age === null && sex === null ? "age and sex aren't" : age === null ? "age isn't" : "sex isn't"} recorded, so some
          results can&apos;t be checked against a normal range. Check them yourself before saving.
        </InlineNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="lab-sample-type" className="text-sm font-medium text-foreground">
            Sample type
          </label>
          <Input id="lab-sample-type" value={draft.sampleType} onChange={(e) => patch({ sampleType: e.target.value })} placeholder="e.g. Whole blood (EDTA)" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lab-source" className="text-sm font-medium text-foreground">
            Sent from
          </label>
          <Select value={draft.source} onValueChange={(v) => patch({ source: v })}>
            <SelectTrigger id="lab-source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isMalariaPanel && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Malaria worksheet</p>
          <LabMalariaPanelForm value={draft.malaria} onChange={(m) => patch({ malaria: m })} />
        </div>
      )}

      {(draft.rows.length > 0 || !isMalariaPanel) && (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Measured</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                  <th className="px-3 py-2 font-medium">Normal range</th>
                  <th className="px-3 py-2 font-medium">Flag</th>
                  <th className="px-3 py-2 font-medium">Comment</th>
                  <th className="w-px px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flagged.map(({ row, flag, range }, i) => (
                  <ResultRow
                    key={row.key}
                    index={i}
                    row={row}
                    flag={flag}
                    range={range}
                    onChange={(p) => patchRow(row.key, p)}
                    onRemove={row.param ? undefined : () => patch({ rows: draft.rows.filter((r) => r.key !== row.key) })}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => patch({ rows: [...draft.rows, { key: rowKey(), param: null, analyte: "", value: "", units: "", comment: "" }] })}
          >
            <Plus className="mr-1 h-4 w-4" /> Add a result line
          </Button>
          {setupQuery.data && setupQuery.data.parameters.length === 0 && !isMalariaPanel && (
            <p className="text-xs text-muted-foreground">
              This test has no measurements set up, so results aren&apos;t flagged automatically. A lab scientist can add them in Tests and settings.
            </p>
          )}
        </div>
      )}

      {criticals.length > 0 && (
        <InlineNotice tone="error" title="Critical result">
          {criticals.map((c) => `${c.row.analyte} ${c.row.value} ${c.row.units}`.trim()).join("; ")} — you&apos;ll be asked to confirm you told the doctor.
        </InlineNotice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {canAuthorise && otherOpenTests === 0 ? (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={authoriseNow} onCheckedChange={(v) => setAuthoriseNow(v === true)} />
            I&apos;ve checked these results — authorise them now
          </label>
        ) : canAuthorise ? (
          <p className="text-xs text-muted-foreground">
            This visit has {otherOpenTests} other test{otherOpenTests === 1 ? "" : "s"} still open. Authorise from the results page once saved.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">A lab scientist will authorise these results before the doctor sees them as final.</p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={saveDraft}>
            Save draft
          </Button>
          <Button type="button" disabled={submitMut.isPending || patientQuery.isPending} onClick={save}>
            {submitMut.isPending ? "Saving…" : "Save results"}
          </Button>
        </div>
      </div>

      <CriticalConfirmDialog
        open={criticalOpen}
        onOpenChange={setCriticalOpen}
        lines={criticals.map((c) => `${c.row.analyte} ${c.row.value} ${c.row.units}`.trim() + (c.range ? ` (normal ${c.range})` : ""))}
        doctor={cleanPersonName(order.orderedByName) || null}
        pending={submitMut.isPending}
        onConfirm={(how) => submitMut.mutate({ how })}
      />
    </section>
  );
}

function ResultRow({
  index,
  row,
  flag,
  range,
  onChange,
  onRemove,
}: {
  index: number;
  row: EntryRow;
  flag: LabFlag | null;
  range: string;
  onChange: (p: Partial<EntryRow>) => void;
  onRemove?: () => void;
}) {
  const p = row.param;
  const id = `lab-result-${index}`;
  return (
    <tr>
      <td className="px-3 py-2 align-top">
        {p ? (
          <label htmlFor={id} className="text-foreground">
            {row.analyte}
          </label>
        ) : (
          <Input aria-label={`What was measured, line ${index + 1}`} value={row.analyte} onChange={(e) => onChange({ analyte: e.target.value })} placeholder="e.g. Potassium" />
        )}
      </td>
      <td className="px-3 py-2 align-top">
        {p?.kind === "choice" ? (
          <Select value={row.value || undefined} onValueChange={(v) => onChange({ value: v })}>
            <SelectTrigger id={id} className="w-full min-w-36">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              {(p.choices ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : p?.kind === "text" ? (
          <Textarea id={id} rows={1} value={row.value} onChange={(e) => onChange({ value: e.target.value })} className="min-w-48" />
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              id={id}
              aria-label={p ? undefined : `Result, line ${index + 1}`}
              inputMode="decimal"
              value={row.value}
              onChange={(e) => onChange({ value: e.target.value })}
              className="w-28 font-clinical"
              aria-invalid={flag === "CRITICAL" ? true : undefined}
            />
            {p ? (
              <span className="text-xs text-muted-foreground">{row.units}</span>
            ) : (
              <Input aria-label={`Unit, line ${index + 1}`} value={row.units} onChange={(e) => onChange({ units: e.target.value })} placeholder="unit" className="w-20" />
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2 align-top font-clinical text-xs text-muted-foreground">{range || "—"}</td>
      <td className="px-3 py-2 align-top">
        {flag ? <LabResultValue value={row.value} unit={row.units || undefined} flag={flag} /> : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2 align-top">
        <Input aria-label={`Comment for ${row.analyte || "this result"}`} value={row.comment} onChange={(e) => onChange({ comment: e.target.value })} />
      </td>
      <td className="px-2 py-2 align-top">
        {onRemove && (
          <Button type="button" variant="ghost" size="icon" aria-label="Remove this result line" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function CriticalConfirmDialog({
  open,
  onOpenChange,
  lines,
  doctor,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lines: string[];
  /** Null when the requesting doctor's name isn't recorded. */
  doctor: string | null;
  pending: boolean;
  onConfirm: (how: string) => void;
}) {
  const [told, setTold] = useState(false);
  const [how, setHow] = useState("by phone");
  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTold(false);
      }}
      size="md"
      title="Critical result — tell the doctor now"
      description="Critical results must be told to the requesting doctor straight away."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button type="button" disabled={!told || pending} onClick={() => onConfirm(how)}>
            {pending ? "Saving…" : "Confirm and save"}
          </Button>
        </>
      }
    >
      <div className="alert-critical flex items-start gap-3 rounded-lg border px-4 py-3" role="alert">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="space-y-1 text-sm font-medium">
          {lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      </div>
      <FormDialogSection columns={1}>
        <label className="flex items-start gap-2 text-sm text-foreground">
          <Checkbox checked={told} onCheckedChange={(v) => setTold(v === true)} className="mt-0.5" />
          I have told the requesting doctor{doctor ? ` (${doctor})` : ""}.
        </label>
        <RadioGroup aria-label="How you told them" value={how} onValueChange={setHow} className="grid gap-2 sm:grid-cols-2">
          <ChoiceOption className="py-2">
            <RadioGroupItem value="by phone" />
            By phone
          </ChoiceOption>
          <ChoiceOption className="py-2">
            <RadioGroupItem value="in person" />
            In person
          </ChoiceOption>
        </RadioGroup>
      </FormDialogSection>
    </FormDialog>
  );
}

// ── LAB-05: check and authorise ───────────────────────────────────────────

function ResultsReadOnly({ order }: { order: LabOrderDto }) {
  const malaria = order.malariaPanelJson ? parseMalariaPanelJson(order.malariaPanelJson) : null;
  return (
    <div className="space-y-3">
      {malaria && <LabMalariaPanelReadonly value={malaria} />}
      {(order.results.length > 0 || !malaria) && <LabResultsTable rows={order.results} />}
    </div>
  );
}

function ReviewStep({ order }: { order: LabOrderDto }) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const returnsVisit = canMoveVisits(role);
  const canAuthorise = canAuthoriseLabResults(role);

  const authoriseMut = useMutation({
    mutationFn: async () => {
      const saved = await clinicalService.updateLabOrderStatus(order.id, "AUTHORISED");
      await returnPatientIfAllDone(order.encounterId, role).catch(() => undefined);
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success(
        returnsVisit
          ? "Results authorised. The doctor can see them now."
          : "Results authorised. The doctor can see them, and the patient shows under Waiting for results.",
      );
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Results</h2>
        <p className="text-xs text-muted-foreground">
          {order.status === "AUTHORISED"
            ? `Authorised${order.authorisedAt ? ` ${formatClinicalDateTime(order.authorisedAt)}` : ""}. The doctor can see them.`
            : "Check the results before they go to the doctor as final."}
        </p>
      </div>
      <ResultsReadOnly order={order} />
      {order.status === "COMPLETED" &&
        (canAuthorise ? (
          <div className="flex justify-end border-t border-border pt-4">
            <Button disabled={authoriseMut.isPending} onClick={() => authoriseMut.mutate()}>
              {authoriseMut.isPending ? "Authorising…" : "Authorise results"}
            </Button>
          </div>
        ) : (
          <InlineNotice tone="info">A lab scientist needs to authorise these results.</InlineNotice>
        ))}
    </section>
  );
}
