import { requireModuleAccess } from "@/lib/auth-guards";
import { FinanceWorkspace } from "@/components/finance/finance-workspace";

export default async function FinancePage() {
  await requireModuleAccess("finance");
  return <FinanceWorkspace />;
}
