import { redirect } from "next/navigation";

import type { AppModule } from "@/types/auth.types";
import { canAccessWorkspaceModule, getLandingPathForUser } from "@/lib/access-control";
import { getServerSession } from "@/lib/auth-server";

export async function requireModuleAccess(module: AppModule) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (!canAccessWorkspaceModule(session.user, module)) {
    redirect(getLandingPathForUser(session.user));
  }

  return session;
}
