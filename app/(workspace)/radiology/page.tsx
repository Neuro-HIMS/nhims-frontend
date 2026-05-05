import { requireModuleAccess } from "@/lib/auth-guards";
import { RadiologyWorkspace } from "@/components/radiology/radiology-workspace";

export default async function RadiologyPage() {
  await requireModuleAccess("radiology");
  return <RadiologyWorkspace />;
}
