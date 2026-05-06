import { OpdWorkspace } from "@/components/clinical/opd/opd-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function OpdPage() {
  await requireModuleAccess("opd");
  return <OpdWorkspace />;
}
