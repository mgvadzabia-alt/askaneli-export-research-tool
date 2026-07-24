import React from "react";

/**
 * Renders report narrative text with inline citation markers ([3], [3][7],
 * [3, 7]) turned into small superscript links that jump to the matching source
 * in the Sources list (id="source-3"). Everything else is rendered verbatim.
 *
 * The writing pass is instructed to append these markers to every sourced
 * claim, so this makes each claim traceable to a source at the point it's
 * made — instead of a bare source list at the bottom the reader has to
 * reconcile by hand (memo rec #2: "put the citation next to the claim").
 */

// Matches a run of one or more bracketed numbers, e.g. "[3]", "[3][7]",
// "[3, 7]" — captured so we can split the text around it. Global flag is
// needed for split(); a separate non-global copy is used for testing a
// segment (calling .test() on a /g regex is stateful and would misbehave in
// a map).
const CITATION_RUN_SPLIT = /((?:\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*)+)/g;
const CITATION_RUN_TEST = /^(?:\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*)+$/;
// Extracts each individual number from inside a matched run.
const NUMBER = /\d+/g;

function renderMarker(run: string, keyPrefix: string): React.ReactNode {
  const numbers = run.match(NUMBER) ?? [];
  return (
    <sup key={keyPrefix} className="ml-0.5 whitespace-nowrap">
      {numbers.map((n, i) => (
        <React.Fragment key={`${keyPrefix}-${i}`}>
          <a
            href={`#source-${n}`}
            className="text-[0.7em] font-medium text-blue-700 no-underline hover:underline"
            title={`Jump to source ${n}`}
          >
            [{n}]
          </a>
        </React.Fragment>
      ))}
    </sup>
  );
}

export function CitedText({ text }: { text: string }) {
  if (!text) return null;

  // Split into alternating [plain, marker, plain, marker, ...] segments.
  const parts = text.split(CITATION_RUN_SPLIT);

  return (
    <>
      {parts.map((part, i) =>
        part && CITATION_RUN_TEST.test(part) ? (
          renderMarker(part, `cite-${i}`)
        ) : (
          <React.Fragment key={`text-${i}`}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
