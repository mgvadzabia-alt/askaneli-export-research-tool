import { AuthForm } from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <AuthForm mode="signup" />
    </main>
  );
}
