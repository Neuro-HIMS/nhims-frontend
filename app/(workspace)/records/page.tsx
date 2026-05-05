import { requireModuleAccess } from "@/lib/auth-guards";
import { RecordsWorkspace } from "@/components/records/records-workspace";

export default async function RecordsPage() {
  await requireModuleAccess("records");
  return <RecordsWorkspace />;
}
