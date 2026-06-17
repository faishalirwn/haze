# Store Listing — Haze

Everything needed to publish on the Chrome Web Store (and Firefox AMO). Copy
fields directly from here.

---

## Name

```
Haze
```

(Optional, for SEO continuity with the old listing — Chrome allows a short
descriptor after the name:)

```
Haze — Blur & Hide Anything
```

## Category

`Productivity` (alternatively `Tools`).

## Summary / short description

Chrome limit: **132 characters**. Firefox "Summary": **250 characters**.

```
Blur, hide, or scratchcard anything on any site — spoilers, ratings, prices. Reveal on hover, toggle it all off in one click.
```

(123 characters.)

## Detailed description

```
Haze lets you blur, hide, or scratchcard any element on any website — and reveal it on demand.

Point at something you don't want to see, pick it, and Haze conceals it. Hover (or click) to peek. Flip the master switch to bring everything back instantly. Your rules are remembered per site.

WHAT IT'S FOR
• Spoilers — scores, episode counts, results, plot details
• Ratings & reviews — decide for yourself before you see the number
• Prices — shop without anchoring
• Social counts — hide likes, followers, view counts
• Screen-sharing privacy — blur API keys, balances, or personal info before you present
• Sensitive or NSFW imagery
• Anything else you'd rather not see until you choose to

HOW IT WORKS
• Click the Haze icon, then "Pick element to blur"
• Move your mouse to the target; use ↑ / ↓ to widen or tighten the selection
• Choose blur, scratchcard, or both — and hover or click to reveal
• Manage everything (per rule, per site, or globally) in the options page
• Export and import your rules as JSON

BUILT-IN RATING RULES
Haze is the successor to "Hide Ratings" and ships with ready-made rules for IMDb, Letterboxd, Trakt, MyAnimeList, AniList, Goodreads, Hardcover, and Google Search. Toggle any of them off if you don't want them.

PRIVACY
Haze does not collect, sell, or transmit any data. Your rules and settings live in your browser (synced by your browser account if you use sync). Haze only runs on sites you explicitly allow — it asks for access to a site the first time you pick an element there.
```

## Single purpose (required by Chrome)

```
Haze lets the user selectively conceal (blur, hide, or cover) elements they choose on web pages, and reveal those elements on demand. This is the extension's single purpose.
```

## Permission justifications (required by Chrome)

| Permission | Justification |
|---|---|
| `storage` | Save the user's blur rules and toggle settings, and sync them across the user's own devices via the browser. |
| `scripting` | Inject the concealment engine and the element-picker UI into pages the user has chosen to use Haze on. |
| `activeTab` | Run the element picker on the current tab when the user clicks the Haze toolbar button. |
| `host_permissions` (bundled rating sites) | Apply the built-in rating-blur rules automatically on the supported rating sites. |
| `optional_host_permissions` (`*://*/*`) | Requested **per-site, on demand** — only when the user picks an element on a new site — so their rule can run there and persist across reloads. Not requested up front. |

**Remote code:** None. All code is bundled in the package; nothing is fetched or
`eval`'d at runtime.

**Data usage disclosures (Chrome "Data safety" form):** check **none** —
Haze does not collect or transmit any user data. No analytics, no servers.

## Privacy policy (host this text and link it)

```
Haze does not collect, store on remote servers, sell, or share any personal or
browsing data. All settings and rules are stored locally in your browser using
the browser's storage API and are only synchronized through your own browser
account if you have sync enabled. Haze runs only on websites you explicitly
grant access to. There are no analytics, trackers, or external network requests.
```

---

## Visual assets checklist

Chrome Web Store:
- [ ] **Icon** — 128×128 PNG (already in `public/icon/128.png`).
- [ ] **Screenshots** — at least 1, up to 5. Size **1280×800** or **640×400** PNG/JPEG.
      Suggested shots:
  1. The element picker active on a page (highlight box + toolbar visible).
  2. A page with ratings blurred + one revealed on hover.
  3. The popup (master switch, site toggle, rule list).
  4. The options page (rules grouped by site, effect controls).
  5. A "screen-share privacy" example (blurred keys/numbers).
- [ ] **Small promo tile** — 440×280 PNG (optional but recommended).
- [ ] **Marquee promo** — 1400×560 PNG (optional).

Firefox AMO:
- [ ] At least 1 screenshot (any reasonable size).
- [ ] Icon 128×128 (reused).
- [ ] Summary ≤250 chars (above) + detailed description (reuse above).

## Build & submit

```bash
pnpm zip            # -> .output/haze-<version>-chrome.zip
pnpm zip:firefox    # -> .output/haze-<version>-firefox.zip
```

Upload the zip to the respective developer dashboard. The same extension ID
(`djfdaikneamfdgjpdhclphkanmccndep`) is reused for the Chrome listing, so the
update ships to existing installs (migration is automatic — see DESIGN.md §8).
```
```

## Notes for review

- The broad `*://*/*` optional permission is **never requested at install** — only
  when the user actively picks an element on a site (a clear user gesture). The
  bundled rating sites are the only up-front host permissions. Mention this in the
  reviewer notes to speed up review of the optional-host-permission usage.
