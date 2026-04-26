# Hide Ratings – Agent Instructions

Chrome/Firefox extension (Manifest V3) that hides rating elements on IMDB, Goodreads, MyAnimeList, Letterboxd, and Google search results using CSS class toggling.

## Architecture

```
manifest.json          – Registers content scripts and extension metadata
js/common.js           – Core logic: initVendor(), toggleDocumentClass(), storage sync
js/{vendor}.js         – One-liner per site: initVendor('vendor-name')
css/{vendor}.css       – CSS rules: html:not(.show-ratings) selectors hide elements
options.html           – Popup UI (toggle switches per site); also the options page
js/options.js          – Reads/writes chrome.storage.sync; manages toggle state
```

## Adding a New Site

Four files must be created/updated — no other code changes needed:

1. **`js/{vendor}.js`** — single line: `initVendor('vendor');`
2. **`css/{vendor}.css`** — hide selectors under `html:not(.show-ratings) { display: none !important; }`
3. **`options.html`** — add `<div id="{vendor}_toggle" class="toggle"></div>` and a label
4. **`manifest.json`** — add `content_scripts` entry for the site URL(s) referencing both `js/common.js` and `js/{vendor}.js`, and the CSS file

Also add the vendor key (default `false`) to `sourcesDefault` in `js/options.js`.

## Key Conventions

**Vendor name consistency**: The string in `initVendor('x')` must match the storage key in `options.js` and the toggle element ID (`{vendor}_toggle`). A mismatch silently fails — no errors thrown.

**Boolean inversion in options.js**: Toggle `active` class = ratings are **hidden**; storage value `false` = ratings are **hidden**. Stored value is the inverse of the `active` class: `stored = !element.classList.contains('active')`.

**CSS-only hiding**: No DOM manipulation. `common.js` adds/removes the `show-ratings` class on `<html>`. All hiding is done via `html:not(.show-ratings)` CSS rules — this handles dynamically loaded content automatically.

**CSS selector strategies** (see [css/imdb.css](css/imdb.css) for examples):
- Class-based: `.ratings-bar`
- Data attribute: `[data-testid="hero-rating-bar__aggregate-rating"]`
- Wildcard: `[class*="RatingContainer"]` — useful for obfuscated/dynamic class names
- Use `display: none !important` by default; `visibility: hidden` when layout preservation is needed

**Browser compat**: `common.js` shims `var browser = browser || chrome;` — works in Chrome, Edge, and Firefox.

## No Build Step

This is a plain JS/CSS extension. Load it unpacked in `chrome://extensions` with Developer Mode enabled. No bundler, transpiler, or package manager involved.
