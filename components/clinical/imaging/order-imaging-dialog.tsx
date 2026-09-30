"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { InlineNotice } from "@/components/common/inline-notice";
import { Button } from "@/components/ui/button";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { isSelfPay, type LabUrgency } from "@/lib/lab-results";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";

const URGENCIES: Array<{ value: LabUrgency; label: string }> = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "STAT", label: "Immediately" },
];

interface OrderImagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  patientName: string;
  payerType: string;
}

/** DOC-06 — request a scan. The reason is required so the radiographer knows what to look for. */
export function OrderImagingDialog(props: OrderImagingDialogProps) {
  if (!props.open) return null;
  return <Body {...props} />;
}

function Body({ open, onOpenChange, encounterId, patientName, payerType }: OrderImagingDialogProps) {
  const qc = useQueryClient();
  const [serviceId, setServiceId] = useState("");
  const [studyName, setStudyName] = useState("");
  const [urgency, setUrgency] = useState<LabUrgency>("ROUTINE");
  const [reason, setReason] = useState("");

  const examsQuery = useQuery({
    queryKey: ["clinical", "catalog", "IMAGING", "orderable"],
    queryFn: () => clinicalService.catalog("IMAGING", true),
    staleTime: 5 * 60_000,
  });
  const exams = [...(examsQuery.data ?? [])].sort((a, b) => a.serviceName.localeCompare(b.serviceName));

  const sendMut = useMutation({
    mutationFn: () =>
      clinicalService.placeRadiologyOrder(encounterId, {
        serviceId,
        studyName: studyName.trim() || undefined,
        priority: urgency,
        clinicalNotes: reason.trim(),
      }),
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success(`${o.serviceName} sent to imaging.`);
      onOpenChange(false);
    },
    onError: (e) => toast.error(getFriendlyError(e).message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Order a scan for ${patientName}`}
      description="The request goes straight to imaging's list."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!serviceId || !reason.trim() || sendMut.isPending} onClick={() => sendMut.mutate()}>
            {sendMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            Send to imaging
          </Button>
        </>
      }
    >
      <FormDialogSection title="Exam" columns={1}>
        {examsQuery.isPending ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : examsQuery.isError ? (
          <ErrorState error={examsQuery.error} onRetry={() => void examsQuery.refetch()} />
        ) : exams.length === 0 ? (
          <EmptyState illustration="empty-list" title="No scans set up yet" description="Ask your administrator to add the scans your facility offers." />
        ) : (
          <RadioGroup aria-label="Exam" value={serviceId} onValueChange={setServiceId} className="grid gap-2 sm:grid-cols-2">
            {exams.map((e) => (
              <ChoiceOption key={e.id} className="py-2">
                <RadioGroupItem value={e.id} />
                {e.serviceName}
              </ChoiceOption>
            ))}
          </RadioGroup>
        )}
        <div className="space-y-1.5">
          <label htmlFor="scan-study" className="text-sm font-medium text-foreground">
            Part of the body or view (optional)
          </label>
          <Input id="scan-study" value={studyName} onChange={(e) => setStudyName(e.target.value)} placeholder="e.g. Chest PA, right wrist" />
        </div>
      </FormDialogSection>

      <FormDialogSection title="Why and how soon">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="scan-reason" className="text-sm font-medium text-foreground">
            Reason for the scan
          </label>
          <Textarea
            id="scan-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What you want to know, and the key findings so far — e.g. Cough 3 weeks, weight loss; rule out TB"
          />
        </div>
        <RadioGroup aria-label="How soon" value={urgency} onValueChange={(v) => setUrgency(v as LabUrgency)} className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
          {URGENCIES.map((u) => (
            <ChoiceOption key={u.value} className="py-2">
              <RadioGroupItem value={u.value} />
              {u.label}
            </ChoiceOption>
          ))}
        </RadioGroup>
      </FormDialogSection>

      {isSelfPay(payerType) && <InlineNotice tone="info">{patientName} pays at the cashier before the scan.</InlineNotice>}
    </FormDialog>
  );
}
