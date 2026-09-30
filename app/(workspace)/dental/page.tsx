import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function DentalPage() {
  await requireModuleAccess("dental");
  return <ClinicalServiceModuleWorkspace module="dental" />;
}
