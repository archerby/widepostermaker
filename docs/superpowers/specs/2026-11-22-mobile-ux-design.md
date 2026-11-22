# WidePosterMaker — Phase 1: Mobile UX + Analytics — Design

Date: 2026-11-22
Author: Pavel Novikau
Status: Approved (variant A)

## 0. Context & decisions

Measured on the live build at 375×812 (iPhone-class viewport), sample poster loaded:

| Problem | Measured |
| --- | --- |
| Sticky header wraps to 3 rows (6 nav links + 5 language pills) | 165 px = 20 % of the viewport, always on screen |
| "Download PDF" button | 1610 px from the top — two full screens of scrolling through 8 fields |
| Input / select font size | 15.04 px → iOS Safari zooms the page on every focus |
| Checkboxes | 16×16 px |
| `.btn-sm` buttons | ~32 px tall |

Decisions taken by Pavel (2026-11-22):

1. **Traffic first, no ads yet.** Ad positions are *documented* (§6) but not rendered.
2. **Cloudflare Web Analytics** (cookieless beacon) for visitor counting.
3. **Mobile UX before SEO.** SEO growth (Search Console, new intent pages) is Phase 2 with its own spec.
4. **Variant A** for the mobile workspace: sticky bottom action bar + collapsible "More settings". (Rejected: B — step wizard, C — full-screen bottom sheet.)

## 1. Header (all pages)

- **≥ 761 px:** unchanged (brand, inline nav links, language pills; sticky).
- **≤ 760 px:** one row ≈ 52 px, **not sticky**:
  `[logo WidePosterMaker] ........ [EN ▾] [☰]`
  - `EN ▾` — `<details class="lang-menu">`; the panel lists all 5 locales (same hrefs/`hreflang`/`lang` attrs as the pills, current one `aria-current="page"`).
  - `☰` — `<details class="nav-menu">`; the panel lists the 6 nav links vertically, each ≥ 44 px tall.
  - Pure HTML `<details>`/`<summary>`, **no JS**, so it works on guide pages that load no scripts and keeps `script-src 'self'`.
  - The desktop nav/pills and the mobile menus are rendered **both** by `build.py` and toggled by CSS media queries (`<details>` cannot be force-opened from CSS). Duplicate same-page links are harmless for SEO.
  - Menus close on outside click is **not** required (YAGNI); tapping the summary toggles.
- New i18n keys (`content/i18n/<lang>.json`): `menuLabel` (e.g. "Menu").

## 2. Empty state (tool pages)

- On touch devices (`@media (hover: none) and (pointer: coarse)`), the dropzone title "Drop an image or PDF here" is swapped for `ui.dropTitleTouch` ("Pick a photo or PDF") — both strings are in the HTML; CSS shows one.
- The primary "Choose Image or PDF" button becomes full width and ≥ 48 px tall on ≤ 520 px.
- Dropzone vertical padding shrinks on mobile (44 px → 28 px).

## 3. Workspace layout

DOM order inside `.workspace-grid` (one grid, three children):

1. `.preview-pane` — toolbar (Load another file, PDF page nav), canvas, caption.
2. `.controls-pane`
   - **Primary fields** (always visible): Paper size · Size by · Value with **−/+ stepper**.
   - `<details id="advanced-settings" class="advanced">` summary = `ui.advancedLabel` ("More settings"): Orientation, Units, Printer margin, Glue overlap, the 3 checkboxes.
   - `.summary-box` (Tile grid / Finished poster / Print quality) and the excluded-tiles bar + warnings.
3. `.action-bar` — `#bar-summary` (compact one-liner), `Download PDF`, `Print PDF`, `#export-status`.

Desktop (≥ 941 px): grid areas `"preview controls" "preview bar"`; the action bar sits under the controls in the right column, styled like today's export block. `#advanced-settings` is opened by `app.js` on load when `matchMedia('(min-width: 941px)')` matches, so desktop users see every field as now.

Mobile (≤ 940 px): single column; `.action-bar` is `position: sticky; bottom: 0` with a top border/shadow and `env(safe-area-inset-bottom)` padding. Its containing block is the whole workspace grid, so the bar sticks to the bottom of the screen while any part of the tool is on screen and scrolls away with it once the user reads the content below. On mobile:
- `#bar-summary` shows two lines, `"{activeCount} × {paperName}"` / `"{W×H units}"`, coloured `--warn` when the quality tier is `low`.
- `.summary-box` stays visible at the end of the controls (changed during implementation: it carries the DPI / low-resolution explanation that the compact bar cannot fit).
- `Print PDF` is hidden (printing a multi-page PDF from a phone browser is unreliable; Download → open → print works).
- `#export-status` renders as a small line inside the bar (single line, ellipsis).

