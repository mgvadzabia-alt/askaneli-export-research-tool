"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateForm() {
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [product, setProduct] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!country.trim() || !product.trim()) {
      setError("Please enter both a country/market and a product/SKU.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: country.trim(), product: product.trim() }),
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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-neutral-700">
            Country / market
          </label>
          <input
            id="country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. Poland"
            disabled={submitting}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-100"
          />
        </div>
        <div>
          <label htmlFor="product" className="block text-sm font-medium text-neutral-700">
            Product / SKU
          </label>
          <input
            id="product"
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="e.g. TM GOCHA"
            disabled={submitting}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-100"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Starting research…" : "Generate Report"}
      </button>
      <p className="mt-2 text-xs text-neutral-500">
        A full report typically takes 10-15 minutes of real research. You&apos;ll be taken to
        its page and can watch it complete there, or check back later from the history list.
      </p>
    </form>
  );
}
