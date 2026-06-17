# Design: Generic Blur/Scratchcard Engine

Status: **implemented (v2.0.0, "Haze")**. This documents the evolution of the
extension from a fixed set of rating-site stylesheets into a general-purpose
"blur anything on any site" tool, plus the tech-stack change that went with it.
The build lives in `entrypoints/` + `lib/` (WXT + TS + Biome); the original
per-site stylesheets remain in the git history (pre-2.0). Store copy: `STORE_LISTING.md`.

---

## 1. Vision

Today the extension blurs hardcoded rating selectors on 8 known sites via
per-site CSS. The goal is to generalize this so a user can **pick any element on
any site**, blur and/or scratchcard it, toggle it on/off, and have the effect
reveal on interaction - exactly the UX we have now, but user-defined and
universal.

The existing 8 sites don't go away: they become the **seed entries of a shared
community rule list** (see §5).

---

## 2. Core features

All "must haves" agreed in brainstorm:

- **Element picker** (uBlock-style):
  - Hover highlights the element under the cursor.
  - Live preview of the **generated selector**.
  - **Granularity walk**: move up/down the DOM tree before committing (slider /
    scroll-wheel / arrow keys), re-highlighting the candidate at each level.
  - **Editable selector field** so users can hand-fix brittle auto-selectors.
  - Commit only on an explicit "create" action, never the first click.
- **Per-rule effect**: `blur` / `scratchcard` / `both`, plus a **blur-intensity**
  value. (We already special-case `blur(24px)` for IMDb star icons - that becomes
  a per-rule knob.)
- **Reveal mode per rule**: `hover` (current default), `click-to-toggle`, or a
  `scratch` drag gesture (stretch - the scratchcard metaphor begs for it).
