import { requireModuleAccess } from "@/lib/auth-guards";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";

export default async function ReportsPage() {
  await requireModuleAccess("reports");
  return <ReportsWorkspace />;
}
