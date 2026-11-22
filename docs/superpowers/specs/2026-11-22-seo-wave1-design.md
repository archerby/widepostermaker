# WidePosterMaker — Phase 2 / Wave 1: SEO landing pages — Design

Date: 2026-11-22
Author: Pavel Novikau
Status: Approved (wave 1 = 4 landings × 5 languages; editor sub-agent review; Search Console already connected)

## 0. Context

- Site is 1 day old, 0 backlinks, Search Console connected by Pavel. Technical SEO is fine (301s, real 404, canonical, hreflang, sitemap, JSON-LD).
- Audit: EN pages 535–672 words; RU/DE/ES/PL sub-pages only 226–380 words. One hand-written table (`a4-poster-maker` "A1 = 9–12 A4 sheets") was never computed.
- Research (Google autocomplete in 5 languages + SERP samples): local-language SERPs (RU/DE/ES/PL) are held by "how to do it in Word/Paint" articles, not by tools. The biggest clusters in every language are "print a large image on multiple pages", "split an image into A4 pages", "A1/A0/A3 poster on A4", "print a PDF on multiple pages". The strongest tool competitor (Docuslice) is EN-only with a paid vector export; Rasterbator/BlockPosters are image-only and have no true scale.

## 1. New pages (×5 locales = 20 pages)

| slug | primary cluster (EN) | local phrasing to use in title/H1 | page angle (to avoid cannibalising existing pages) | tool preset |
| --- | --- | --- | --- | --- |
| `print-large-image-on-multiple-pages` | print large image on multiple pages | RU «распечатать большую картинку на нескольких листах»; DE «großes Bild auf mehrere Seiten drucken»; ES «imprimir imagen grande en varias hojas»; PL «wydrukować duży obraz na kilku kartkach» | photos & artwork; DPI / viewing distance; worked photo example | paper auto, sheets-width 3 |
| `split-image-into-pages` | split image into A4 pages | RU «разбить картинку на листы А4»; DE «Bild auf mehrere A4-Seiten aufteilen»; ES «dividir imagen en hojas A4»; PL «podzielić obraz na kartki A4» | grid choice: 2 / 3 / 4 / 5 columns preset chips; how the rows follow from the aspect ratio | paper auto, sheets-width 2 |
| `a0-a1-a2-poster-on-a4` | print A1 poster on A4 sheets | RU «плакат А1 (А0, А2) на листах А4»; DE «A1-Poster auf A4 drucken»; ES «imprimir póster A1 en hojas A4»; PL «plakat A1 na kartkach A4» | **computed** sheet-count table A0–A3 on A4 / Letter / A3; preset chips "A0 / A1 / A2 / A3 width" | paper a4, size-width 594 mm (A1) |
| `print-pdf-on-multiple-pages` | print PDF on multiple pages | RU «распечатать PDF на нескольких листах»; DE «PDF auf mehrere Seiten verteilt drucken»; ES «imprimir PDF en varias hojas»; PL «wydrukować PDF na kilku kartkach» | *printing* angle: Adobe Reader "Poster" vs. this tool, 100% scale, multi-page PDFs; links to `pdf-poster-splitter` for the vector-splitting angle | paper auto, scale 100 |

Each new page:
- uses the existing `tool` template (tool above the fold) with its own `presets`;
- has **500–800 words of unique main content** written natively per language (not translated sentence-by-sentence) using the local phrasing above in title, H1, the first paragraph and one H2;
- has a worked example with real numbers, an FAQ (4–6 Q&A → FAQPage JSON-LD), a "Related tools" block;
- title pattern: `<exact local query phrase> — free, no upload | WidePosterMaker` (≤ 65 chars where the language allows), description ≤ 155 chars.

## 2. Thicken existing localized pages

All RU/DE/ES/PL pages that are below **450 words** of main content get extra sections (native writing, not padding): a computed size table where relevant, a common-mistakes list, and 1–2 more FAQs. EN pages are untouched except the `a4-poster-maker` hand table, which is replaced by the computed table (§3).

