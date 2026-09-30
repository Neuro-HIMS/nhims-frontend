import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function SurgeryPage() {
  await requireModuleAccess("surgery");
  return <ClinicalServiceModuleWorkspace module="surgery" />;
}
