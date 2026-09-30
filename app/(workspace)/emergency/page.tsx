import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function EmergencyPage() {
  await requireModuleAccess("emergency");
  return <ClinicalServiceModuleWorkspace module="emergency" />;
}
