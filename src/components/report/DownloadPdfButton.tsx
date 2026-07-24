"use client";

/**
 * "Download PDF" via the browser's native print-to-PDF (memo rec #5: let the
 * user save/share a report). We deliberately avoid a heavy PDF library: the
 * report is already nicely laid out in HTML, and print CSS (see globals.css,
 * @media print) hides the chrome and keeps the colours, so "Save as PDF" from
 * the print dialog produces a clean, shareable document with zero extra deps
 * and no server round-trip.
 */
export function DownloadPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 print:hidden"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
      Download PDF
    </button>
  );
}