### Stepper

`[−] [ value ] [+] unit` — two `<button type="button">` around `#size-value`. Click → `value ± step`, clamped to the input's current `min`/`max` (already maintained by `updateModeLabel()`), then dispatch `input` so `recompute()` runs. `aria-label`s come from new keys `ui.stepDec` / `ui.stepInc`, rendered into the HTML by `build.py`.

New i18n keys in total: `menuLabel` (top level), `ui.dropTitleTouch`, `ui.advancedLabel`, `ui.stepDec`, `ui.stepInc`, `js.captionHintTouch`. `#size-value` gets `inputmode="decimal"`.

### Caption hint

`app.js` picks `js.captionHintTouch` ("Tap a sheet to skip/include") instead of `js.captionHint` when `matchMedia('(pointer: coarse)')` matches.

## 4. Touch & typography rules (≤ 940 px or coarse pointer)

- `input`, `select`, `textarea` font-size **16 px** (everywhere, not only mobile — avoids the iOS zoom and is harmless on desktop).
- Interactive controls inside the tool and header menus: min height **44 px** (`.btn`, `.btn-sm`, selects, inputs, stepper buttons, `summary` elements, menu links).
- Checkboxes **22×22 px**; whole label row is tappable (already a `<label>`).
- No horizontal page scroll at 320–940 px.

## 5. Cloudflare Web Analytics

- New file `content/site.json`: `{ "cfBeaconToken": "" }`. The token is public by design (it ships in page HTML), so it lives in the repo.
- `build.py`:
  - empty token → output is byte-for-byte the same CSP as today and no beacon;
  - non-empty token → every page gets
    `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"…"}'></script>`
    and the CSP gains `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`. Nothing else is relaxed.
  - CSP string is produced by one function `build_csp(token)` used by the template; tests import it.
- Token is validated (`^[0-9a-f]{32}$`) — a bad value fails the build.
- Copy changes (all 5 locales): trust card 1 and the footer tagline stop claiming "zero trackers"; they say files never leave the device, no cookies, and (only in FAQ/privacy wording) that an anonymous, cookieless visit counter is used. README "Core Principles" updated the same way.
- **Pavel's action:** Cloudflare dashboard → Analytics & Logs → Web Analytics → add site `widepostermaker.com` → choose the JS-snippet (manual) setup → copy the token into `content/site.json`. If Cloudflare's *automatic* injection is enabled instead, it is blocked by CSP until the token is set — so prefer manual.

## 6. Future ad positions (documented only, nothing rendered)

1. Between `.trust-strip` and the first `.content-section` on tool pages.
2. Between body sections on guide/landing pages (after the 2nd section).
3. Never inside `#poster-app`, never in the sticky action bar.
When ads are enabled, each slot gets a fixed `min-height` to avoid layout shift, and the CSP/consent (CMP) work happens in that later phase.

## 7. Out of scope

SEO content and Search Console (Phase 2); pinch-zoom of the preview; PWA/offline install; dark mode; any change to `layout.js` / `pdf-exporter.js` math.

## 8. Testing

- `tests/test_build_and_seo.py`
  - header: every page has both the desktop nav and `details.nav-menu` + `details.lang-menu` with the same hrefs;
  - CSP: with the committed (empty) token pages have the existing `EXPECTED_CSP`; `build_csp("<32 hex>")` adds exactly the two Cloudflare origins; an invalid token raises;
  - every tool page has `#advanced-settings`, `.action-bar`, stepper buttons with `aria-label`.
- `tests/test_e2e_browser.py` — new mobile harness page loads `/?sample=1` in a same-origin `<iframe>` sized **375×812** and reports:
  - `scrollWidth <= clientWidth` (no horizontal scroll);
  - header height ≤ 64 px and header not `position: sticky`;
  - after the sample loads, `#btn-download` is fully inside the iframe viewport at `scrollY = 0` and is enabled;
  - computed font-size of every `input`/`select` in `#poster-app` ≥ 16 px;
  - every visible button/select/input/summary in `#poster-app` and the header is ≥ 44 px tall (checkboxes ≥ 22 px);
  - stepper `+` increments `#size-value` and the tile count in `#bar-summary` changes;
  - no CSP violations.
  The existing desktop PDF assertions stay unchanged and must keep passing.
- Manual check in the browser pane at 375×812 and desktop width, screenshots attached to the hand-off.
