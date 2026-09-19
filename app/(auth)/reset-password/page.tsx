import { ResetPasswordForm } from "@/components/layouts/reset-password-form";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="login-hero flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <ResetPasswordForm token={token ?? null} />
      </div>
    </main>
  );
}
