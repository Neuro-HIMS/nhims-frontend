"use client";

import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { ImagingReportsView } from "@/components/radiology/views/imaging-reports-view";
import { ImagingStudyView } from "@/components/radiology/views/imaging-study-view";
import { ImagingTodoView } from "@/components/radiology/views/imaging-todo-view";

const SUB_NAV = [
  { label: "To do", view: "worklist", href: "/radiology?view=worklist" },
  { label: "Reports", view: "reports", href: "/radiology?view=reports" },
];

const VIEWS = ["worklist", "reports", "study"];

/** Imaging (Radiology): page → workspace → view. One scan's page (`view=study&orderId=`) replaces the tabs. */
export function RadiologyWorkspace() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view");
  const view = requested && VIEWS.includes(requested) ? requested : "worklist";

  if (view === "study") return <ImagingStudyView />;

  return (
    <div className="space-y-4">
      <PageCard title="Imaging (Radiology)" description="Scans requested by doctors, and their reports." />
      <ModuleSubNav items={SUB_NAV} basePath="/radiology" />
      <div className="pt-2">
        {view === "worklist" && <ImagingTodoView />}
        {view === "reports" && <ImagingReportsView />}
      </div>
    </div>
  );
}
