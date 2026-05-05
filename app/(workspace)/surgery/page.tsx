import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

const SUB_NAV = [
  { label: "Schedule", view: "schedule", href: "/surgery?view=schedule" },
  { label: "Theatre Board", view: "board", href: "/surgery?view=board" },
  { label: "Recovery", view: "recovery", href: "/surgery?view=recovery" },
];

export default async function SurgeryPage() {
  await requireModuleAccess("surgery");
  return (
    <ClinicalServiceModuleWorkspace
      module="surgery"
      title="Theatre & Surgery"
      subtitle="Peri-operative scheduling, theatre logistics, and recovery handoffs."
      facilityServiceId="surgical_services"
      basePath="/surgery"
      subNav={SUB_NAV}
    />
  );
}
