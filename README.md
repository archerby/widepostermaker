# Wide Poster Maker

Desktop + CLI tools for slicing giant posters into printer-friendly tiles.

## At a glance

- **Python tiler** (`image_to_a4_tiles.py`) for quick scripting/automation workflows.
- **Electron desktop app** with geometry-accurate canvas, grouped inspector panels, and a monochrome finisher for consistent B/W exports.
- **Node worker** (Sharp + pdf-lib) does the heavy lifting while the renderer stays responsive.
- **Portable + installer builds** created via `electron-builder` (`npm run dist` / `npm run dist:portable`).

## Python CLI

### Requirements

- Python 3.10+
- [Pillow](https://python-pillow.org/) (see `requirements.txt`)

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

### Usage

```powershell
python image_to_a4_tiles.py --input path\to\image.jpg --output-dir output_tiles --dpi 300 --orientation portrait --margin-mm 5 --overlap-mm 3 --format png --add-guides
```

Key options:

- `--dpi`: target print resolution (default `300`).
- `--orientation`: `portrait` or `landscape`. Swaps A4 width/height.
- `--margin-mm`: uniform margins on every page (default `0`).
- `--overlap-mm`: shared area between neighbouring tiles (default `0`).
- `--format`: `png`, `jpg`, or multi-page `pdf` (`tiles.pdf`).
- `--add-guides`: draws subtle crop marks and tile labels (`Row X, Col Y`).

During execution the script prints the source image size, tile area in pixels, tile grid dimensions, and the paths of the generated files.

## Electron app

### Install & run

```powershell
npm install
npm run dev
```

Vite serves the React renderer, Electron hosts the main process, and the layout now groups controls via dedicated panels (grid, document, guides, export) plus a Mode rail for keyboard navigation. The preview renders the exact printable geometry with live overlays.

### Dev + QA workflow

Run the usual quality gates before packaging:

```powershell
npm run lint
npm run typecheck
npm run test
```

Create production-ready bundles in `dist/`:

```powershell
npm run build
```

### Packaging & distribution

```powershell
npm run pack          # produces unpacked platform directories
npm run dist          # DMG, NSIS installer + portable EXE, AppImage/DEB
npm run dist:portable # build only the Windows single-file portable EXE
```

Artifacts land under `release/`:

- `WidePosterMaker-<version>-Setup-<arch>.exe` – NSIS installer
- `WidePosterMaker-<version>-portable-<arch>.exe` – single-file portable build

The portable binary runs immediately on the machine that built it. If you redistribute it, Windows SmartScreen will still flag it as “Unknown publisher” until the executable is code-signed with a trusted certificate.

### Monochrome finisher

Enabling the “Black & white finisher” toggle in the Export panel attaches a `monochrome` flag to the export payload. The tiler worker flattens each tile over white, converts it via Sharp’s `greyscale()` pipeline, and bumps brightness slightly so the resulting PDF/JPG/PNG stays punchy even on budget laser printers.

### More documentation

- [docs/architecture.md](docs/architecture.md) – layers, build commands, packaging targets, release checklist.
- **Support** – https://buymeacoffee.com/upupa.dev (also in the app’s Help menu).

The `postinstall` script automatically runs `electron-builder install-app-deps` so native modules like `sharp` rebuild for the host platform.