## 3. Build features

### 3.1 Computed sheet-count tables (`autoTable`)

A section may contain `"autoTable": {"posters": ["a0","a1","a2","a3"], "papers": ["a4","letter","a3"]}` instead of a hand `table`. `build.py` renders a table: rows = poster formats (with size in cm and in), columns = papers, cell = `"{cols}×{rows} = {n}"` sheets.

- Geometry: `scripts/sheetcalc.py`, a line-by-line port of `layout.js` (`resolveSheetGeometry` + `solveGridForOrientation`, mode `scale` at 100 %, orientation `auto`, portrait poster). Paper defaults as in the app: A4/A3 margin 5 mm / overlap 10 mm; Letter/Legal 6 mm / 12 mm. The table caption states those assumptions.
- Localized header/caption strings come from `content/i18n/<lang>.json` → `tables` block.
- **Parity test:** the e2e runner computes the same matrix with the real `computeLayout()` and the Python test asserts equality with `sheetcalc.py` for every cell.

### 3.2 Preset chips (no-JS links, JS-enhanced)

A page may define `"chips": [{"label": "2 columns", "query": "cols=2"}, …]`. Rendered under the hero as `<a class="chip" href="?cols=2">`. Without JS (and for crawlers) they are plain links to the same page with query params the app already understands (`cols`, `rows`, `width`, `scale`, `paper`, `units`). With JS, `app.js` intercepts the click, applies the params to the controls in place (keeping a loaded file) and recomputes. Canonical tags already point to the clean URL, so query variants are not indexed separately.

### 3.3 Related tools block

`"related": ["slug", "slug", "slug"]` → a `<nav class="related">` of cards (H1 + description of the target page **in the same locale**). Build fails on an unknown slug. Every new page has 3; existing pages get 2–3 that include the new ones, so the new pages are linked from day one.

### 3.4 Footer tool list

The footer "Tools" list becomes every `tool`-template page in the locale (currently: nav items only), so all 9 tool pages are linked site-wide. Header nav stays at 6 items (no crowding).

### 3.5 Cache-busting

Deploys will now be frequent; CSS/JS are served with `max-age=14400`. `build.py` computes `H = sha256(all dist css+js)[:10]` and:
- rewrites `/css/style.css` → `/css/style.css?v=H` and `/js/app.js` → `/js/app.js?v=H` in HTML;
- rewrites relative module specifiers inside `dist/js/*.js` (`from './x.js'`, `import('./x.js')`) to `./x.js?v=H`.
Vendor files are pinned by version and untouched. Tests strip `?v=` when resolving links.

## 4. Content production & review

1. Claude writes the EN master of each new page (structure, examples, numbers, FAQ).
2. Four language sub-agents (RU, DE, ES, PL) write their pages **natively** from the EN master + local query phrasing + the computed numbers, and thicken that language's thin pages.
3. An **editor sub-agent** reviews every language: naturalness, keyword use in title/H1/first paragraph, factual consistency with the computed tables and the tool's real behaviour, no claims the tool cannot back (e.g. no "AI", no "best"). Findings are fixed before deploy. No review by Pavel required.

## 5. Out of scope (later waves)

How-to pages (Word / Mac / Adobe Reader / Canva), blueprint/CAD page, D&D map page, "Rasterbator alternative" comparison, backlinks/outreach, header nav redesign.

## 6. Testing

- `SLUGS` in tests grows to 10; every slug exists in all 5 locales; titles/descriptions unique site-wide.
- Main-content word count: new pages ≥ 500 words, every tool/guide page ≥ 400 words.
- Every `related` slug resolves; each new page is linked from ≥ 2 other pages in the same locale.
- `autoTable` parity with `computeLayout()` (e2e).
- Cache-busting: every HTML references `style.css?v=` and `app.js?v=` with the same hash; every `?v=` target exists; e2e still passes (module graph loads with versioned specifiers, no CSP violations).
- Chips: e2e clicks a chip after the sample loads → value changes, file stays loaded.
