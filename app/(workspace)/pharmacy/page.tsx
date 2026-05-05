import { requireModuleAccess } from "@/lib/auth-guards";
import { PharmacyWorkspace } from "@/components/pharmacy/pharmacy-workspace";

export default async function PharmacyPage() {
  await requireModuleAccess("pharmacy");
  return <PharmacyWorkspace />;
}
