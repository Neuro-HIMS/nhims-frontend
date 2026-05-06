"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, FilePlus2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PatientResultCard } from "@/components/records/views/patient-result-card";
import { patientSummaryToLegacyPatient } from "@/lib/patient-mapper";
import { patientsService } from "@/services/patients.service";
import { billingService } from "@/services/billing.service";
import { ChargeBuilder, type DraftCharge } from "@/components/billing/views/charge-builder";
import { PAYER_LABEL, showApiError } from "@/components/finance/finance-utils";
import type { PatientSummaryDto } from "@/types/patients.types";

export function NewBillView() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const seedPatientId = params.get("patientPublicId") ?? "";

  const [query, setQuery] = useState<string>(seedPatientId);
  const [searching, setSearching] = useState<boolean>(false);
  const [results, setResults] = useState<PatientSummaryDto[]>([]);
  const [patient, setPatient] = useState<PatientSummaryDto | null>(null);

  const [primaryPayer, setPrimaryPayer] = useState<string>("CASH");
  const [secondaryPayer, setSecondaryPayer] = useState<string>("CASH");
  const [nhisMember, setNhisMember] = useState<string>("");
  const [insuranceCard, setInsuranceCard] = useState<string>("");
  const [visitRef, setVisitRef] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [charges, setCharges] = useState<DraftCharge[]>([]);

  // Auto-search if a patient public id was passed in.
  useEffect(() => {
    if (!seedPatientId) return;
    void runSearch(seedPatientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-default payer based on patient's NHIS state.
  useEffect(() => {
    if (!patient) return;
    setPrimaryPayer(patient.nhisActive ? "NHIS" : "CASH");
    setNhisMember(patient.nhisMemberNumber ?? "");
  }, [patient?.id, patient?.nhisActive, patient?.nhisMemberNumber]);

  async function runSearch(q?: string) {
    const term = (q ?? query).trim();
    if (!term) {
      toast.error("Enter a Patient ID, name, or phone");
      return;
    }
    setSearching(true);
    try {
      let data: PatientSummaryDto[] = [];
      if (term.includes(" ")) {
        const parts = term.split(/\s+/).filter(Boolean);
        data = await patientsService.search({
          mode: "name",
          firstName: parts[0] ?? "",
          lastName: parts.slice(1).join(" "),
        });
      } else if (/^\d{8,}$/.test(term)) {
        data = await patientsService.search({ mode: "nhis", q: term });
      } else {
        data = await patientsService.search({ mode: "id", q: term });
      }
      setResults(data);
      if (data.length === 1) setPatient(data[0]);
      if (data.length === 0) {
        setPatient(null);
        toast.error("No patient matched");
      }
    } catch (e) {
      toast.error(showApiError(e, "Patient lookup failed"));
    } finally {
      setSearching(false);
    }
  }

  const create = useMutation({
    mutationFn: () => {
      if (!patient) throw new Error("Patient not selected");
      return billingService.createBill({
        patientId: patient.id,
        primaryPayer,
        secondaryPayer,
        nhisMemberNo: nhisMember.trim(),
        insuranceCardNo: insuranceCard.trim(),
        visitReference: visitRef.trim(),
        notes: notes.trim(),
        charges: charges.map(({ rowId: _rowId, displayName: _dn, ...rest }) => rest),
      });
    },
    onSuccess: (bill) => {
      toast.success(`Bill ${bill.billNumber} issued`, {
        description: `${bill.items.length} charges · GH₵ ${(bill.totalMinor / 100).toFixed(2)}`,
      });
      qc.invalidateQueries({ queryKey: ["billing"] });
      router.push(`/billing?view=bills&billId=${bill.id}`);
    },
    onError: (e) => toast.error(showApiError(e, "Could not issue bill")),
  });

  const canCreate = useMemo(() => Boolean(patient) && charges.length > 0 && !create.isPending, [patient, charges.length, create.isPending]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Patient lookup</CardTitle>
          <CardDescription>
            Search by Patient ID (e.g. <span className="font-clinical">FAC-00001234-26</span>), full name, or phone number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Patient ID, name, or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-md font-clinical"
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
            <Button type="button" onClick={() => runSearch()} disabled={searching}>
              <Search className="mr-1.5 h-4 w-4" />
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <PatientResultCard
                  key={r.id}
                  patient={patientSummaryToLegacyPatient(r)}
                  selected={patient?.id === r.id}
                  onSelect={() => setPatient(r)}
                  showBookButton={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {patient && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Bill header</CardTitle>
            <CardDescription>
              These details print on the receipt. Pricing for each charge is then resolved against the chosen payer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Primary payer *">
                <Select value={primaryPayer} onValueChange={setPrimaryPayer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PAYER_LABEL).map((p) => (
                      <SelectItem key={p} value={p}>{PAYER_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Secondary payer">
                <Select value={secondaryPayer} onValueChange={setSecondaryPayer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PAYER_LABEL).map((p) => (
                      <SelectItem key={p} value={p}>{PAYER_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Visit reference">
                <Input
                  value={visitRef}
                  onChange={(e) => setVisitRef(e.target.value)}
                  placeholder="V-2026-0001 / APP-2026-000123"
                  className="font-clinical"
                />
              </Field>
              <Field label="NHIS member number">
                <Input
                  value={nhisMember}
                  onChange={(e) => setNhisMember(e.target.value)}
                  className="font-clinical"
                />
              </Field>
              <Field label="Insurance card number">
                <Input
                  value={insuranceCard}
                  onChange={(e) => setInsuranceCard(e.target.value)}
                  className="font-clinical"
                />
              </Field>
              <Field label="Notes" className="md:col-span-2 lg:col-span-3">
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {patient && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Services rendered &amp; charges</CardTitle>
            <CardDescription>
              Add every service the patient received: lab tests, medications dispensed, imaging studies, consultation,
              theatre supplies, etc. Each line shows up on the receipt and feeds the Finance ledger.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChargeBuilder charges={charges} onChange={setCharges} defaultPayer={primaryPayer} />
          </CardContent>
        </Card>
      )}

      {patient && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {charges.length === 0 ? (
              "Add at least one charge to issue the bill."
            ) : (
              <>
                Issuing <span className="font-medium text-foreground">{charges.length} charge(s)</span> for{" "}
                <span className="font-medium text-foreground">
                  {patient.firstName} {patient.lastName}
                </span>{" "}
                · primary payer{" "}
                <span className="font-medium text-foreground">{PAYER_LABEL[primaryPayer]}</span>.
              </>
            )}
          </p>
          <Button onClick={() => create.mutate()} disabled={!canCreate}>
            {create.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FilePlus2 className="mr-1.5 h-4 w-4" />
            )}
            Issue bill
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
