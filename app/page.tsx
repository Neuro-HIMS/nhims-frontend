import { redirect } from "next/navigation";
import { getLandingPathForUser } from "@/lib/access-control";
import { getServerSession } from "@/lib/auth-server";

export default async function Home() {
  const session = await getServerSession();
  if (session) {
    redirect(getLandingPathForUser(session.user));
  }
  redirect("/login");
}
