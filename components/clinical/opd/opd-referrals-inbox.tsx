"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query-keys";
import { clinicalService } from "@/services/clinical.service";
import type { ApiError } from "@/types/api.types";
import type { ReferralDecisionPayload, ReferralDto, ReferralStatus } from "@/types/clinical.types";

const STATUS_FILTERS: { value: ReferralStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "ALL", label: "All open" },
];

function statusLabel(s: string): string {
  return s.toLowerCase();
}

/**
 * Department inbox + per-assignee queue (`assignee=me` on the API).
 * Acknowledge = ACCEPT; outcome = COMPLETE or REJECT.
 */
export function OpdReferralsInbox() {
  const qc = useQueryClient();
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<ReferralStatus | "ALL">("PENDING");
  const [mineOnly, setMineOnly] = useState(false);
  const [selected, setSelected] = useState<ReferralDto | null>(null);
  const [decision, setDecision] = useState<ReferralDecisionPayload["decision"]>("ACCEPT");
  const [responseNotes, setResponseNotes] = useState("");

  const queryParams = useMemo(() => {
    const p: { department?: string; status?: string; assignee?: string } = {};
    if (department.trim()) p.department = department.trim();
    if (status !== "ALL") p.status = status;
    if (mineOnly) p.assignee = "me";
    return p;
  }, [department, status, mineOnly]);

  const inboxQuery = useQuery({
    queryKey: [...queryKeys.clinical.all, "referrals-inbox", queryParams],
    queryFn: () => clinicalService.referralInbox(queryParams),
    refetchInterval: 45_000,
  });

  const decideMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReferralDecisionPayload }) =>
      clinicalService.decideReferral(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.clinical.all });
      toast.success("Referral updated");
      setSelected(null);
      setResponseNotes("");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: ApiError } };
      toast.error(ax.response?.data?.message ?? "Could not update referral");
    },
  });

  const rows = inboxQuery.data ?? [];

  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Referral inbox</CardTitle>
          <CardDescription className="text-xs">
            Filter by department, status, or <strong>My assignments</strong> (referrals with an assignee matching your
            user). Use the patient folder to send referrals and optionally set a receiving clinician.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Department contains</Label>
          <Input
            className="w-48"
            placeholder="e.g. Surgery"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ReferralStatus | "ALL")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-1.5 text-sm">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          My assignments only
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={inboxQuery.isFetching}
          onClick={() => void inboxQuery.refetch()}
        >
          Refresh
        </Button>
      </div>

      {inboxQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading referrals…
        </p>
      ) : inboxQuery.isError ? (
        <p className="text-sm text-destructive">Could not load referrals.</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No referrals match filters.</CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Patient
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Route
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Urgency
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Assignee
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="table-row-interactive">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground">{r.patientName}</p>
                    <p className="patient-id text-xs">{r.patientPublicId}</p>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {r.fromDepartment} → {r.toDepartment}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="status-pill text-xs status-pill-pending">{r.urgency}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="status-pill text-xs status-pill-pending">{statusLabel(r.status)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {r.assignedToName?.trim() || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {r.encounterId && r.patientId && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/nurse?view=folder&patientId=${r.patientId}&visitId=${r.encounterId}`}>
                            Folder
                          </Link>
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setSelected(r)}>
                        Decide
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Decision</CardTitle>
            <CardDescription>
              {selected.patientPublicId} · {selected.fromDepartment} → {selected.toDepartment}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Reason</p>
              <p className="mt-1 whitespace-pre-wrap">{selected.reason}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select
                value={decision}
                onValueChange={(v) => setDecision(v as ReferralDecisionPayload["decision"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCEPT">Acknowledge (accept)</SelectItem>
                  <SelectItem value="COMPLETE">Complete / done</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes / outcome (optional)</Label>
              <Textarea rows={3} value={responseNotes} onChange={(e) => setResponseNotes(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={decideMut.isPending}
                onClick={() =>
                  decideMut.mutate({
                    id: selected.id,
                    payload: { decision, response: responseNotes.trim() || undefined },
                  })
                }
              >
                {decideMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save decision"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
