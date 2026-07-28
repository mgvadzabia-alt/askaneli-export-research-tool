import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Authoritative check (verifies the cookie signature, unlike the proxy's
  // cheap presence check) — only redirect home if the session is genuinely
  // valid, so a stale/invalid cookie can never cause a redirect loop.
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <AuthForm mode="login" />
    </main>
  );
}
