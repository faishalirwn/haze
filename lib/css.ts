import type { Rule } from "./types";

export const ACTIVE_CLASS = "haze-active";
export const SUPPRESSED_CLASS = "haze-suppressed";
export const REVEALED_CLASS = "haze-revealed";

/** Split a comma-separated selector group into individual selectors. */
export function splitSelector(selector: string): string[] {
  return selector
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Every individual selector across a set of rules (for match collection). */
export function allSelectorParts(rules: Rule[]): string[] {
  return rules.flatMap((r) => splitSelector(r.selector));
}

function blurFilter(rule: Rule): string {
  return `blur(${rule.intensity}px)${rule.grayscale ? " grayscale(1)" : ""}`;
}

function revealedFilter(rule: Rule): string {
  return rule.grayscale ? "blur(0) grayscale(0)" : "none";
}

/**
 * Generate the stylesheet for a set of rules. Everything is gated behind
 * `html.haze-active` so the global/site toggle is a single class flip.
 */
export function generateCss(rules: Rule[], defaultBg: string): string {
  const out: string[] = [];

  for (const rule of rules) {
    const bg = rule.bg ?? defaultBg;
    const wantsBlur = rule.effect === "blur" || rule.effect === "both";
    const wantsCard = rule.effect === "scratchcard" || rule.effect === "both";

    for (const part of splitSelector(rule.selector)) {
      const base = `html.${ACTIVE_CLASS} ${part}`;

      if (wantsBlur) {
        out.push(`${base}{filter:${blurFilter(rule)};transition:filter .2s}`);
        if (rule.reveal === "hover") {
          out.push(
            `${base}:hover{filter:${revealedFilter(rule)} !important;transition-delay:.3s !important}`,
          );
        } else {
          out.push(
            `${base}.${REVEALED_CLASS}{filter:${revealedFilter(rule)} !important}`,
          );
        }
      }

      if (wantsCard) {
        out.push(`${base}{position:relative}`);
        out.push(
          `${base}::after{content:'';position:absolute;inset:0;background:${bg};border-radius:4px;pointer-events:none;opacity:1;transition:opacity 0s}`,
        );
        if (rule.reveal === "hover") {
          out.push(
            `${base}:hover::after{opacity:0;transition:opacity .2s;transition-delay:.3s}`,
          );
        } else {
          out.push(
            `${base}.${REVEALED_CLASS}::after{opacity:0;transition:opacity .2s}`,
          );
        }
      }

      if (rule.reveal === "click") out.push(`${base}{cursor:pointer}`);
    }
  }

  // Containment dedupe: an inner matched element nested in another matched
  // element is suppressed (outermost-wins). See docs/DESIGN.md §3b.
  out.push(`html.${ACTIVE_CLASS} .${SUPPRESSED_CLASS}{filter:none !important}`);
  out.push(
    `html.${ACTIVE_CLASS} .${SUPPRESSED_CLASS}::after{display:none !important}`,
  );

  return out.join("\n");
}

/** Individual selectors of rules whose reveal mode is click. */
export function clickSelectorParts(rules: Rule[]): string[] {
  return allSelectorParts(rules.filter((r) => r.reveal === "click"));
}
