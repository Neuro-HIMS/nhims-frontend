import { requireModuleAccess } from "@/lib/auth-guards";
import { AuditLogWorkspace } from "@/components/audit-log/audit-log-workspace";

export default async function AuditLogPage() {
  await requireModuleAccess("audit-log");
  return <AuditLogWorkspace />;
}
