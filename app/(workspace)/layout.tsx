import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layouts/dashboard-shell";
import { getServerSession } from "@/lib/auth-server";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
