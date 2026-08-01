# AGENTS.md — Project Context & Handoff

This file is auto-loaded by opencode at the start of every session. Read it
first: it records the conventions, the traps we hit, and the current handoff.

## What this repo is

`Rafting_Trip_ideas` — a tiny **static site (no backend)** for choosing the
2026 annual rafting trip: vote for a favorite river, check available weekends,
and see which dates work for everyone. Deployed on GitHub Pages at
`https://gkaragatchliev.github.io/rafting-trip-2026/`.

## Tech stack & structure

- Vanilla HTML/CSS/JS (ES5-style, IIFE, `var`). No frameworks, no build step.
- `index.html` — page structure (hero, trip cards, vote form, results).
- `css/style.css` — all styling (CSS custom properties, teal/ink palette).
- `js/data.js` — data only: `TRIPS` (4 trips, each with `stay[]` and `eat[]`
  arrays — **info-only**, not votable) and `DATES` (8 weekend blocks + `flex`).
  Editing this file is the intended way to change options.
- `js/app.js` — all logic inside one IIFE: renderers, voting state
  (`state.votes` in localStorage), best-date/tally/availability-table rendering,
  share-link base64 encode/decode, XSS escaping.
- `tests/site.test.js` — `node --test` + jsdom suite, **38 tests, all green**.
- `package.json` — test script `npm test` (runs `node --test tests/*.test.js`),
  devDependency `jsdom`.

## Commands

- Run tests: `npm test`
- Serve locally: `python -m http.server 8000` → `http://localhost:8000`
- Deploy: commit + `git push origin main`; GitHub Pages picks it up (~1 min).
  Repo: `gkaragatchliev/rafting-trip-2026`.

## Hard-won lessons (do NOT repeat these mistakes)

1. **`String.prototype.replace` interprets `$` in replacement strings** —
   `$$`, `$&`, `$1`, etc. The test harness originally passed the app source as
   the replacement string, which corrupted `var $$` into `var $` and broke
   `querySelector`. **Always splice with `split()/join()`, never `.replace()`**
   when embedding source code (see `buildScript()` in the test file).
2. **jsdom does not share top-level `const` across separate external
   `<script>` tags.** The harness must concatenate `data.js` + `app.js` into one
   inline script, and expose internals via `window.__raft` before the
   `DOMContentLoaded` listener.
3. **`deepStrictEqual` fails across realms.** Arrays/objects created inside
   jsdom have a different prototype than Node's. Compare with
   `Array.from(...)` or `JSON.stringify`, not `deepStrictEqual` on jsdom
   objects.
4. **Cross-realm array issue** also matters when asserting on
   `state.votes` / `available[]` — wrap with `Array.from()`.
5. **Browser cache on GitHub Pages.** Users were seeing new HTML (button) with
   stale JS (no handler). Fixed with cache-busting query strings on assets:
   `css/style.css?v=2`, `js/data.js?v=2`, `js/app.js?v=2`. **Bump these versions
   whenever you change those files.** If a user reports "button does nothing",
   first suspect cache → hard refresh (Ctrl+F5).
6. **Stay & eat are info-only.** They render as a collapsed `<details>` in each
   trip card AND in a dedicated panel toggled by the "🏠 Lodging & restaurants
   (info only)" button under the vote pane. Never make them votable.
7. **No `gh` CLI on this machine.** Use the GitHub MCP tools
   (or plain `git push`). Force-push was needed once to replace stale history.

## Handoff: NEW project — Bulgaria hotel picker (🇧🇬)

The user is building a **new, separate website** (new folder + new GitHub repo,
NOT in this repo) to let **his brother** choose the best hotel to stay at on
arrival in Bulgaria. **The entire site must be written in Bulgarian.**

Requirements to confirm at kickoff (do not assume):
- What city/region in Bulgaria? (Sofia? Plovdiv? seaside? arrival via which
  airport?)
- How many hotels are candidates, and what data per hotel (name, address,
  price, distance from airport, amenities, photos, links)?
- Does he vote for one favorite, or rank? Is it a single person choosing
  (brother) or a vote among several people?
- Info-only vs interactive (like this site's stay/eat) — the user liked the
  "info card + clearly-visible toggle" pattern from this project.
- Reuse conventions from this repo: static site, `js/data.js` for content,
  GitHub Pages deploy, cache-busting query strings, node:test + jsdom suite.
- Bulgarian content: UI labels (e.g. "Избери хотел", "Местоположение", "Цена",
  "Резервирай") and all hotel descriptions in Bulgarian.

When the new project starts, write its own `AGENTS.md` with the confirmed
requirements.
