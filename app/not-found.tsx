import Link from "next/link";
import { Compass } from "lucide-react";

import { getLandingPathForUser } from "@/lib/access-control";
import { getServerSession } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const session = await getServerSession();
  const homeHref = session ? getLandingPathForUser(session.user) : "/login";

  return (
    <main className="login-hero flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Compass className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">We couldn&apos;t find that page.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page may have moved, or the address may not be right.
        </p>
        <Button asChild className="mt-5">
          <Link href={homeHref}>Go to home</Link>
        </Button>
      </div>
    </main>
  );
}
