import { RoleAssignmentPage } from "@/components/users/role-assignment-page";
import { requireModuleAccess } from "@/lib/auth-guards";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function Page({ params }: PageProps) {
  await requireModuleAccess("users");
  const { userId } = await params;
  return <RoleAssignmentPage userId={userId} />;
}
