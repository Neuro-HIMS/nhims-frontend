import { requireModuleAccess } from "@/lib/auth-guards";
import { NurseWorkspace } from "@/components/nurse/nurse-workspace";

export default async function NursePage() {
  await requireModuleAccess("nurse");
  return <NurseWorkspace />;
}