- **Toggle hierarchy**: global master switch (today's `show-ratings` class),
  per-site, and per-rule.

---

## 3. The containment problem (most important design constraint)

When rules overlap in the DOM, naive application produces "stacking garbage."
There are two distinct sub-problems:

### 3a. Pick-time: "the picker grabbed too deep"
Solved by the **granularity walk** in the picker (§2). The user dials in the
right level before a rule ever exists.

### 3b. Apply-time: overlapping rules break reveal
CSS `filter: blur()` on an **ancestor** already blurs its whole subtree. If a
rule blurs ancestor `A` and another blurs descendant `D` inside it:

- `D` is **double-blurred** (filters compound).
- **Hover-reveal breaks both ways**: hovering `A` clears `A` but `D` keeps its own
  filter → `D` stays blurred; hovering `D` can't clear because `A` still filters it.

So nesting silently kills the signature feature. **One effect per visual region
is mandatory.**

### Resolution: outermost-wins containment dedupe
- **Save time:** if a new rule's element contains / is contained by an existing
  rule's element, prompt: *replace / keep outer / cancel*. Intent stays explicit.
- **Apply time (the real guarantee):** compute **effective targets** = matched
  elements with **no other targeted element as an ancestor**. Only those get the
  effect. Inner matches are suppressed (rule stays stored, just not materialized).
  Hovering the outer reveals the whole region. No stacking, ever, regardless of
  how messy the rule set becomes. This also dedupes the scratchcard `::after`
  overlay so only the outermost gets the gray box.

---

## 4. Architecture

### 4.1 Hybrid CSS + JS (resolves the FOUC vs dedupe tension)

Two competing needs:

| Approach | Dynamic DOM (SPA) | Nesting dedupe | FOUC |
|---|---|---|---|
| Inject generated `<style>` from selectors | ✅ free | ❌ impossible in pure CSS | ✅ none |
| JS class-tagging + MutationObserver | needs observer | ✅ full control | ❌ flash before JS runs |

**Recommended: do both.**

1. **`document_start`**: inject a `<style>` built from all active selectors for
   the host → instant blur, **no flash of unblurred ratings**, auto-applies to
   dynamically-added elements with zero JS.
2. **JS + debounced MutationObserver**: only resolves containment. For each inner
   matched element, add a `.hr-suppressed` class; CSS `.hr-suppressed { filter:
   none !important }` cancels its blur + scratchcard. Outermost keeps the effect.

This gives no-FOUC + auto-dynamic + clean dedupe, and JS only touches the rare
nested cases instead of tagging every element.

### 4.2 Reuse from current code
- The blur + scratchcard CSS block becomes **one static rule set** keyed off
  `html:not(.show-ratings)` + a generic class, instead of duplicated across 8
  per-site files.
- The `show-ratings` toggle mechanism (`storage.onChanged` listener) is reused
  as-is for the global switch.

### 4.3 Storage schema (draft)
```jsonc
// user rules (storage.sync - small) + per-rule overrides of community rules
{
  "imdb.com": [
    { "selector": "[data-testid=\"hero-rating-bar__aggregate-rating\"]",
      "effect": "both",            // blur | scratchcard | both
      "intensity": 8,              // px
      "reveal": "hover",           // hover | click | scratch
      "enabled": true }
  ]
}
```
- Community rules ship **bundled** (in the package, not sync storage).
- User rules + per-rule disables layer on top. Disabling a community rule is a
  **toggle**, never a delete (so list updates don't resurrect it).

---

## 5. Shared / community config

Follows the **EasyList / uBlock filter-list model** (proven pattern):

- Bundled `rules.json` keyed by hostname; the current 8 sites are the seed.
- Contributors add/improve selectors via **PR**.
- **Export/import user rules as JSON** *is* the contribution pipeline: a user
  perfects rules for a site → exports → opens a PR.
- Precedence: community defaults < user rules; user can disable any community rule.
- **Bundled vs remote**: start bundled (no fetch, no host permission, easier store
  review). Remote auto-update is a later option (needs fetch + permission + trust).

---

## 6. Known hard problems / edge cases

- **Selector brittleness** (biggest long-term cost). Sites use hashed CSS-in-JS
  classes; we already work around it with `[class*="TitleBlock__RatingContainer"]`.
  The picker should **prefer stable anchors** (`data-testid`, `id`, semantic
  attributes) over hashed classes and rank candidates by stability. This makes or
  breaks community contributions.
- **`storage.sync` quota** (~100KB total, ~8KB/item). Keep the community list out
  of sync (it's bundled); sync only user rules. Large user sets may need
  `storage.local`.
- **Permissions / store review**: `<all_urls>` is a red flag. Prefer **optional
  host permissions** granted per-site on first pick (or `activeTab` + programmatic
  injection). See open questions.
- **Performance**: `querySelectorAll` per rule per mutation will melt heavy pages.
  Debounce the observer, scope queries, bail when the global toggle is off.
- **FOUC**: addressed by the hybrid (§4.1) - CSS must inject at `document_start`.

---

## 7. Tech stack change

Adopt the new stack **as part of the rewrite into the generic engine**, not as a
separate migration of the current trivial code.

- **WXT** - biggest payoff:
  - Generates the manifest from config (kills the giant hand-maintained Google
    domain list; eases the move to broad/optional host permissions).
  - **HMR for content scripts** - huge for iterating on the picker.
  - Free Chrome + Firefox builds (we already do `var browser = browser || chrome`).
- **TypeScript** - worth it once there's a real data model: the storage schema,
  picker ↔ content-script ↔ options messaging, and selector-generation logic.
- **Biome** - cheap lint/format; add it last, it's a nicety not an architectural
  driver.
- **Testing** - Playwright E2E against fixture pages for selector + containment
  regression (WXT supports this).

**Cost to acknowledge**: contributors now need Node + a build, where today they
need nothing. Justified by the engine; would be over-engineering without it.

---

## 8. Decisions & open questions

**Decided:**
1. **Positioning** - ✅ **New product identity.** "Hide Ratings" + its store
   listing undersell the generalized scope (spoilers, screen-share privacy, NSFW,
   counts). Ratings becomes community list #1, not the identity.
2. **Store listing** - ✅ **Reuse the existing Chrome listing in place** (rebrand
   the contents). Moot anyway: solo user today, no install base / reviews to
   preserve, so no reason to spin up a second listing. Keep "ratings" as a keyword
   in the new title/description for SEO continuity. Optional host perms (decision
   #3 below) means the rebrand update won't trigger a forced permission prompt.
3. **Name** - ✅ **Haze** (Deadlock hero; the word literally means visual blur).
   Chosen over Sombra/Veil because it self-describes the product, carries low
   trademark risk (generic dictionary word, not a coined character mark), and has
   weaker store-namespace incumbents. Contested but acceptable ("second place is
   ok"). See §11 for the namespace check that ruled out the alternatives.
4. **Build workflow** - ✅ When implementation starts, **build straight through to
   a finished product**; no mid-way check-ins. User tests once at the end.
2. **Backward compatibility** - ✅ **Migrate seamlessly**. On upgrade, seed
   settings from the community list so the 8 built-in sites keep working with no
   visible change.
3. **Permission model** - ✅ **Optional host permissions**, requested per-site at
   first pick, via dynamic `scripting.registerContentScripts`. No broad
   `<all_urls>` prompt; friendlier install + easier store review.

**Still open:**
4. **Reveal default for new rules**: hover (matches today) vs click. (Lean: hover.)
5. **Scratch-drag gesture**: v1 or defer to v2? (Lean: defer; hover/click first.)
6. **Community-list update cadence**: bundled-per-release only, or remote fetch
   later?

---

## 10. Adjacent use cases (beyond ratings)

The same engine (pick → blur/scratchcard → toggle → reveal) generalizes to any
"I don't want to see this until I choose to" scenario. Strongest candidates:

- **Spoilers** - sports scores/results, episode counts, plot points, forum/Reddit
  spoiler text, "who got eliminated." This is the biggest adjacent category and a
  natural fit for reveal-on-demand. Could be its own flagship community list.
- **Screen-sharing / recording privacy** - blur API keys, `.env` values, tokens,
  salaries, account balances, customer data while demoing or streaming. The
  toggle is the killer feature here: one click to hide everything sensitive.
- **NSFW / sensitive imagery** - `filter: blur()` works on `<img>` too; scratch
  to reveal. (User's suggestion - valid, same machinery.)
- **Anxiety / dopamine hygiene** - hide social like/follower/view counts,
  notification badges, unread counts (existing single-purpose extensions prove
  demand); reveal only when you actually want the number.
- **Anchoring avoidance** - hide prices while comparison shopping, or portfolio /
  stock balances, to reduce impulse and emotional reaction.

These don't need engine changes - just additional community lists. Suggests the
community-list system (§5) is the real platform; ratings is just list #1.

---

## 9. Suggested build order (de-risked)

1. **Prototype the engine only**: hybrid CSS inject + MutationObserver +
   outermost-wins suppression, **site-agnostic on all websites** (the engine is
   generic by design - no hardcoded hosts). Stress-test across the hard cases: a
   heavy SPA (IMDb), a static page, and an infinite-scroll feed. Prove no-FOUC, no
   stacking, working reveal *before* committing to the full stack.
2. Scaffold WXT + TS around the proven engine.
3. Build the picker (granularity walk + selector stability ranking).
4. Options UI: rule list, toggles, export/import.
5. Migrate the 8 sites into `rules.json`; backward-compat shim for old keys.

---

## 11. Name candidates (codename from anime / game / movie)

Theme to match: **conceal until revealed** - illusion, mist, cloak, stealth.

| Name | Source | Why it fits | Notes |
|---|---|---|---|
| **Mirage** | Apex Legends / FF | An illusion that isn't real and dissolves on a closer look | Very brandable; common word, check namespace |
| **Sombra** | Overwatch | Stealth + the "hack to reveal" mirrors hover-to-reveal exactly; "sombra" = shadow | Cool, brandable; common Spanish word |
| **Genjutsu** | Naruto | Illusion technique - what you see isn't really there | Distinctive codename; spelling is niche for a public name |
| **Kyoka** | Bleach (Kyōka Suigetsu, Aizen) | A blade that controls all perception / shows false things | Short, brandable, obscure-cool |
| **Obscura** | Camera obscura / HP "Obscurus" | Literally "to obscure"; ties to vision | Elegant; doubles as a real public name |
| **Predator/Cloak** | Predator | The cloak IS a shimmering blur - closest to the literal visual | "Cloak" plain; "Predator" trademarked |

Leaning: **Sombra** or **Kyoka** as a cool codename; **Mirage** or **Obscura** if
it should double as the public store name. Availability check (Chrome Web Store +
AMO + .com) pending before commit.
