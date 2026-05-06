"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { OpdConsultQueue } from "@/components/clinical/opd/opd-consult-queue";
import { OpdDiagnosisClassificationsView } from "@/components/clinical/opd/opd-diagnosis-classifications-view";

const SUB_NAV = [
  { label: "Consult Queue", view: "queue", href: "/opd?view=queue" },
  { label: "Consultations", view: "consult", href: "/opd?view=consult" },
  { label: "Classifications", view: "classifications", href: "/opd?view=classifications" },
  { label: "Follow-up", view: "followup", href: "/opd?view=followup" },
];

/**
 * Outpatient Department workspace. Phase 3 wires the consultation queue
 * to the real `/clinical/encounters` API; the remaining tabs continue to
 * stub UI until they're built out (consult shell + follow-up planner).
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
        {view === "consult" && (
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-medium text-foreground">Open the patient folder from the queue</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecting a patient on the <Link href="/opd?view=queue" className="text-primary underline-offset-4 hover:underline">Consult Queue</Link>
              {" "}opens the full clinical folder where the doctor records SOAP notes, places lab orders, and writes prescriptions.
            </p>
          </div>
        )}
        {view === "classifications" && <OpdDiagnosisClassificationsView />}
        {view === "followup" && (
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-medium text-foreground">Follow-up planner</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule patient return visits from the patient folder; a dedicated planner is on the roadmap.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
