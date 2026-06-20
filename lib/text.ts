// Sub-element text redaction. CSS can only target elements, so to blur a bare
// piece of text (e.g. a rating inside a `•`-joined line with no wrapper) we wrap
// the matching substrings in `<span>`s the engine's CSS can then style. See
// docs/DESIGN.md §3c.

/** Compile a user-supplied regex source, or null if it's invalid. */
function compile(source: string): RegExp | null {
  try {
    return new RegExp(source, "g");
  } catch {
    return null;
  }
}

/** Replace every non-empty match in a text node with a wrapping span. */
function wrapNode(node: Text, re: RegExp, spanClass: string): void {
  const text = node.nodeValue ?? "";
  const matches = [...text.matchAll(re)].filter((m) => m[0].length > 0);
  if (!matches.length) return;

  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of matches) {
    const start = m.index ?? 0;
    if (start > last) frag.append(text.slice(last, start));
    const span = document.createElement("span");
    span.className = spanClass;
    span.textContent = m[0];
    frag.append(span);
    last = start + m[0].length;
  }
  if (last < text.length) frag.append(text.slice(last));
  node.parentNode?.replaceChild(frag, node);
}

/**
 * Wrap regex matches in text nodes under every element matching `selector`.
 * Idempotent: text already inside a `spanClass` wrapper is skipped, so this can
 * run repeatedly (e.g. on DOM mutations) without re-wrapping or looping.
 */
export function wrapTextMatches(
  selector: string,
  source: string,
  spanClass: string,
): void {
  const re = compile(source);
  if (!re) return;

  let roots: Element[];
  try {
    roots = Array.from(document.querySelectorAll(selector));
  } catch {
    return;
  }

  for (const root of roots) {
    const targets: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = (n as Text).parentElement;
        if (!p || p.classList.contains(spanClass))
          return NodeFilter.FILTER_REJECT;
        if (p.tagName === "SCRIPT" || p.tagName === "STYLE")
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) targets.push(walker.currentNode as Text);
    for (const node of targets) wrapNode(node, re, spanClass);
  }
}

/** Unwrap every `spanClass` span, restoring the original text. */
export function unwrapTextMatches(spanClass: string): void {
  for (const span of document.querySelectorAll(`span.${spanClass}`)) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    if (parent instanceof Element) parent.normalize();
  }
}
