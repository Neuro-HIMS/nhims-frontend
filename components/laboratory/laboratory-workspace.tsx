"use client";

import { useSearchParams } from "next/navigation";

import { NoAccessNotice } from "@/components/common/no-access-notice";
import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { LaboratoryCatalogSetupView } from "@/components/laboratory/laboratory-catalog-setup";
import { LabCriticalView } from "@/components/laboratory/views/lab-critical-view";
import { LabDoneView } from "@/components/laboratory/views/lab-done-view";
import { LabFindView } from "@/components/laboratory/views/lab-find-view";
import { LabOrderView } from "@/components/laboratory/views/lab-order-view";
import { LabTodoView } from "@/components/laboratory/views/lab-todo-view";
import { canManageLabTests } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth.store";

const VIEWS = ["worklist", "results", "done", "critical", "search", "catalog"];

/** Laboratory: page → workspace → view. One test's page (`view=results&orderId=`) replaces the tabs. */
export function LaboratoryWorkspace() {
  const searchParams = useSearchParams();
  const role = useAuthStore((s) => s.user?.role);
  const requested = searchParams.get("view");
  const view = requested && VIEWS.includes(requested) ? requested : "worklist";

  const subNav = [
    { label: "To do", view: "worklist", href: "/laboratory?view=worklist" },
    { label: "Done today", view: "done", href: "/laboratory?view=done" },
    { label: "Critical today", view: "critical", href: "/laboratory?view=critical" },
    { label: "Find a patient", view: "search", href: "/laboratory?view=search" },
    ...(canManageLabTests(role) ? [{ label: "Tests and settings", view: "catalog", href: "/laboratory?view=catalog" }] : []),
  ];

  if (view === "results") return <LabOrderView />;

  return (
    <div className="space-y-4">
      <PageCard title="Laboratory" description="Collect samples, enter results and flag critical values." />
      <ModuleSubNav items={subNav} basePath="/laboratory" />
      <div className="pt-2">
        {view === "worklist" && <LabTodoView />}
        {view === "done" && <LabDoneView />}
        {view === "critical" && <LabCriticalView />}
        {view === "search" && <LabFindView />}
        {view === "catalog" && (canManageLabTests(role) ? <LaboratoryCatalogSetupView /> : <NoAccessNotice />)}
      </div>
    </div>
  );
}
