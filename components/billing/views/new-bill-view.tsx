"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ChargeBuilder, type DraftCharge } from "@/components/billing/views/charge-builder";
import { PageCard } from "@/components/layouts/page-card";
import { PatientSearchPanel } from "@/components/patient-search/patient-search-panel";
import type { Patient } from "@/components/records/lib/records-types";
import { Button } from "@/components/ui/button";
import { ChoiceOption } from "@/components/ui/choice-option";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";
import { toChargeInput } from "@/lib/billing";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";

const PAYERS = [
  { value: "CASH", label: "Self-pay" },
  { value: "NHIS", label: "NHIS" },
  { value: "INSURANCE_PRIVATE", label: "Private insurance" },
  { value: "CORPORATE", label: "Company" },
] as const;

/** BIL-04 — a bill for services that weren't billed automatically (e.g. supplies or a procedure). */
export function NewBillView() {
  const router = useRouter();
  const qc = useQueryClient();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [payer, setPayer] = useState<string>("CASH");
  const [nhisNumber, setNhisNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [charges, setCharges] = useState<DraftCharge[]>([]);

  function choose(p: Patient) {
    setPatient(p);
    // Start from how the patient is registered; the cashier can change it.
    const nhis = p.nhisStatus === "active";
    setPayer(nhis ? "NHIS" : "CASH");
    setNhisNumber(nhis ? p.nhisCard : "");
  }

  const create = useMutation({
    mutationFn: () =>
      billingService.createBill({
        patientId: patient!.id!,
        primaryPayer: payer,
        secondaryPayer: "CASH",
        nhisMemberNo: payer === "NHIS" ? nhisNumber.trim() : "",
        insuranceCardNo: payer === "INSURANCE_PRIVATE" || payer === "CORPORATE" ? cardNumber.trim() : "",
        notes: notes.trim(),
        charges: charges.map(toChargeInput),
      }),
    onSuccess: (bill) => {
      toast.success(`Bill ${bill.billNumber} created for ${patient!.firstName} ${patient!.lastName}.`);
      void qc.invalidateQueries({ queryKey: queryKeys.billing.all });
      router.push(`/billing?view=bills&billId=${bill.id}`);
    },
    onError: (e) => notify.error(getFriendlyError(e).message),
  });

  const missing = !patient
    ? "Choose the patient."
    : charges.length === 0
      ? "Add at least one item."
      : payer === "NHIS" && !nhisNumber.trim()
        ? "Enter the NHIS number."
        : null;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push("/billing?view=bills")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to bills
      </Button>
      <PageCard title="New bill" description="For services that weren't billed automatically, such as supplies or a procedure." />

      {!patient ? (
        <PatientSearchPanel
          cardTitle="1. Patient"
          cardDescription="Search by hospital number, NHIS number, name or phone."
          actionLabel="Bill this patient"
          onSelectPatient={choose}
        />
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">1. Patient</p>
            <p className="font-semibold text-foreground">
              {patient.firstName} {patient.lastName}{" "}
              <span className="font-clinical text-xs font-normal text-muted-foreground">{patient.patientId}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPatient(null)}>
            Change patient
          </Button>
        </section>
      )}

      {patient && (
        <>
          <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">2. How they pay</h2>
            <RadioGroup value={payer} onValueChange={setPayer} className="grid gap-2 sm:grid-cols-4" aria-label="How they pay">
              {PAYERS.map((p) => (
                <ChoiceOption key={p.value}>
                  <RadioGroupItem value={p.value} />
                  {p.label}
                </ChoiceOption>
              ))}
            </RadioGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              {payer === "NHIS" && (
                <div className="space-y-1.5">
                  <Label htmlFor="nb-nhis">NHIS number</Label>
                  <Input id="nb-nhis" value={nhisNumber} onChange={(e) => setNhisNumber(e.target.value)} className="font-clinical" />
                </div>
              )}
              {(payer === "INSURANCE_PRIVATE" || payer === "CORPORATE") && (
                <div className="space-y-1.5">
                  <Label htmlFor="nb-card">{payer === "CORPORATE" ? "Staff or company number (optional)" : "Insurance card number (optional)"}</Label>
                  <Input id="nb-card" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="font-clinical" />
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nb-notes">Note (optional)</Label>
                <Textarea id="nb-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Dressing supplies for a ward patient" />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">3. Items</h2>
            <ChargeBuilder charges={charges} onChange={setCharges} defaultPayer={payer} />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {missing ??
                `${charges.length} item${charges.length === 1 ? "" : "s"} for ${patient.firstName} ${patient.lastName}. Prices come from the price list for ${PAYERS.find((p) => p.value === payer)?.label ?? "this payer"}.`}
            </p>
            <Button onClick={() => create.mutate()} disabled={Boolean(missing) || create.isPending}>
              {create.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create bill
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
