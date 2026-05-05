import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

const SUB_NAV = [
  { label: "Consult Queue", view: "queue", href: "/opd?view=queue" },
  { label: "Consultations", view: "consult", href: "/opd?view=consult" },
  { label: "Follow-up", view: "followup", href: "/opd?view=followup" },
];

export default async function OpdPage() {
  await requireModuleAccess("opd");
  return (
    <ClinicalServiceModuleWorkspace
      module="opd"
      title="Outpatient Department (OPD)"
      subtitle="Consultation workflows for scheduled and walk-in outpatient visits."
      facilityServiceId="opd"
      basePath="/opd"
      subNav={SUB_NAV}
    />
  );
}
