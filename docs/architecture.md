# Wide Poster Maker Architecture

## Overview

Wide Poster Maker is an Electron + Vite desktop app that wraps a tiling pipeline for oversized images. The UI (renderer) handles previewing, inspectors, and export controls; the main process coordinates IPC, manages the tiling workers, and orchestrates packaging/printing. Node workers (Sharp + pdf-lib) generate printable tiles, and Python fallbacks are available for systems where native modules cannot build.

```
Renderer (React + Vite)
  ↓ IPC (preload exposes posterAPI)
Main process (Electron)
  ↓ worker_threads
Node tiler worker (Sharp + pdf-lib)
  ↓ FS outputs copied to destination
Exports (PDF/JPG/PNG tiles)
```

## Key directories

| Path | Purpose |
| --- | --- |
| `src/renderer` | React UI, Zustand store, panels, preview canvas |
| `src/main` | Electron bootstrap, IPC handlers, ImageEngine/PrintService |
| `src/workers` | Heavy tiling logic (`nodeTilerWorker`, tests) |
| `src/shared` | Geometry + math helpers shared across all layers |
| `dist/` | Build output before packaging |
| `release/` | Artifacts emitted by `electron-builder` (NSIS installer + portable EXE) |

## Build & quality commands

| Command | Description |
| --- | --- |
| `npm run dev` | Launches the Vite dev server and Electron with hot reload |
| `npm run lint` | ESLint over renderer + main |
| `npm run typecheck` | TypeScript checking for renderer + main configs |
| `npm run test` | Vitest suites (shared math + worker sanity) |
| `npm run build` | Produces production-ready renderer + main bundles in `dist/` |
| `npm run dist` | Runs build then `electron-builder` for all targets (nsis + portable + linux + mac) |
| `npm run dist:portable` | Fast path to build + package the portable Windows EXE |

## Packaging outputs

`electron-builder.yml` targets two Windows artifacts by default:

- `WidePosterMaker-<version>-Setup-<arch>.exe` – standard NSIS installer
- `WidePosterMaker-<version>-portable-<arch>.exe` – single-file launcher with no install

macOS (DMG/ZIP) and Linux (AppImage/DEB) remain available via `npm run dist`, though CI/signing are not configured yet.

## Monochrome export pipeline

When the “Black & white finisher” toggle is enabled in the Export panel:

1. The renderer persists `export.monochrome = true` in Zustand state/history.
2. The export payload sent to `tiler:export` carries the flag.
3. `nodeTilerWorker` checks `exportSettings.monochrome` while rendering each tile.
4. After compositing a tile, the worker flattens it over white, runs Sharp’s `greyscale()` transform, and applies a slight brightness boost before writing.

This keeps per-sheet tonality consistent across cheap printers, instead of simply stripping saturation.

## Release checklist

1. `npm run lint && npm run typecheck`
2. `npm run build`
3. `npm run dist` or `npm run dist:portable`
4. Smoke-test the installer and portable EXE (load image, preview, export with/without monochrome)
5. Tag release + upload artifacts (include checksum + release notes)
