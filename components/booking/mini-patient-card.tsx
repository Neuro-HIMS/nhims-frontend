"use client";

import { Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Patient } from "@/components/records/lib/records-types";

/**
 * Compact patient identity strip used inside the booking dialog. The
 * full PatientResultCard is intentionally too tall for a modal header,
 * so this version trims to: avatar + name + public ID + sex/NHIS chips
 * and a single contact line. Always renders left-aligned so it sits
 * naturally on the top-left of the booking detail layout.
 */
export function MiniPatientCard({ patient }: { patient: Patient }) {
  const initials = `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();
  const nhisActive = patient.nhisStatus === "active";

  return (
    <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/30 px-2.5 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <p className="truncate text-sm font-medium leading-tight text-foreground">
            {patient.firstName} {patient.lastName}
          </p>
          <Badge variant="outline" className="px-1.5 py-0 font-clinical text-[9px] uppercase">
            {patient.sex === "F" ? "F" : patient.sex === "M" ? "M" : patient.sex}
          </Badge>
          <span
            className={`status-pill text-[9px] ${
              nhisActive ? "status-pill-active" : "status-pill-inactive"
            }`}
          >
            NHIS {nhisActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="patient-id mt-0.5 truncate text-[11px]">{patient.patientId}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate font-clinical">{patient.phone || "—"}</span>
          {patient.dob && patient.dob !== "Unknown" && (
            <span className="ml-1.5 shrink-0">DOB {patient.dob}</span>
          )}
        </p>
      </div>
    </div>
  );
}
