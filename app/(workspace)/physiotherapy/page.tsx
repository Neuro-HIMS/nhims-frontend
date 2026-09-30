import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function PhysiotherapyPage() {
  await requireModuleAccess("physiotherapy");
  return <ClinicalServiceModuleWorkspace module="physiotherapy" />;
}
