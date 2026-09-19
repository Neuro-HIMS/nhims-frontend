"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/common/status-pill";
import { formatTableDate } from "@/lib/dates";
import { patientsService } from "@/services/patients.service";
import type { NhisVerificationResultDto } from "@/types/patients.types";

/**
 * REC-03 — shared everywhere a patient's NHIS cover needs checking:
 * registration step 3, patient details edit, and start-of-visit payer step.
 */
export function NhisCheck({
  memberNumber,
  onMemberNumberChange,
  onVerified,
  onContinueSelfPay,
  disabled,
}: {
  memberNumber: string;
  onMemberNumberChange: (value: string) => void;
  onVerified?: (result: NhisVerificationResultDto) => void;
  onContinueSelfPay?: () => void;
  disabled?: boolean;
}) {
  const [result, setResult] = useState<NhisVerificationResultDto | null>(null);

  const checkMutation = useMutation({
    mutationFn: () => patientsService.verifyNhis(memberNumber.trim()),
    onSuccess: (data) => {
      setResult(data);
      onVerified?.(data);
    },
  });

  const invalidFormat = result?.status === "INVALID_FORMAT";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="nhis-member-number">NHIS membership number</Label>
          <Input
            id="nhis-member-number"
            value={memberNumber}
            onChange={(e) => {
              onMemberNumberChange(e.target.value);
              if (result) setResult(null);
            }}
            placeholder="e.g. 12345678"
            className="font-clinical"
            disabled={disabled}
            aria-invalid={invalidFormat}
          />
          {invalidFormat && (
            <p className="text-xs text-destructive">
              Check the NHIS number — it should look like 12345678.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="self-end"
          disabled={disabled || !memberNumber.trim() || checkMutation.isPending}
          onClick={() => checkMutation.mutate()}
        >
          {checkMutation.isPending ? "Checking…" : "Check NHIS"}
        </Button>
      </div>

      {result && !invalidFormat && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          {result.status === "VERIFIED" && (
            <div className="space-y-1">
              <StatusPill tone="success">NHIS active</StatusPill>
              <p className="text-sm text-foreground">
                {result.memberName ?? "Member name not returned"}
                {result.scheme ? ` · ${result.scheme}` : ""}
              </p>
              {result.validUntil && (
                <p className="text-sm text-muted-foreground">
                  Valid until {formatTableDate(result.validUntil)}
                </p>
              )}
            </div>
          )}

          {result.status === "NOT_FOUND" && (
            <div className="space-y-2">
              <StatusPill tone="error">
                {result.message?.toLowerCase().includes("expired") ? "NHIS expired" : "NHIS number not found"}
              </StatusPill>
              <p className="text-sm text-muted-foreground">The patient may need to pay for this visit.</p>
              {onContinueSelfPay && (
                <Button type="button" variant="outline" size="sm" onClick={onContinueSelfPay}>
                  Continue as self-pay
                </Button>
              )}
            </div>
          )}

          {result.status === "PENDING_GATEWAY" && (
            <div className="space-y-1">
              <StatusPill tone="pending">NHIS not confirmed yet</StatusPill>
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t reach NHIS right now. You can continue — confirm before billing.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
