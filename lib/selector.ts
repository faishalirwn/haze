// Selector generation + stability ranking for the picker. Goal: prefer stable
// anchors (data-testid, semantic ids/classes) over hashed CSS-in-JS classes so
// generated rules survive page reloads and re-renders. See docs/DESIGN.md §6.

const TEST_ATTRS = [
  "data-testid",
  "data-test",
  "data-test-id",
  "data-qa",
  "data-cy",
  "data-component",
  "itemprop",
  "name",
];

/** Heuristic: does this class look like a hashed / generated name? */
export function isHashedClass(cls: string): boolean {
  if (cls.length > 25) return true;
  // CSS-modules style: Foo__bar___aB3xY or Foo_bar_aB3
  if (/[_-][a-z0-9]{5,}$/i.test(cls) && /[A-Z0-9]/.test(cls)) return true;
  // styled-components / emotion: sc-xxxxx, css-1q2w3e
  if (/^(sc-|css-|jsx-|emotion-)/i.test(cls)) return true;
  // long digit runs are usually generated
  if (/\d{4,}/.test(cls)) return true;
  // mostly-random looking token with mixed case + digits, no separators
  if (
    cls.length >= 8 &&
    /[A-Z]/.test(cls) &&
    /\d/.test(cls) &&
    !/[-_]/.test(cls)
  )
    return true;
  return false;
}

export function isHashedId(id: string): boolean {
  if (/\d{4,}/.test(id)) return true;
  if (id.length >= 12 && /\d/.test(id) && !/[-_]/.test(id)) return true;
  if (/^(ember|react|radix|mui|:r)/i.test(id)) return true;
  return false;
}

function stableClasses(el: Element): string[] {
  return Array.from(el.classList).filter((c) => !isHashedClass(c));
}

export function matchCount(selector: string): number {
  try {
    return document.querySelectorAll(selector).length;
  } catch {
    return 0;
  }
}

/** Is this a syntactically valid CSS selector? (Not whether it matches anything.) */
export function isValidSelector(selector: string): boolean {
  if (!selector.trim()) return false;
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

function isUnique(selector: string): boolean {
  return matchCount(selector) === 1;
}

function nthOfType(el: Element): number {
  let n = 1;
  let sib = el.previousElementSibling;
  while (sib) {
    if (sib.tagName === el.tagName) n++;
    sib = sib.previousElementSibling;
  }
  return n;
}

function segmentFor(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const classes = stableClasses(el);
  let seg = tag;
  if (classes.length) {
    seg += `.${classes.map((c) => CSS.escape(c)).join(".")}`;
  }
  return seg;
}

/**
 * Generate a reasonably stable, unique-ish CSS selector for an element.
 * Tries id, then test attributes, then a child-combinator path with stable
 * classes, adding :nth-of-type only where needed for uniqueness.
 */
export function generateSelector(el: Element): string {
  // 1. Stable, unique id.
  if (el.id && !isHashedId(el.id)) {
    const sel = `#${CSS.escape(el.id)}`;
    if (isUnique(sel)) return sel;
  }

  // 2. Stable test attribute.
  for (const attr of TEST_ATTRS) {
    const val = el.getAttribute(attr);
    if (val) {
      const sel = `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(val)}"]`;
      if (isUnique(sel)) return sel;
    }
  }

  // 3. Build a path from the element upward.
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement && cur !== document.body) {
    let seg = segmentFor(cur);

    // Disambiguate among same-tag siblings when class info is insufficient.
    const par: Element | null = cur.parentElement;
    if (par) {
      const sameSeg = Array.from(par.children).filter(
        (c) => segmentFor(c) === seg,
      );
      if (sameSeg.length > 1) seg += `:nth-of-type(${nthOfType(cur)})`;
    }

    parts.unshift(seg);
    const candidate = parts.join(" > ");
    if (isUnique(candidate)) return candidate;
    cur = par;
  }

  return parts.join(" > ");
}

/**
 * A broad, NON-unique selector that matches every element like this one - its
 * stable classes (e.g. `.media-card-rating`), so one pick can blur a whole grid.
 * Falls back to a shared attribute, then the bare tag.
 */
export function generalizedSelector(el: Element): string {
  const classes = stableClasses(el);
  if (classes.length) return classes.map((c) => `.${CSS.escape(c)}`).join("");
  for (const attr of TEST_ATTRS) {
    const val = el.getAttribute(attr);
    if (val) return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(val)}"]`;
  }
  return el.tagName.toLowerCase();
}

/** Selectors for the element and each of its ancestors (for the granularity walk). */
export function ancestorChain(el: Element): Element[] {
  const chain: Element[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement) {
    chain.push(cur);
    cur = cur.parentElement;
  }
  return chain;
}
