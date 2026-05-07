"use client";

import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { OpdConsultQueue } from "@/components/clinical/opd/opd-consult-queue";
import { OpdFollowupPlanner } from "@/components/clinical/opd/opd-followup-planner";

const SUB_NAV = [
  { label: "Consult Queue", view: "queue", href: "/opd?view=queue" },
  { label: "Consultations", view: "consult", href: "/opd?view=consult" },
  { label: "Follow-up", view: "followup", href: "/opd?view=followup" },
];

/**
 * Outpatient Department workspace: live encounter queues plus follow-up planning backed by appointments.
 */
export function OpdWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "queue";

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Outpatient Department (OPD)</h1>
        <p className="text-sm text-muted-foreground">
          Consultation workflows for scheduled and walk-in outpatient visits.
        </p>
      </header>
      <ModuleSubNav items={SUB_NAV} basePath="/opd" />
      <div className="pt-2">
        {view === "queue" && <OpdConsultQueue />}
        {view === "consult" && <OpdConsultQueue sections="consult" />}
        {view === "followup" && <OpdFollowupPlanner />}
      </div>
    </div>
  );
}
