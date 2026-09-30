import { ClinicalServiceModuleWorkspace } from "@/components/clinical/clinical-service-module-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function BloodBankPage() {
  await requireModuleAccess("blood-bank");
  return <ClinicalServiceModuleWorkspace module="blood-bank" />;
}
