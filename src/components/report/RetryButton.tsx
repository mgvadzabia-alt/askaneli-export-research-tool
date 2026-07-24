"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryButton({
  country,
  product,
  language,
}: {
  country: string;
  product: string;
  language?: "en" | "ka";
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, product, language: language ?? "en" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start report generation");
      }
      const data = (await res.json()) as { id: string };
      router.push(`/reports/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleRetry}
        disabled={submitting}
        className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Starting new attempt…" : "Try again"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
