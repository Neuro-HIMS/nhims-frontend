import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/layouts/login-form";
import { getLandingPathForUser } from "@/lib/access-control";
import { getServerSession } from "@/lib/auth-server";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    if (session.user.mustChangePassword) {
      redirect("/change-password");
    }
    redirect(getLandingPathForUser(session.user));
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="login-hero flex min-h-screen flex-col items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-xl text-center">
          <Image
            src="/assets/nhims-logo.png"
            alt="Neuro Health Information System logo"
            width={900}
            height={520}
            className="mx-auto h-auto w-full max-w-[520px] object-contain"
            priority
          />
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-white p-6 lg:p-10">
        <div className="w-full max-w-[520px] space-y-5">
          <LoginForm /> 
        </div>
      </section>
    </main>
  );
}
