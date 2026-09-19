import { UsersManagementWorkspace } from "@/components/users/users-management-workspace";
import { requireModuleAccess } from "@/lib/auth-guards";

export default async function Page() {
  const session = await requireModuleAccess("users");

  return <UsersManagementWorkspace facilityName={session.user.facilityName} />;
}

