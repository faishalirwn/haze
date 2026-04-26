---
description: "Scaffold all files needed to add a new site to the Hide Ratings extension"
argument-hint: "Site display name, vendor key, and URL pattern(s) — e.g. 'Trakt, trakt, *://trakt.tv/*'"
agent: "agent"
tools: [fetch]
---

Add support for hiding ratings on a new site in this Chrome/Firefox extension.

The user will provide:
- **Display name** — the human-readable site name shown in the options UI (e.g. `Trakt`)
- **Vendor key** — the short lowercase identifier used in code/storage (e.g. `trakt`)
- **URL pattern(s)** — one or more match patterns for `content_scripts` (e.g. `*://trakt.tv/*`)

If any of these are missing, derive them from the argument or ask the user before proceeding.

## Steps

Make all five changes below. The vendor key string must be **identical** in all locations — a mismatch silently fails with no error.

### 0. Discover rating selectors (do this first)

Before writing any files, fetch representative pages from the site to identify HTML elements that display ratings. Typical pages to check:
- A movie/book/show detail page (has the main rating widget)
- A search results or list page (has inline rating badges)

Look for elements containing numeric scores, star icons, or rating bars. Extract CSS selectors using these strategies (prefer in this order):
1. `[data-testid="..."]` — most stable, survives redesigns
2. `[class*="Rating"]` / `[class*="Score"]` wildcard — catches obfuscated class names
3. Exact class name — only if the class looks stable (not hashed)

Collect all candidates into a list; you'll use them in step 2.

### 1. Create `js/{vendor}.js`

Single line only:

```js
initVendor('{vendor}');
```

### 2. Create `css/{vendor}.css`

Use the selectors discovered in step 0. See [css/imdb.css](../../css/imdb.css) for a real example.

```css
html:not(.show-ratings) .selector-a,
html:not(.show-ratings) [data-testid="rating-widget"],
html:not(.show-ratings) [class*="RatingContainer"] {
    display: none !important;
}
```

Rules:
- Use `display: none !important` by default
- Use `visibility: hidden !important` only when removing the element would break page layout
- Group all selectors into a single rule block

### 3. Update `options.html`

Add a new `<div class="toggle-item">` before the `<div id="status_box"...>` line:

```html
        <div class="toggle-item">
            <span class="txt">Hide <strong>{Display Name}</strong> ratings</span>
            <div id="{vendor}_toggle" class="toggle"></div>
        </div>
```

### 4. Update `manifest.json`

Add a new entry to the `content_scripts` array:

```json
{
    "matches": ["{url_pattern}"],
    "js": ["js/common.js", "js/{vendor}.js"],
    "css": ["css/{vendor}.css"]
}
```

Also add the URL pattern(s) to the `host_permissions` array if not already present.

### 5. Update `js/options.js`

Add the vendor key to `sourcesDefault` (default `false` = hidden on install):

```js
'{vendor}': false,
```

## Verification checklist

After making all changes, confirm:
- [ ] `initVendor('{vendor}')` in `js/{vendor}.js` matches the key in `sourcesDefault`
- [ ] `id="{vendor}_toggle"` in `options.html` matches the key in `sourcesDefault`
- [ ] CSS file exists at `css/{vendor}.css`
- [ ] `manifest.json` `content_scripts` entry references all three files
