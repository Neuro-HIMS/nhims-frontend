import { requireModuleAccess } from "@/lib/auth-guards";
import { ANCWorkspace } from "@/components/anc/anc-workspace";

export default async function ANCPage() {
  await requireModuleAccess("anc");
  return <ANCWorkspace />;
}
