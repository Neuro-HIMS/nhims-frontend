import { requireModuleAccess } from "@/lib/auth-guards";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";

export default async function DashboardPage() {
  await requireModuleAccess("dashboard");
  return <DashboardWorkspace />;
}
