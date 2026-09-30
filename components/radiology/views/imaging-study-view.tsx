"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileImage, Play, Printer } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { BannerSkeleton, CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { UploadDropzone } from "@/components/common/upload-dropzone";
import { ImagingReport } from "@/components/clinical/imaging/imaging-report";
import { PatientBanner } from "@/components/clinical/patient-banner";
import { Button } from "@/components/ui/button";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { cleanPersonName, naturalName } from "@/lib/display-name";
import { formatClinicalDateTime } from "@/lib/dates";
import { composeReport, imagingStatus, isScanWaitingToPay, needsPregnancyCheck, parseReport, type ReportSections } from "@/lib/imaging";
import { labUrgencyLabel } from "@/lib/lab-results";
import { printArea } from "@/lib/print";
import { queryKeys } from "@/lib/query-keys";
import { canReportImaging } from "@/lib/permissions";
import { clinicalService } from "@/services/clinical.service";
import { useAuthStore } from "@/store/auth.store";
import { imagingService, SCAN_CANCEL_REASONS } from "@/services/imaging.service";
import type { RadiologyOrderDto } from "@/types/clinical.types";

const draftKey = (id: string) => `nhims:imaging-report-draft:${id}`;

/** RAD-02 / RAD-03 — one scan request: start it, write the report, read and print it. */
export function ImagingStudyView() {
  const router = useRouter();
  const orderId = useSearchParams().get("orderId");
  const role = useAuthStore((s) => s.user?.role);
  const orderQuery = useQuery({
    queryKey: orderId ? queryKeys.clinical.radiologyOrder(orderId) : ["clinical", "radiology-orders", "idle"],
    queryFn: () => clinicalService.getRadiologyOrder(orderId!),
    enabled: Boolean(orderId),
  });

  const back = (
    <Button variant="ghost" size="sm" onClick={() => router.back()}>
      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
    </Button>
  );

  if (!orderId) {
    return (
      <EmptyState
        illustration="choose-patient"
        title="No scan open"
        description="Open a scan from To do or Reports."
        action={{ label: "Scans to do", href: "/radiology?view=worklist" }}
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
      <PatientBanner
        patientId={order.patientId ?? ""}
        encounterId={order.encounterId}
        fallback={{ name: naturalName(order.patientName), hospitalNumber: order.patientPublicId, sex: order.patientSex, dob: order.patientDob }}
      />
      <RequestCard order={order} />
      {!canReportImaging(role) && order.status !== "COMPLETED" ? (
        <InlineNotice tone="info">Imaging staff start the scan and write the report. You&apos;ll see the report here once it&apos;s ready.</InlineNotice>
      ) : order.status === "IN_PROGRESS" ? (
        <ReportForm key={order.id} order={order} />
      ) : order.status === "COMPLETED" ? (
        <FinishedReport order={order} />
      ) : order.status === "CANCELLED" ? (
        <InlineNotice tone="info" title="This scan was cancelled.">
          <ClearDraft orderId={order.id} />
          {imagingService.cancelReasonFor(order) ? `Reason: ${imagingService.cancelReasonFor(order)}.` : "Nothing more to do here."}
        </InlineNotice>
      ) : (
        <StartStep order={order} />
      )}
    </div>
  );
}

function RequestCard({ order }: { order: RadiologyOrderDto }) {
  const status = imagingStatus(order.status);
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {order.serviceName}
            {order.studyName && order.studyName !== order.serviceName ? ` — ${order.studyName}` : ""}
          </h2>
          <p className="text-xs text-muted-foreground">
            Requested by {cleanPersonName(order.orderedByName) || "a clinician"}
            {order.orderedAt ? ` · ${formatClinicalDateTime(order.orderedAt)}` : ""} · Visit {order.encounterNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusPill tone={order.priority === "STAT" || order.priority === "EMERGENCY" ? "error" : order.priority === "URGENT" ? "warning" : "neutral"}>
            {labUrgencyLabel(order.priority)}
          </StatusPill>
          {isScanWaitingToPay(order) && <StatusPill tone="pending">Waiting to pay</StatusPill>}
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
      </div>
      {order.clinicalNotes && (
        <div>
          <p className="text-xs text-muted-foreground">Reason for the scan</p>
          <p className="text-sm text-foreground">{order.clinicalNotes}</p>
        </div>
      )}
      {needsPregnancyCheck(order) && order.status !== "COMPLETED" && (
        <InlineNotice tone="warning" title="Ask about pregnancy before the scan.">
          {naturalName(order.patientName)} is a woman of child-bearing age. Check she isn&apos;t pregnant, or talk to the doctor first.
        </InlineNotice>
      )}
    </section>
  );
}

// ── RAD-02: start the scan, or cancel with a reason ────────────────────────

function StartStep({ order }: { order: RadiologyOrderDto }) {
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const waiting = isScanWaitingToPay(order);

  const startMut = useMutation({
    mutationFn: () => clinicalService.updateRadiologyOrderStatus(order.id, "IN_PROGRESS"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Scan started. Write the report when it's done.");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });
  const cancelMut = useMutation({
    mutationFn: (why: string) => imagingService.cancel(order, why),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      setCancelOpen(false);
      toast.success("Scan cancelled. The doctor has been told.");
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });
  const finalReason = reason === "Other" ? other.trim() : reason;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Scan</h2>
        <p className="text-xs text-muted-foreground">Start the scan when the patient is in the room.</p>
      </div>
      {waiting && (
        <InlineNotice tone="pending" title="Waiting for payment at the cashier.">
          The scan can start once the cashier has taken payment.
        </InlineNotice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={waiting || startMut.isPending} onClick={() => startMut.mutate()}>
          <Play className="mr-1.5 h-4 w-4" /> {startMut.isPending ? "Starting…" : "Start scan"}
        </Button>
        <Button variant="destructive-outline" onClick={() => setCancelOpen(true)}>
          Cancel scan
        </Button>
      </div>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(o) => {
          setCancelOpen(o);
          if (!o) {
            setReason("");
            setOther("");
          }
        }}
        title={`Cancel ${order.serviceName} for ${naturalName(order.patientName)}?`}
        description="The doctor is told, and can request it again if needed. Choose why."
        confirmLabel="Cancel scan"
        cancelLabel="Keep scan"
        destructive
        pending={cancelMut.isPending}
        confirmDisabled={!finalReason}
        footerExtra={
          <div className="space-y-2">
            <RadioGroup aria-label="Why" value={reason} onValueChange={setReason} className="grid gap-1.5 sm:grid-cols-2">
              {SCAN_CANCEL_REASONS.map((r) => (
                <ChoiceOption key={r} className="py-1.5">
                  <RadioGroupItem value={r} />
                  {r}
                </ChoiceOption>
              ))}
            </RadioGroup>
            {reason === "Other" && <Input aria-label="Other reason" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Say why" />}
          </div>
        }
        onConfirm={async () => {
          if (!finalReason) {
            toast.error("Choose why the scan is being cancelled.");
            throw new Error("missing reason");
          }
          await cancelMut.mutateAsync(finalReason);
        }}
      />
    </section>
  );
}

// ── RAD-03: write the report ───────────────────────────────────────────────

function ReportForm({ order }: { order: RadiologyOrderDto }) {
  const qc = useQueryClient();
  const [sections, setSections] = useState<ReportSections>(() => {
    const base = parseReport(order.reportText);
    try {
      const raw = localStorage.getItem(draftKey(order.id));
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Record<keyof ReportSections, unknown>>;
        const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
        return {
          findings: str(saved.findings, base.findings),
          impression: str(saved.impression, base.impression),
          recommendations: str(saved.recommendations, base.recommendations),
        };
      }
    } catch {
      /* ignore */
    }
    return base;
  });
  const set = (p: Partial<ReportSections>) =>
    setSections((s) => {
      const next = { ...s, ...p };
      try {
        localStorage.setItem(draftKey(order.id), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const filesQuery = useQuery({
    queryKey: ["imaging", "attachments", order.id],
    queryFn: () => imagingService.attachments(order.id),
  });
  const attachMut = useMutation({
    mutationFn: (file: File) => imagingService.attach(order.id, file),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["imaging", "attachments", order.id] });
      toast.success(`${a.fileName} attached.`);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const saveMut = useMutation({
    mutationFn: () => clinicalService.submitRadiologyReport(order.id, composeReport(sections)),
    onSuccess: () => {
      try {
        localStorage.removeItem(draftKey(order.id));
      } catch {
        /* ignore */
      }
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success(`Report saved. ${naturalName(order.patientName)}'s doctor can read it now.`);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  const ready = sections.findings.trim() && sections.impression.trim();
  const fields: Array<{ key: keyof ReportSections; label: string; hint: string; rows: number; required: boolean }> = [
    { key: "findings", label: "Findings", hint: "What the images show", rows: 6, required: true },
    { key: "impression", label: "Impression", hint: "Your conclusion in a sentence or two", rows: 3, required: true },
    { key: "recommendations", label: "Recommendations (optional)", hint: "e.g. Follow-up scan in 6 weeks", rows: 2, required: false },
  ];

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Report</h2>
        <p className="text-xs text-muted-foreground">
          Scan started {order.startedAt ? formatClinicalDateTime(order.startedAt) : "just now"}. Your draft is kept on this computer until you save.
        </p>
      </div>
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <label htmlFor={`report-${f.key}`} className="text-sm font-medium text-foreground">
            {f.label}
          </label>
          <Textarea
            id={`report-${f.key}`}
            rows={f.rows}
            value={sections[f.key]}
            placeholder={f.hint}
            disabled={saveMut.isPending}
            onChange={(e) => set({ [f.key]: e.target.value })}
          />
        </div>
      ))}

      {imagingService.attachmentsAvailable() ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Images and files (optional)</p>
          <UploadDropzone
            accept="image/jpeg,image/png,application/pdf"
            maxSizeMb={20}
            helperText="JPEG, PNG or PDF, up to 20 MB"
            onFile={(f) => attachMut.mutate(f)}
            disabled={attachMut.isPending}
          />
          {(filesQuery.data ?? []).length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {(filesQuery.data ?? []).map((a) => (
                <li key={a.id} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-foreground">
                  <FileImage className="h-3.5 w-3.5" aria-hidden="true" /> {a.fileName}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Attaching images isn&apos;t available yet — describe what you see in the findings.</p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        {!ready && <p className="text-xs text-muted-foreground">Write the findings and impression to save.</p>}
        <Button disabled={!ready || saveMut.isPending} onClick={() => saveMut.mutate()}>
          {saveMut.isPending ? "Saving…" : "Save report"}
        </Button>
      </div>
    </section>
  );
}

// ── RAD-04 detail: read and print ─────────────────────────────────────────

function ClearDraft({ orderId }: { orderId: string }) {
  // The scan is finished or cancelled: any report draft left on this computer is no longer needed.
  useEffect(() => {
    try {
      localStorage.removeItem(draftKey(orderId));
    } catch {
      /* ignore */
    }
  }, [orderId]);
  return null;
}

function FinishedReport({ order }: { order: RadiologyOrderDto }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <ClearDraft orderId={order.id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Report</h2>
        <Button variant="outline" size="sm" onClick={() => printArea("imaging-report")}>
          <Printer className="mr-1.5 h-4 w-4" /> Print report
        </Button>
      </div>
      <div data-print-area="imaging-report" className="space-y-3 bg-card">
        <div className="hidden space-y-0.5 print:block">
          <p className="text-base font-semibold">
            {order.serviceName}
            {order.studyName && order.studyName !== order.serviceName ? ` — ${order.studyName}` : ""}
          </p>
          <p className="text-sm">
            {naturalName(order.patientName)} · {order.patientPublicId} · Visit {order.encounterNumber}
          </p>
        </div>
        <ImagingReport order={order} />
      </div>
    </section>
  );
}
