import { UsersManagementWorkspace } from "@/components/users/users-management-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function Page() {
  await requireModuleAccess("users");

  return <UsersManagementWorkspace />;
}

