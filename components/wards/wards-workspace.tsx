"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BedDouble } from "lucide-react";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SUB_NAV = [
  { label: "Bed Board", view: "beds", href: "/wards?view=beds" },
  { label: "Admissions", view: "admissions", href: "/wards?view=admissions" },
  { label: "Discharge", view: "discharge", href: "/wards?view=discharge" },
];

export function WardsWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "beds";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Ward Management</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Inpatient bed allocation, admissions, and discharge coordination.
        </p>
      </div>
      <ModuleSubNav items={SUB_NAV} basePath="/wards" />
      <div className="pt-2">
        {view === "beds" && <BedBoardView />}
        {view === "admissions" && <AdmissionsView />}
        {view === "discharge" && <DischargeView />}
      </div>
    </div>
  );
}

function BedBoardView() {
  const wards = WARDS_DATA;
  return (
    <div className="space-y-6">
      {wards.map((ward) => (
        <div key={ward.name}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{ward.name}</h2>
            <span className="text-sm text-muted-foreground">
              {ward.beds.filter((b) => b.occupied).length}/{ward.beds.length} occupied
            </span>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
            {ward.beds.map((bed) => (
              <div
                key={bed.number}
                className={`rounded-lg border p-3 text-center text-sm ${
                  bed.occupied
                    ? "border-[hsl(var(--clinical-semi-urgent))] bg-[hsl(var(--clinical-semi-urgent-bg))]"
                    : "border-[hsl(var(--clinical-routine))] bg-[hsl(var(--clinical-routine-bg))]"
                }`}
              >
                <BedDouble className={`mx-auto mb-1 h-5 w-5 ${bed.occupied ? "text-[hsl(var(--clinical-semi-urgent))]" : "text-[hsl(var(--clinical-routine))]"}`} />
                <p className="font-semibold text-foreground">{bed.number}</p>
                {bed.occupied ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{bed.patient}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-[hsl(var(--clinical-routine))]">Available</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdmissionsView() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Patient</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Ward / Bed</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Admitted</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Diagnosis</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Clinician</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ADMISSIONS.map((a) => (
            <tr key={a.id} className="table-row-interactive">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{a.patient}</p>
                <p className="patient-id mt-0.5">{a.patientId}</p>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{a.ward} · Bed {a.bed}</td>
              <td className="px-4 py-3 font-clinical text-xs text-muted-foreground">{a.admittedDate}</td>
              <td className="px-4 py-3 text-sm text-foreground">{a.diagnosis}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{a.clinician}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DischargeView() {
  return (
    <div className="space-y-3">
      {ADMISSIONS.filter((a) => a.readyForDischarge).map((a) => (
        <div key={a.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{a.patient}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{a.ward} · Bed {a.bed} · {a.diagnosis}</p>
          </div>
          <Button variant="outline" size="sm">Discharge</Button>
        </div>
      ))}
      {ADMISSIONS.filter((a) => !a.readyForDischarge).map((a) => (
        <div key={a.id} className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4 opacity-60">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{a.patient}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{a.ward} · Bed {a.bed} · Admitted {a.admittedDate}</p>
          </div>
          <Badge variant="outline">Ongoing care</Badge>
        </div>
      ))}
    </div>
  );
}

const WARDS_DATA = [
  {
    name: "Ward A — General",
    beds: [
      { number: "A01", occupied: true, patient: "K. Mensah" },
      { number: "A02", occupied: true, patient: "Y. Darko" },
      { number: "A03", occupied: false, patient: "" },
      { number: "A04", occupied: true, patient: "A. Kusi" },
      { number: "A05", occupied: false, patient: "" },
      { number: "A06", occupied: true, patient: "B. Ofori" },
      { number: "A07", occupied: false, patient: "" },
      { number: "A08", occupied: true, patient: "E. Baffoe" },
    ],
  },
  {
    name: "Ward B — Maternity",
    beds: [
      { number: "B01", occupied: true, patient: "A. Osei" },
      { number: "B02", occupied: true, patient: "G. Appiah" },
      { number: "B03", occupied: true, patient: "D. Amoah" },
      { number: "B04", occupied: false, patient: "" },
      { number: "B05", occupied: true, patient: "F. Ankrah" },
      { number: "B06", occupied: false, patient: "" },
    ],
  },
];

const ADMISSIONS = [
  { id:"adm1", patient:"Kwame Mensah", patientId:"GH-2026-01774", ward:"Ward A", bed:"A01", admittedDate:"2026-05-01", diagnosis:"Pneumonia", clinician:"Dr. Boateng", readyForDischarge:true },
  { id:"adm2", patient:"Abena Osei", patientId:"GH-2026-03109", ward:"Ward B", bed:"B01", admittedDate:"2026-05-02", diagnosis:"Labour — Active", clinician:"Midwife Adwoa", readyForDischarge:false },
  { id:"adm3", patient:"Yaw Darko", patientId:"GH-2025-99201", ward:"Ward A", bed:"A02", admittedDate:"2026-04-29", diagnosis:"Diabetic ketoacidosis", clinician:"Dr. Asante", readyForDischarge:true },
];
