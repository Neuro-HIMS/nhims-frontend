import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

const SUB_NAV = [
  { label: "OP Clinic", view: "clinic", href: "/mental-health?view=clinic" },
  { label: "Reviews", view: "reviews", href: "/mental-health?view=reviews" },
  { label: "Care Plans", view: "plans", href: "/mental-health?view=plans" },
];

export default async function MentalHealthPage() {
  await requireModuleAccess("mental-health");
  return (
    <ClinicalServiceModuleWorkspace
      module="mental-health"
      title="Mental Health (Psychiatry OP)"
      subtitle="Outpatient mental health assessments, reviews, and collaborative care plans."
      facilityServiceId="mental_health"
      basePath="/mental-health"
      subNav={SUB_NAV}
    />
  );
}
