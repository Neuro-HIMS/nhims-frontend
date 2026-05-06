"use client";

import type { PatientDto } from "@/types/patients.types";

function sexLabel(sex: string) {
  if (sex === "M") return "Male";
  if (sex === "F") return "Female";
  return sex;
}

export function HospitalPatientCard({ patient }: { patient: PatientDto }) {
  const hasLogo = Boolean(patient.facilityLogoDataUrl);

  return (
    <div
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-600/80 shadow-2xl"
      style={{ aspectRatio: "1.586 / 1" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative flex h-full flex-col p-5 text-white sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Hospital card</p>
            <h3 className="mt-1 truncate text-base font-semibold leading-tight tracking-tight text-white sm:text-lg">
              {patient.facilityName}
            </h3>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/95 shadow-inner ring-1 ring-white/20">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs from facility settings
              <img src={patient.facilityLogoDataUrl!} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs font-bold text-slate-700">HMIS</span>
            )}
          </div>
        </div>

        <div className="mt-4 grid flex-1 gap-3 text-sm">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Patient ID</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-wide text-emerald-300/95 sm:text-xl">
              {patient.patientPublicId}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Age</p>
              <p className="mt-0.5 font-medium text-slate-100">{patient.ageDisplay}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Date of birth</p>
              <p className="mt-0.5 font-medium text-slate-100">{patient.dobDisplay}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Gender</p>
              <p className="mt-0.5 font-medium text-slate-100">{sexLabel(patient.sex)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Phone</p>
              <p className="mt-0.5 truncate font-mono text-xs font-medium text-slate-100 sm:text-sm">{patient.phone}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto h-10 rounded-md bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 ring-1 ring-black/40" />
      </div>
    </div>
  );
}
