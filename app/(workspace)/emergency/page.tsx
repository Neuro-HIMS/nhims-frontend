import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

const SUB_NAV = [
  { label: "Board", view: "board", href: "/emergency?view=board" },
  { label: "Triage", view: "triage", href: "/emergency?view=triage" },
  { label: "Handoff", view: "handoff", href: "/emergency?view=handoff" },
];

export default async function EmergencyPage() {
  await requireModuleAccess("emergency");
  return (
    <ClinicalServiceModuleWorkspace
      module="emergency"
      title="Accident & Emergency (A&E)"
      subtitle="Emergency front door — assessments, triage, stabilisation, and disposition."
      facilityServiceId="emergency"
      basePath="/emergency"
      subNav={SUB_NAV}
    />
  );
}
