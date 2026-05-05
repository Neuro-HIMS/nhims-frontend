import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

const SUB_NAV = [
  { label: "Clinic Queue", view: "queue", href: "/dental?view=queue" },
  { label: "Charts", view: "charts", href: "/dental?view=charts" },
  { label: "Procedures", view: "procedures", href: "/dental?view=procedures" },
];

export default async function DentalPage() {
  await requireModuleAccess("dental");
  return (
    <ClinicalServiceModuleWorkspace
      module="dental"
      title="Dental Clinic"
      subtitle="Dental outpatient encounters and procedure documentation."
      facilityServiceId="dental"
      basePath="/dental"
      subNav={SUB_NAV}
    />
  );
}
