"use client";

import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { NURSE_NAV } from "@/components/nurse/lib/nurse-data";
import { VisitsQueueView } from "@/components/nurse/views/visits-queue-view";
import { NurseSearchView } from "@/components/nurse/views/nurse-search-view";
import { TriageView } from "@/components/nurse/views/triage-view";
import { PatientFolderView } from "@/components/nurse/views/patient-folder-view";

export function NurseWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "visits";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nurse Station</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Today's visits, triage, vitals, and patient folder management.
        </p>
      </div>

      <ModuleSubNav items={NURSE_NAV} basePath="/nurse" />

      <div className="pt-2">
        {view === "visits" && <VisitsQueueView />}
        {view === "search" && <NurseSearchView />}
        {view === "triage" && <TriageView />}
        {view === "folder" && <PatientFolderView />}
      </div>
    </div>
  );
}
