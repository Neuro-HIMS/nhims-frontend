"use client";

import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
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
      {view !== "triage" && (
        <>
          <PageCard title="Nurse station" description="Today's patients, triage, vitals, and patient folders." />
          <ModuleSubNav items={NURSE_NAV} basePath="/nurse" />
        </>
      )}

      <div className={view !== "triage" ? "pt-2" : undefined}>
        {view === "visits" && <VisitsQueueView />}
        {view === "search" && <NurseSearchView />}
        {view === "triage" && <TriageView />}
        {view === "folder" && <PatientFolderView />}
      </div>
    </div>
  );
}
