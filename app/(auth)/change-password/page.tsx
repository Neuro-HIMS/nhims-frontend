import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/layouts/change-password-form";
import { getLandingPathForUser } from "@/lib/access-control";
import { getServerSession } from "@/lib/auth-server";

export default async function ChangePasswordPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.mustChangePassword) {
    redirect(getLandingPathForUser(session.user));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <ChangePasswordForm />
      </div>
    </main>
  );
}
