"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { Button } from "@/components/ui/button";
import { AdmitDialog } from "@/components/wards/admit-dialog";
import { AdmissionView } from "@/components/wards/views/admission-view";
import { AdmissionsView } from "@/components/wards/views/admissions-view";
import { BedBoardView } from "@/components/wards/views/bed-board-view";
import { GoingHomeView } from "@/components/wards/views/going-home-view";
import { canAdmitAndDischarge } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth.store";

const SUB_NAV = [
  { label: "Beds", view: "beds", href: "/wards?view=beds" },
  {
    label: "Patients on the ward",
    view: "admissions",
    href: "/wards?view=admissions",
  },
  { label: "Going home", view: "discharge", href: "/wards?view=discharge" },
];

// Old links: the MAR/TPR tab is now each patient's "Ward care".
const ALIASES: Record<string, string> = { nursing: "admissions" };
const VIEWS = ["beds", "admissions", "discharge", "admission"];

/** Wards: page → workspace → view. One patient's stay (`view=admission&admissionId=`) replaces the tabs. */
export function WardsWorkspace() {
  const role = useAuthStore((s) => s.user?.role);
  const [admitting, setAdmitting] = useState(false);
  const raw = useSearchParams().get("view") ?? "beds";
  const requested = ALIASES[raw] ?? raw;
  const view = VIEWS.includes(requested) ? requested : "beds";

  if (view === "admission") return <AdmissionView />;

  return (
    <div className="space-y-4">
      <PageCard
        title="Wards"
        description="Beds, patients on the ward, their medicines and observations, and discharges."
        actions={
          canAdmitAndDischarge(role) ? (
            <Button onClick={() => setAdmitting(true)}>Admit a patient</Button>
          ) : undefined
        }
      />
      <ModuleSubNav items={SUB_NAV} basePath="/wards" />
      <div className="pt-2">
        {view === "beds" && <BedBoardView />}
        {view === "admissions" && <AdmissionsView />}
        {view === "discharge" && <GoingHomeView />}
      </div>
      <AdmitDialog open={admitting} onOpenChange={setAdmitting} />
    </div>
  );
}
