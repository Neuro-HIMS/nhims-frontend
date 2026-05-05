import { requireModuleAccess } from "@/lib/auth-guards";
import { BillingWorkspace } from "@/components/billing/billing-workspace";

export default async function BillingPage() {
  await requireModuleAccess("billing");
  return <BillingWorkspace />;
}
