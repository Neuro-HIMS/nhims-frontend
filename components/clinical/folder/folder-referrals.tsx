"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordsField } from "@/components/records/shared/records-field";
import { formatDateTime } from "@/components/nurse/lib/nurse-data";
import { clinicalService } from "@/services/clinical.service";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api.types";
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
      toast.success("Referral sent");
      setShowForm(false);
      setForm(EMPTY_REF);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not send referral");
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateReferralPayload>(EMPTY_REF);

  const list = refsQuery.data ?? [];

  function handleSave() {
    if (!visit) {
      toast.error("Open the patient via a visit before referring");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Reason for referral is required");
      return;
    }
    placeMut.mutate({
      fromDepartment: form.fromDepartment,
      toDepartment: form.toDepartment,
      reason: form.reason.trim(),
      urgency: form.urgency,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Internal Referrals</p>
          <p className="text-xs text-muted-foreground">
            {list.length} referral{list.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)} disabled={!visit || placeMut.isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "Refer Patient"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Internal Referral</CardTitle>
            <CardDescription>The receiving department will see this patient in their queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <RecordsField label="From">
                <Select
                  value={form.fromDepartment ?? ""}
                  onValueChange={(v) => setForm({ ...form, fromDepartment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Nurse Station", ...DEPARTMENTS].map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </RecordsField>
              <RecordsField label="To *">
                <Select
                  value={form.toDepartment}
                  onValueChange={(v) => setForm({ ...form, toDepartment: v })}
                >
                  <SelectTrigger>
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
              <RecordsField label="Urgency">
                <Select
                  value={form.urgency ?? "ROUTINE"}
                  onValueChange={(v: ReferralUrgency) => setForm({ ...form, urgency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUTINE">Routine</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="STAT">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </RecordsField>
            </div>
            <RecordsField label="Reason *">
              <Textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={2}
              />
            </RecordsField>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={placeMut.isPending}>
                {placeMut.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Send Referral
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {refsQuery.isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading referrals…
          </CardContent>
        </Card>
      ) : list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ArrowRightLeft className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No referrals on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {r.fromDepartment}{" "}
                    <ArrowRightLeft className="inline h-3.5 w-3.5 text-muted-foreground" />{" "}
                    {r.toDepartment}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">{r.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.referredAt ? formatDateTime(r.referredAt) : ""} · {r.referredByName}
                  </p>
                  {r.response && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      Response: {r.response}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={urgencyClass(r.urgency)}>{r.urgency}</span>
                  <span className={statusClass(r.status)}>{r.status.toLowerCase()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function urgencyClass(u: string) {
  if (u === "STAT") return "status-pill text-xs bg-[hsl(var(--clinical-emergency))] text-white";
  if (u === "URGENT") return "status-pill text-xs bg-[hsl(var(--clinical-urgent))] text-white";
  return "status-pill text-xs status-pill-pending";
}

function statusClass(s: string) {
  if (s === "ACCEPTED" || s === "COMPLETED") return "status-pill text-xs status-pill-active";
  if (s === "REJECTED") return "status-pill text-xs status-pill-inactive";
  return "status-pill text-xs status-pill-pending";
}
