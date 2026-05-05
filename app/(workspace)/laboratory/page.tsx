import { requireModuleAccess } from "@/lib/auth-guards";
import { LaboratoryWorkspace } from "@/components/laboratory/laboratory-workspace";

export default async function LaboratoryPage() {
  await requireModuleAccess("laboratory");
  return <LaboratoryWorkspace />;
}
