# WidePosterMaker (`widepostermaker.com`) — Design Specification

Date: 2026-11-21
Author: Pavel Novikau
Status: Approved

## 1. Philosophy & Constraints
- **KISS & Unix Principle**: Do one thing — split an image or PDF into tiled, print-ready multi-page sheets for home printers — and do it reliably, fast, and safely.
- **100% Client-Side & Zero Tracking**: No backend uploads, no cookies, no analytics, no external CDNs. All libraries are self-hosted and checksum-pinned (`VENDOR.md`).
- **Open Source & GitHub Pages**: Public MIT repository (`archerby/widepostermaker`) deployed statically to GitHub Pages with custom domain `widepostermaker.com`.

## 2. Stack
- **Runtime (Browser)**: Vanilla ES Modules (`src/js/*.js`) + CSS (`src/css/style.css`). Zero build bundler needed for runtime JS.
- **PDF Engine**:
  - `pdf-lib@1.17.1` (`pdf-lib.esm.min.js`) — lazy-loaded on export.
  - `pdfjs-dist@4.10.38` (`legacy/build/pdf.min.mjs` + `pdf.worker.min.mjs`) — lazy-loaded only when user drops/selects a `.pdf`. Always pass `uint8Array.slice()` to pdf.js so the main buffer is never detached before `pdf-lib` uses it.
- **Static Site Generator (Build)**: Python 3 stdlib script `scripts/build.py` reading `content/i18n/<lang>.json`, `content/pages/*.json`, and `templates/*.html` to output `dist/` with strict CSP, pre-rendered SEO landing pages, `sitemap.xml`, `robots.txt`, `llms.txt`, `manifest.webmanifest`, `CNAME`, and `.nojekyll`.
- **i18n Extensibility**: All UI copy and JS messages live in `content/i18n/en.json` (`ui`, `nav`, `footer`, `js`). Adding additional languages later only adds `content/i18n/<lang>.json` and localized page entries without rewriting JS/templates.

## 3. Geometry & Single-XObject PDF Architecture
- All internal layout math runs in millimeters (`src/js/layout.js`).
- Supported sheet formats: `A4` (210×297 mm), `US Letter` (215.9×279.4 mm), `A3` (297×420 mm), `US Legal` (215.9×355.6 mm).
- Supported sizing modes:
  1. `sheets-width` (columns across)
  2. `sheets-height` (rows tall)
  3. `size-width` (target width in mm/cm/in)
  4. `size-height` (target height in mm/cm/in)
  5. `scale` (percentage of physical size; 100% = True Scale for patterns & blueprints)
- Orientation: `auto` (picks Portrait or Landscape minimizing sheet count, tie-breaking on wasted paper area), `portrait`, or `landscape`.
- **Single-XObject Clipping (`src/js/pdf-exporter.js`)**:
  - **Vector PDF input**: Embed source page once via `outDoc.embedPage(srcPage, cropBox)`. Apply exact `/Rotate` (0/90/180/270) + uniform scale + `pushGraphicsState / rectangle / clip / endPath` per tile. Vectors remain sharp at any zoom. Falls back automatically to high-DPI raster via `pdf.js` if encrypted/unsupported, with a clear UI warning.
  - **Image input**: Embed source JPEG (when EXIF orientation is 1) or PNG once into `outDoc`, or normalize EXIF-rotated/WebP/SVG/GIF/BMP once via `createImageBitmap` + offscreen canvas, then clip per tile. Output file size stays proportional to 1× source size rather than `N` tiles.
- **Print & Assembly Aids**:
  - Vector corner crop marks, `+` alignment crosshairs with white halo, dashed right/bottom glue overlap lines, neighbor labels (`-> A2`, `v B1`) inside wide overlaps, outer margin labels (`A1 · Row 1, Col 1`), and interactive click-to-exclude tiles.
  - Optional Page 1 **Assembly Map** with tile grid overview, excluded-tile hatching, and vector **50 mm** and **2 inch** calibration rulers (`PRINT AT 100% / ACTUAL SIZE`).
  - WinAnsi safety filter (`toWinAnsiSafe`) prevents `StandardFonts.Helvetica` crashes on Unicode filenames.

## 4. Security & Privacy Architecture
- Strict CSP `<meta>` on every HTML document:
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; worker-src 'self' blob:; connect-src 'self' blob:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`
- Zero inline scripts (except JSON-LD and JSON config data blocks), zero inline `style=""` attributes, zero `on*=""` attributes.
- Zero `innerHTML` with user-supplied data (`textContent` only).
- `MAX_SHEETS = 400` layout guard prevents accidental memory exhaustion.
- Explicit Blob URL revocation on file switch and download cleanup.

## 5. SEO Architecture (v1 — English + 5 Intent Landing Pages)
1. `/` — Wide Poster Maker (auto A4/Letter by locale)
2. `/pdf-poster-splitter/` — PDF Poster Splitter (preset: A4, vector PDF focus)
3. `/a4-poster-maker/` — A4 Poster Maker (preset: A4, mm/cm)
4. `/letter-poster-maker/` — US Letter Poster Maker (preset: Letter, inches)
5. `/sewing-pattern-tiler/` — A0 to A4 / Letter Sewing Pattern Tiler (preset: 100% True Scale + Assembly Map)
6. `/how-to-glue-a-tiled-poster/` — Illustrated Assembly & Calibration Guide (SVG diagrams)

Each page has unique `<title>`, `<meta name="description">`, `<link rel="canonical">`, OpenGraph/Twitter tags (`og-image.png`), JSON-LD (`WebApplication`, `FAQPage`, `HowTo`, `BreadcrumbList`), and non-duplicate domain content + FAQ.

## 6. Verification Strategy
- `tests/test_build_and_seo.py`: validates full `dist/` output, HTML structure, unique SEO metadata, CSP hygiene, JSON-LD parsing, link resolution, `sitemap.xml`, and `og-image.png`.
- `tests/test_e2e_browser.py`: runs real headless Chrome against an ephemeral HTTP server serving `dist/` under strict CSP; tests `layout.js` + `exif.js` + full PDF generation on JPEG, EXIF-rotated JPEG, and rotated/CropBox vector PDF; inspects generated PDFs using `pypdf` and `fitz` (PyMuPDF) for page counts, exact MediaBox pt dimensions, Single-XObject uniqueness, vector `/Subtype /Form` preservation, and rendered quadrant pixel verification.
