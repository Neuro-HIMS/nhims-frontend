"use client";

import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { ClientLookupView } from "@/components/records/views/client-lookup-view";
import { RECORDS_NAV } from "@/components/records/lib/records-data";
import { RecordsFlowHeader } from "@/components/records/shared/records-flow-header";
import { RegistrationView } from "@/components/records/views/registration-view";
import { PatientRecordsManagementView } from "@/components/records/views/patient-records-management-view";
import { VisitHistoryView } from "@/components/records/views/visit-history-view";

export function RecordsWorkspace() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "search";

  return (
    <div className="space-y-4">
      <RecordsFlowHeader />
      <ModuleSubNav items={RECORDS_NAV} basePath="/records" />

      <div className="pt-1">
        {view === "search" && <ClientLookupView />}
        {view === "register" && <RegistrationView />}
        {view === "manage" && <PatientRecordsManagementView />}
        {view === "visits" && <VisitHistoryView />}
      </div>
    </div>
  );
}


