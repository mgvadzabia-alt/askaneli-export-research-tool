"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";

export function GenerateForm() {
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [product, setProduct] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [language, setLanguage] = useState<"en" | "ka">("en");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when an identical, recent report already exists; lets the user open it
  // instead of waiting ~15 minutes for a duplicate.
  const [cacheHit, setCacheHit] = useState<{ id: string; createdAt: string } | null>(null);

  /** Kicks off a fresh report and navigates to it. */
  async function startGeneration() {
    setSubmitting(true);
    setError(null);
    setCacheHit(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: country.trim(),
          product: product.trim(),
          language,
          additionalInstructions: additionalInstructions.trim(),
        }),
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!country.trim() || !product.trim()) {
      setError("Please enter both a country/market and a product/SKU.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setCacheHit(null);
    // Check for an identical recent report before spending 15 minutes.
    try {
      const res = await fetch("/api/check-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: country.trim(),
          product: product.trim(),
          language,
          additionalInstructions: additionalInstructions.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        cached?: boolean;
        id?: string;
        createdAt?: string;
      };
      if (data.cached && data.id && data.createdAt) {
        setCacheHit({ id: data.id, createdAt: data.createdAt });
        setSubmitting(false);
        return;
      }
    } catch {
      // If the cache check itself fails, fall through to generating normally.
    }
    await startGeneration();
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

      <div className="mt-4">
        <label htmlFor="additionalInstructions" className="block text-sm font-medium text-neutral-700">
          Additional instructions <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <textarea
          id="additionalInstructions"
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          placeholder="e.g. Focus on the HoReCa channel, or compare specifically against Moldovan wines"
          disabled={submitting}
          maxLength={1500}
          rows={3}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-100"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Extra guidance for this specific report, e.g. a channel to focus on or a
          competitor to compare against. It can&apos;t make the model invent facts —
          if the guidance asks for something no real source supports, the report will
          flag it as a gap instead.
        </p>
      </div>

      <div className="mt-4">
        <span className="block text-sm font-medium text-neutral-700">Report language</span>
        <div className="mt-1 inline-flex rounded-md border border-neutral-300 p-0.5">
          {([
            { value: "en", label: "English" },
            { value: "ka", label: "ქართული" },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguage(option.value)}
              disabled={submitting}
              aria-pressed={language === option.value}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                language === option.value
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Research always uses international sources; this sets the language the
          final report is written in.
        </p>
      </div>

      {cacheHit && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
          <p className="font-medium text-blue-900">
            A recent report for this exact market already exists
          </p>
          <p className="mt-1 text-blue-800">
            Generated {formatDateTime(cacheHit.createdAt)}. Open it instead of waiting ~15
            minutes for a duplicate, or generate a fresh one anyway.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/reports/${cacheHit.id}`)}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Open existing report
            </button>
            <button
              type="button"
              onClick={startGeneration}
              disabled={submitting}
              className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate fresh report
            </button>
          </div>
        </div>
      )}

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
