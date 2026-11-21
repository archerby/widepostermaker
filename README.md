# WidePosterMaker

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Print wall-sized posters, blueprints, maps, and sewing patterns on an ordinary A4 or US Letter home printer.**

Live site: [widepostermaker.com](https://widepostermaker.com)

---

## Core Principles

- **Do One Thing Well (Unix + KISS)**: Load an image or PDF, set your paper size and layout, and download a calibrated, print-ready multi-page PDF.
- **100% Client-Side & Private**: Zero uploads, zero cookies, zero trackers, zero external CDN requests. Open your browser DevTools **Network** tab after loading the page — zero bytes leave your computer when processing files.
- **Vector-Preserving & Memory-Lean**:
  - **PDF inputs** are embedded once via `pdf-lib` (`embedPage`) as a single Form XObject and clipped cleanly per tile, keeping vector paths and fonts infinitely sharp. Automatically falls back to high-resolution local rendering via `pdf.js` for encrypted or unsupported PDFs.
  - **Image inputs** (PNG, JPEG with EXIF orientation support, WebP, SVG, GIF, BMP) are embedded **once** in the output PDF and clipped across tiles — keeping file sizes small and memory usage low.

## Features

- **Paper Sizes**: A4 (`210×297 mm`), US Letter (`8.5×11 in`), A3 (`297×420 mm`), US Legal (`8.5×14 in`).
- **Auto Orientation**: Picks Portrait or Landscape automatically for the fewest sheets.
- **5 Sizing Modes**: Sheets Wide, Sheets Tall, Poster Width (`cm`/`mm`/`in`), Poster Height, and **True Scale (`100%`)** for A0 → A4/Letter sewing patterns and CAD drawings.
- **Assembly Marks**: Corner crop marks, registration `+` crosshairs, dashed right/bottom glue overlap tabs with neighbor hints (`-> A2`, `v B1`), interactive click-to-skip blank tiles, and a Page 1 **Assembly Map + 50 mm / 2.0 in Calibration Ruler**.
- **Strict CSP**: `default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; form-action 'none'`.

## Architecture

```text
content/
  i18n/en.json          # UI strings & JS localization keys (i18n-ready)
  pages/*.json          # 6 static SEO landing & guide pages
templates/              # HTML5 templates with strict CSP & JSON-LD
src/
  js/layout.js          # Pure millimeter tiling geometry (zero DOM)
  js/exif.js            # Bounds-checked JPEG EXIF orientation reader
  js/pdf-reader.js      # Lazy pdf.js loader + multi-page renderer
  js/pdf-exporter.js    # Lazy pdf-lib Single-XObject PDF builder
  js/preview.js         # HiDPI interactive tile grid canvas
  js/sample.js          # Offline sample poster generator
  js/app.js             # Controller & preset wiring
  vendor/               # Self-hosted pdf-lib & pdfjs-dist (see VENDOR.md)
scripts/
  fetch_vendor.py       # Re-fetch pinned npm tarballs & regenerate VENDOR.md
  gen_assets.py         # Generate PNG icons & OpenGraph card (Pillow)
  build.py              # Zero-dependency Python SSG -> dist/
tests/
  test_build_and_seo.py # Build, HTML, SEO, link & CSP verification
  test_e2e_browser.py   # Real headless Chrome + PyMuPDF/pypdf PDF checks
```

## Local Development & Verification

```bash
# Build dist/
python scripts/build.py

# Serve locally
python -m http.server 8080 -d dist

# Run full verification suite (requires pytest, pillow, pypdf, pymupdf, Chrome)
pytest -v
```

## Vendored Dependencies & Licenses

All browser libraries are self-hosted in `src/vendor/` with pinned tarballs and SHA-256 checksums documented in [VENDOR.md](VENDOR.md).

## License

[MIT](LICENSE) © 2026 Pavel Novikau
