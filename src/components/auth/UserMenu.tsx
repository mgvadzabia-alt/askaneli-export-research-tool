"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Shows the signed-in user's email and a sign-out button. */
export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm print:hidden">
      <span className="text-neutral-500">{email}</span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-60"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
