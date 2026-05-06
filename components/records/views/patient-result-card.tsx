"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarPlus, ChevronRight, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/components/records/lib/records-types";

/**
 * Patient row used everywhere a patient is selected: search results,
 * appointment booking, finance billing. Encapsulates the avatar +
 * identifier strip + NHIS chip so the same shape renders consistently.
 */
export function PatientResultCard({
  patient,
  selected = false,
  onSelect,
  rightSlot,
  showBookButton = true,
  bookHref,
}: {
  patient: Patient;
  selected?: boolean;
  onSelect?: (p: Patient) => void;
  rightSlot?: ReactNode;
  showBookButton?: boolean;
  bookHref?: string;
}) {
  const initials = `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();
  const nhisActive = patient.nhisStatus === "active";
  const baseClasses = `patient-result-card ${selected ? "patient-result-card--selected" : ""}`;

  const bookLink =
    bookHref ?? `/appointments?view=book&patientPublicId=${encodeURIComponent(patient.patientId)}`;

  const inner = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="truncate font-medium text-foreground">
            {patient.firstName} {patient.lastName}
          </p>
          <Badge variant="outline" className="font-clinical text-[10px] uppercase">
            {patient.sex === "F" ? "Female" : patient.sex === "M" ? "Male" : patient.sex}
          </Badge>
        </div>
        <p className="patient-id mt-0.5 truncate">{patient.patientId}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span className="font-clinical">{patient.phone || "—"}</span>
          </span>
          <span>{patient.district || "—"}</span>
          {patient.dob && patient.dob !== "Unknown" && <span>DOB {patient.dob}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 self-start">
        <span className={`status-pill ${nhisActive ? "status-pill-active" : "status-pill-inactive"}`}>
          NHIS {nhisActive ? "Active" : "Inactive"}
        </span>
        {rightSlot}
        {showBookButton && (
          <Button
            asChild
            variant="outline"
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={bookLink}>
              <CalendarPlus className="mr-1 h-3.5 w-3.5" />
              Book
            </Link>
          </Button>
        )}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(patient)}
        className={`${baseClasses} w-full text-left`}
      >
        <div className="flex items-start gap-3">
          {inner}
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 self-center text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      <div className="flex items-start gap-3">{inner}</div>
    </div>
  );
}
