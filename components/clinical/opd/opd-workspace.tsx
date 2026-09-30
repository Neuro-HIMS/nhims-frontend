"use client";

import { useSearchParams } from "next/navigation";

import { ModuleSubNav } from "@/components/layouts/module-subnav";
import { PageCard } from "@/components/layouts/page-card";
import { ConsultationView } from "@/components/clinical/consultation/consultation-view";
import { OpdConsultQueue } from "@/components/clinical/opd/opd-consult-queue";
import { OpdFollowupPlanner } from "@/components/clinical/opd/opd-followup-planner";
import { OpdReferralsInbox } from "@/components/clinical/opd/opd-referrals-inbox";

const SUB_NAV = [
  { label: "Patients waiting", view: "queue", href: "/opd?view=queue" },
  { label: "Referrals", view: "referrals", href: "/opd?view=referrals" },
  { label: "Follow-ups", view: "followup", href: "/opd?view=followup" },
];

const VIEWS = ["queue", "consult", "referrals", "followup"];

/** Outpatient clinic: page → workspace → view. The consultation page (`view=consult`) replaces the tabs, like nurse triage. */
export function OpdWorkspace() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view");
  const view = requested && VIEWS.includes(requested) ? requested : "queue";

  if (view === "consult") return <ConsultationView />;

  return (
    <div className="space-y-4">
      <PageCard title="Outpatient clinic (OPD)" description="See patients, record notes and decide next steps." />
      <ModuleSubNav items={SUB_NAV} basePath="/opd" />
      <div className="pt-2">
        {view === "queue" && <OpdConsultQueue />}
        {view === "referrals" && <OpdReferralsInbox />}
        {view === "followup" && <OpdFollowupPlanner />}
      </div>
    </div>
  );
}
