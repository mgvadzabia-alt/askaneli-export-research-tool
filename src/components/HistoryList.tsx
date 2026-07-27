import Link from "next/link";
import type { ReportIndexEntry } from "@/lib/research/reportSchema";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/format";

export function HistoryList({ entries }: { entries: ReportIndexEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="mt-6 text-sm text-neutral-500">
        No reports generated yet. Fill in the form above to create your first one.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {/* Mobile: stacked cards — a 4-column table would either overflow or
          squash unreadably on a narrow screen. */}
      <ul className="space-y-2 sm:hidden">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/reports/${entry.id}`}
              className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm active:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-neutral-900">{entry.country}</span>
                <StatusBadge status={entry.status} />
              </div>
              <p className="mt-1 text-sm text-neutral-700">{entry.product}</p>
              <p className="mt-1 text-xs text-neutral-500">{formatDateTime(entry.createdAt)}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop / tablet: table. */}
      <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Country / market</th>
              <th className="px-4 py-3 font-medium">Product / SKU</th>
              <th className="px-4 py-3 font-medium">Generated</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/reports/${entry.id}`} className="font-medium text-neutral-900 hover:underline">
                    {entry.country}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-700">{entry.product}</td>
                <td className="px-4 py-3 text-neutral-500">{formatDateTime(entry.createdAt)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={entry.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
