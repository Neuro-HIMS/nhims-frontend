import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

const SUB_NAV = [
  { label: "Referrals", view: "referrals", href: "/physiotherapy?view=referrals" },
  { label: "Sessions", view: "sessions", href: "/physiotherapy?view=sessions" },
  { label: "Goals", view: "goals", href: "/physiotherapy?view=goals" },
];

export default async function PhysiotherapyPage() {
  await requireModuleAccess("physiotherapy");
  return (
    <ClinicalServiceModuleWorkspace
      module="physiotherapy"
      title="Physiotherapy & Rehabilitation"
      subtitle="Referrals, treatment sessions, and rehabilitation goals."
      facilityServiceId="physiotherapy"
      basePath="/physiotherapy"
      subNav={SUB_NAV}
    />
  );
}
