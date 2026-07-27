"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReportIndexEntry } from "@/lib/research/reportSchema";
import { StatusBadge } from "./StatusBadge";
import { formatCountryDisplay, formatDateTime } from "@/lib/format";

const MAX_COMPARE = 4;

export function HistoryList({ entries }: { entries: ReportIndexEntry[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.country.toLowerCase().includes(q) || e.product.toLowerCase().includes(q)
    );
  }, [entries, query]);

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Delete the report for "${label}"? This can't be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSelected((prev) => prev.filter((selectedId) => selectedId !== id));
      router.refresh();
    } catch {
      window.alert("Could not delete this report. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev; // silently cap; button below explains the limit
      return [...prev, id];
    });
  }

  function goToCompare() {
    router.push(`/compare?ids=${selected.join(",")}`);
  }

  if (entries.length === 0) {
    return (
      <p className="mt-6 text-sm text-neutral-500">
        No reports generated yet. Fill in the form above to create your first one.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by country or product…"
          aria-label="Search report history"
          className="w-full flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:max-w-xs"
        />
        {selected.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">
              {selected.length} selected{selected.length >= MAX_COMPARE ? ` (max ${MAX_COMPARE})` : ""}
            </span>
            <button
              type="button"
              onClick={goToCompare}
              disabled={selected.length < 2}
              className="inline-flex items-center rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Compare selected
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs font-medium text-neutral-500 hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      {selected.length === 1 && (
        <p className="mt-2 text-xs text-neutral-500">Select at least one more report to compare.</p>
      )}

      {filtered.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">No reports match &quot;{query}&quot;.</p>
      ) : (
        <>
          {/* Mobile: stacked cards — a 4-column table would either overflow or
              squash unreadably on a narrow screen. */}
          <ul className="mt-3 space-y-2 sm:hidden">
            {filtered.map((entry) => {
              const comparable = entry.status === "done";
              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {comparable && (
                      <input
                        type="checkbox"
                        checked={selected.includes(entry.id)}
                        onChange={() => toggleSelected(entry.id)}
                        aria-label={`Select ${entry.country} — ${entry.product} for comparison`}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/reports/${entry.id}`} className="block active:opacity-70">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-neutral-900">
                            {formatCountryDisplay(entry.country)}
                          </span>
                          <StatusBadge status={entry.status} />
                        </div>
                        <p className="mt-1 text-sm text-neutral-700">{entry.product}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatDateTime(entry.createdAt)}
                          {entry.createdBy && <> · {entry.createdBy.email}</>}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id, `${entry.country} — ${entry.product}`)}
                        disabled={deletingId === entry.id}
                        className="mt-2 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deletingId === entry.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop / tablet: table. */}
          <div className="mt-3 hidden overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-3 font-medium">Country / market</th>
                  <th className="px-4 py-3 font-medium">Product / SKU</th>
                  <th className="px-4 py-3 font-medium">Generated</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((entry) => {
                  const comparable = entry.status === "done";
                  return (
                    <tr key={entry.id} className="group hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        {comparable && (
                          <input
                            type="checkbox"
                            checked={selected.includes(entry.id)}
                            onChange={() => toggleSelected(entry.id)}
                            aria-label={`Select ${entry.country} — ${entry.product} for comparison`}
                            className="h-4 w-4 rounded border-neutral-300"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/reports/${entry.id}`}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          {formatCountryDisplay(entry.country)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{entry.product}</td>
                      <td className="px-4 py-3 text-neutral-500">
                        <div>{formatDateTime(entry.createdAt)}</div>
                        {entry.createdBy && (
                          <div className="text-xs text-neutral-400">{entry.createdBy.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id, `${entry.country} — ${entry.product}`)}
                          disabled={deletingId === entry.id}
                          className="text-xs font-medium text-neutral-400 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === entry.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
