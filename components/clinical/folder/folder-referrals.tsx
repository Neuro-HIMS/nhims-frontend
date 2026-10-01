"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import {
  FolderRecordExpandableRow,
  FolderRecordFeedBanner,
  FolderRecordField,
} from "@/components/clinical/folder/folder-record-expandable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { ErrorState } from "@/components/common/error-state";
import { FormDialog, FormDialogSection } from "@/components/common/form-dialog";
import { CardSkeleton } from "@/components/common/skeletons";
import { StatusPill } from "@/components/common/status-pill";
import { SearchablePicker } from "@/components/common/searchable-picker";
import { referralStatus, referralUrgency } from "@/lib/status-labels";
import { getFriendlyError } from "@/lib/api-errors";
import { appointmentsService } from "@/services/appointments.service";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreateReferralPayload,
  ReferralUrgency,
} from "@/types/clinical.types";
import type { Visit } from "@/lib/clinical-types";

const DEPARTMENTS = [
  "General OPD",
  "Family Medicine",
  "Pediatrics",
  "Maternity",
  "Surgery",
  "Internal Medicine",
  "Emergency",
  "Laboratory",
  "Radiology",
  "Pharmacy",
];

const EMPTY_REF: CreateReferralPayload = {
  fromDepartment: "Nurse Station",
  toDepartment: "General OPD",
  reason: "",
  urgency: "ROUTINE",
  assignedToUserId: undefined,
};

interface FolderReferralsProps {
  visit: Visit | null;
}

/**
 * Internal referrals tab inside the patient folder. The receiving
 * department picks the patient up from `/clinical/referrals?department=...`.
 */
