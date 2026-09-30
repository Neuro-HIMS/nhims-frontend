"use client";

import type { PatientDto } from "@/types/patients.types";

function sexLabel(sex: string) {
  if (sex === "M") return "Male";
  if (sex === "F") return "Female";
  return "Not recorded";
}

const LABEL = "text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/70";
const VALUE = "mt-0.5 font-medium text-brand-foreground";

/** Printable patient card — painted in the navy brand tokens (same family as the sidebar). */
export function HospitalPatientCard({ patient }: { patient: PatientDto }) {
  const hasLogo = Boolean(patient.facilityLogoDataUrl);

  return (
    <div data-print-area="hospital-card" className="relative mx-auto aspect-[1586/1000] w-full max-w-lg overflow-hidden rounded-2xl border border-sidebar-border bg-brand shadow-2xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sidebar-ring/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/40 blur-3xl" />

      <div className="relative flex h-full flex-col p-5 text-brand-foreground sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/70">Hospital card</p>
            {/* Explicit colour: the global h3 style would otherwise paint it dark on the navy card. */}
            <h3 className="mt-1 truncate text-base font-semibold leading-tight tracking-tight text-brand-foreground sm:text-lg">
              {patient.facilityName}
            </h3>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card shadow-inner">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs from facility settings
              <img src={patient.facilityLogoDataUrl!} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs font-bold text-brand">NHIMS</span>
            )}
          </div>
        </div>

        <div className="mt-4 grid flex-1 gap-3 text-sm">
          <div>
            <p className={LABEL}>Hospital number</p>
            <p className="mt-0.5 font-clinical text-lg font-semibold tracking-wide text-brand-foreground sm:text-xl">
              {patient.patientPublicId}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <p className={LABEL}>Age</p>
              <p className={VALUE}>{patient.ageDisplay}</p>
            </div>
            <div>
              <p className={LABEL}>Date of birth</p>
              <p className={VALUE}>{patient.dobDisplay}</p>
            </div>
            <div>
              <p className={LABEL}>Sex</p>
              <p className={VALUE}>{sexLabel(patient.sex)}</p>
            </div>
            <div>
              <p className={LABEL}>Phone</p>
              <p className={`${VALUE} truncate font-clinical`}>{patient.phone}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto h-10 rounded-md bg-sidebar-primary ring-1 ring-sidebar-border" />
      </div>
    </div>
  );
}
