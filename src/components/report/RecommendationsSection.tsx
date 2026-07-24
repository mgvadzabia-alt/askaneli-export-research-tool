import type { NextAction } from "@/lib/research/reportSchema";
import { Section } from "./Section";
import { CitedText } from "./CitedText";

/**
 * The "so what" recommended next actions. Rendered directly under the
 * executive summary (memo rec #3: "lead with the decision, not the appendix" —
 * whoever reads this is deciding whether to enter a market, so give them the
 * recommendation first and the evidence after).
 */
export function RecommendationsSection({ actions }: { actions: NextAction[] }) {
  if (!actions || actions.length === 0) return null;

  return (
    <Section title="Recommended next actions">
      <p className="mb-4 text-sm text-neutral-500">
        The decision, up front. Supporting evidence follows in the sections below.
      </p>
      <div className="space-y-3">
        {actions.map((action, i) => (
          <div key={i} className="rounded-lg border border-neutral-200 p-4">
            <p className="text-sm font-medium text-neutral-900">
              <CitedText text={action.action} />
            </p>
            <p className="mt-1 text-sm text-neutral-700">
              <span className="font-medium">Expected impact: </span>
              <CitedText text={action.expectedImpact} />
            </p>
            <p className="mt-1 text-sm text-neutral-700">
              <span className="font-medium">Timeline: </span>
              <CitedText text={action.timeline} />
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
