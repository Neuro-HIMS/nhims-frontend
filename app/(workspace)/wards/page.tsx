import { requireModuleAccess } from "@/lib/auth-guards";
import { WardsWorkspace } from "@/components/wards/wards-workspace";

export default async function WardsPage() {
  await requireModuleAccess("wards");
  return <WardsWorkspace />;
}
