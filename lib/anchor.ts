// Label-anchored matching. CSS cannot select an element by a sibling's text, so
// "the value whose label is Score" - the ubiquitous `Label: value` row - is
// unreachable with a pure selector: every value shares the same classes and the
// rows reorder between pages. We resolve such matches in JS instead: among the
// elements a base CSS selector matches, keep only those immediately preceded by
// a label element whose text is the anchor. The engine tags the survivors with a
// per-rule marker class its normal CSS pipeline then styles, the same indirection
// the text-redaction feature uses. See docs/DESIGN.md §3d.

/** Strip a single trailing colon (ASCII or fullwidth) plus surrounding space. */
function asLabel(text: string): string | null {
  const m = text.trim().match(/^(.+?)\s*[:：]\s*$/);
  return m?.[1] ?? null;
}

/**
 * The label text that anchors `el`, or null. A label is the immediately
 * preceding element sibling whose text ends in a colon (e.g. `Score:`).
 * Requiring the colon keeps detection precise, so an ordinary preceding sibling
 * isn't mistaken for a label.
 */
export function labelOf(el: Element): string | null {
  const prev = el.previousElementSibling;
  if (!prev) return null;
  return asLabel(prev.textContent ?? "");
}

/** The anchor predicate: does `el`'s label equal `label`? */
export function matchesLabel(el: Element, label: string): boolean {
  return labelOf(el) === label;
}

/** Elements matching `selector` whose adjacent label is `label`. */
export function anchorMatches(selector: string, label: string): Element[] {
  let els: Element[];
  try {
    els = Array.from(document.querySelectorAll(selector));
  } catch {
    return [];
  }
  return els.filter((el) => matchesLabel(el, label));
}

/**
 * Marker class the engine assigns to a rule's anchored matches, so the CSS
 * pipeline can target them by a plain class. Sanitized to a CSS-safe token
 * because rule ids include `#` (community) or UUID hyphens.
 */
export function anchorClass(ruleId: string): string {
  return `haze-anchor-${ruleId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