export function FolderReferrals({ visit }: FolderReferralsProps) {
  const qc = useQueryClient();

  const refsQuery = useQuery({
    queryKey: visit ? queryKeys.clinical.referrals(visit.id) : ["clinical", "referrals", "idle"],
    queryFn: () => clinicalService.listReferralsForEncounter(visit!.id),
    enabled: Boolean(visit),
  });

  const placeMut = useMutation({
    mutationFn: (payload: CreateReferralPayload) => clinicalService.placeReferral(visit!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Referral sent.");
      setShowForm(false);
      setForm(EMPTY_REF);
    },
    onError: (e: unknown) => toast.error(getFriendlyError(e).message),
  });

  const [showForm, setShowForm] = useState(false);
  const cliniciansQuery = useQuery({
    queryKey: queryKeys.appointments.clinicians,
    queryFn: () => appointmentsService.clinicians(),
    enabled: showForm,
    staleTime: 60_000,
  });
  const [form, setForm] = useState<CreateReferralPayload>(EMPTY_REF);

  const list = useMemo(() => refsQuery.data ?? [], [refsQuery.data]);
  const sorted = useMemo(
    () => [...list].sort((a, b) => (b.referredAt ?? "").localeCompare(a.referredAt ?? "")),
    [list],
  );

  function handleSave() {
    if (!visit) {
      toast.error("Open the patient via a visit before referring");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Add a reason for the referral.");
      return;
    }
    placeMut.mutate({
      fromDepartment: form.fromDepartment,
      toDepartment: form.toDepartment,
      reason: form.reason.trim(),
      urgency: form.urgency,
      assignedToUserId: form.assignedToUserId?.trim() || undefined,
    });
  }

  const close = () => {
    setShowForm(false);
    setForm(EMPTY_REF);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Referrals</p>
          <p className="text-xs text-muted-foreground">
            {list.length} referral{list.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} disabled={!visit || placeMut.isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Refer patient
        </Button>
      </div>

      <FormDialog
        open={showForm}
        onOpenChange={(o) => (o ? setShowForm(true) : close())}
        size="md"
        title="Refer this patient"
        description="The department you choose will see the patient in their list."
        footer={
          <>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={placeMut.isPending || !form.reason.trim()}>
              {placeMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Send referral
            </Button>
          </>
        }
      >
        <FormDialogSection title="Where to">
          <RecordsField label="From" htmlFor="referrals-from">
            <Select value={form.fromDepartment ?? ""} onValueChange={(v) => setForm({ ...form, fromDepartment: v })}>
              <SelectTrigger id="referrals-from" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Nurse Station", ...DEPARTMENTS].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d === "Nurse Station" ? "Nurse station" : d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RecordsField>
          <RecordsField label="To" htmlFor="referrals-to">
            <Select value={form.toDepartment} onValueChange={(v) => setForm({ ...form, toDepartment: v })}>
              <SelectTrigger id="referrals-to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RecordsField>
          <RecordsField label="How soon" htmlFor="referrals-how-soon">
            <Select value={form.urgency ?? "ROUTINE"} onValueChange={(v: ReferralUrgency) => setForm({ ...form, urgency: v })}>
              <SelectTrigger id="referrals-how-soon" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROUTINE">Routine</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="STAT">Immediately</SelectItem>
              </SelectContent>
            </Select>
          </RecordsField>
          <RecordsField label="Doctor (optional)" htmlFor="referrals-doctor">
            <SearchablePicker
              id="referrals-doctor"
              value={form.assignedToUserId ?? "__any__"}
              onChange={(v) => setForm({ ...form, assignedToUserId: v === "__any__" ? undefined : v })}
              loading={cliniciansQuery.isPending}
              searchPlaceholder="Doctor's name"
              options={[{ value: "__any__", label: "Anyone in that department" }, ...(cliniciansQuery.data ?? []).map((c) => ({ value: c.userId, label: c.fullName }))]}
            />
          </RecordsField>
        </FormDialogSection>
        <FormDialogSection title="Why" columns={1}>
          <RecordsField label="Reason for referral" htmlFor="referrals-reason-for-referral">
            <Textarea id="referrals-reason-for-referral"               value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              placeholder="What you'd like them to look at, and anything they should know"
            />
          </RecordsField>
        </FormDialogSection>
      </FormDialog>

      {refsQuery.isPending && visit ? (
        <CardSkeleton />
      ) : refsQuery.isError ? (
        <ErrorState error={refsQuery.error} onRetry={() => void refsQuery.refetch()} />
      ) : list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ArrowRightLeft className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No referrals on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <FolderRecordFeedBanner>
            Expand a referral for the full clinical reason and any documented response.
          </FolderRecordFeedBanner>
          {sorted.map((r, idx) => (
            <FolderRecordExpandableRow
              key={r.id}
              railIndex={sorted.length - idx}
              icon={ArrowRightLeft}
              eyebrow="Internal referral"
              title={
                <span>
                  {r.fromDepartment}{" "}
                  <ArrowRightLeft className="inline h-3.5 w-3.5 text-muted-foreground" /> {r.toDepartment}
                </span>
              }
              preview={<span className="line-clamp-2">{r.reason}</span>}
              footerTime={r.referredAt}
              badges={
                <>
                  <StatusPill tone={referralUrgency(r.urgency).tone}>{referralUrgency(r.urgency).label}</StatusPill>
                  <StatusPill tone={referralStatus(r.status).tone}>{referralStatus(r.status).label}</StatusPill>
                </>
              }
            >
              <div className="space-y-3">
                <FolderRecordField label="From department" value={r.fromDepartment} />
                <FolderRecordField label="To department" value={r.toDepartment} />
                <FolderRecordField label="Reason" value={r.reason} />
                <FolderRecordField label="Referred by" value={r.referredByName} />
                <FolderRecordField label="Response / outcome" value={r.response?.trim() || null} />
                <Button variant="outline" size="sm" onClick={() => clinicalService.openReferralLetterPdf(r.id)}>
                  Download referral letter (PDF)
                </Button>
              </div>
            </FolderRecordExpandableRow>
          ))}
        </div>
      )}
    </div>
  );
}

