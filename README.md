# Haze

[![Chrome](https://img.shields.io/chrome-web-store/users/djfdaikneamfdgjpdhclphkanmccndep.svg?style=flat-square&label=Chrome&logo=google%20chrome&logoColor=white)](https://chrome.google.com/webstore/detail/djfdaikneamfdgjpdhclphkanmccndep)

**Blur, hide, or scratchcard anything on any website.** Point at an element,
pick it, and Haze conceals it until you hover (or click) to reveal - then toggle
everything back on in one click.

Haze ships with bundled rules for popular rating sites (it's the successor to
*Hide Ratings*), but the engine is general: spoilers, prices, social counts,
sensitive data while screen-sharing - anything you don't want to see until you
choose to.

## Features

- **Element picker** - point, adjust granularity (↑/↓ the DOM tree), create a rule.
- **Three effects** - blur, scratchcard overlay, or both; adjustable intensity.
- **Reveal on demand** - hover or click to peek; the global switch hides/shows all.
- **Per-site & per-rule toggles** - fine-grained control in the options page.
- **Bundled rating rules** - IMDb, Letterboxd, Trakt, MyAnimeList, AniList,
  Goodreads, Hardcover, Google Search - contributable via PR.
- **Export / import** your rules as JSON.

## Permissions

Haze uses **optional host permissions**: it asks for access to a site only when
you first pick an element there. The bundled rating sites are granted at install.

## Development

Built with [WXT](https://wxt.dev) + TypeScript + Biome.

```bash
pnpm install
pnpm dev          # build + watch (does not auto-launch a browser)
pnpm dev:firefox  # Firefox
pnpm build        # production build -> .output/chrome-mv3
pnpm zip          # packaged zip for the store
pnpm compile      # tsc --noEmit
pnpm lint         # biome
```

`pnpm dev` watches and rebuilds with HMR but won't open a browser. Load
`.output/chrome-mv3` as an unpacked extension once, and it hot-reloads on changes.

## Architecture

See [docs/DESIGN.md](docs/DESIGN.md) for the full design - the containment engine
(outermost-wins dedupe), the hybrid CSS-inject + MutationObserver approach, the
selector stability ranking, and the community rule-list model.

Adding/improving bundled site rules: edit `lib/community-rules.ts` and open a PR.

The original per-site stylesheets are preserved under `legacy/`.

> Forked from [ganigeorgiev/hide-ratings-extension](https://github.com/ganigeorgiev/hide-ratings-extension); generalized into Haze.
