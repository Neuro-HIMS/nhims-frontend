import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function MentalHealthPage() {
  await requireModuleAccess("mental-health");
  return <ClinicalServiceModuleWorkspace module="mental-health" />;
}
