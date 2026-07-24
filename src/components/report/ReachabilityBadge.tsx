import type { SourceReachability } from "@/lib/research/reportSchema";

const CONFIG: Record<
  SourceReachability,
  { label: string; style: string; title: string }
> = {
  reachable: {
    label: "link ok",
    style: "bg-emerald-50 text-emerald-700 border-emerald-200",
    title: "This source URL responded successfully when checked.",
  },
  unreachable: {
    label: "link dead",
    style: "bg-red-50 text-red-700 border-red-200",
    title:
      "This source URL did not respond or returned an error when checked — verify it manually before relying on it.",
  },
  unchecked: {
    label: "unchecked",
    style: "bg-neutral-100 text-neutral-500 border-neutral-200",
    title: "No URL was provided or the link check did not run.",
  },
};

export function ReachabilityBadge({
  reachability,
  httpStatus,
}: {
  reachability?: SourceReachability;
  httpStatus?: number;
}) {
  // Older reports generated before link-checking existed have no reachability field.
  if (!reachability) return null;

  const config = CONFIG[reachability];
  const title =
    httpStatus && reachability !== "unchecked"
      ? `${config.title} (HTTP ${httpStatus})`
      : config.title;

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.style}`}
    >
      {config.label}
    </span>
  );
}
