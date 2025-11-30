# Wide Poster Maker – Concept & Guidelines

## Vision
Create a cross-platform desktop assistant that helps people print oversized images on household A4/Letter printers. The app should feel like a lightweight studio: drop in any bitmap, preview how it will be tiled, tweak layout/margins/overlap, then export print-ready pages or send them straight to the printer. It must remain approachable for casual users yet expose precise controls demanded by pros (photographers, cosplayers, educators).

## Core Outcomes
- **Instant preview:** show the source image, sheet boundaries, and overall poster dimensions before generating files.
- **Interactive tiling controls:** allow users to tune DPI, orientation, paper format (A4/Letter), margins, overlap, and tile counts with live feedback.
- **Flexible output:** export as bundled PDF, individual PNG/JPG tiles, or direct OS printing.
- **Guided assembly:** optionally add guides, crop marks, and tile labels to simplify trimming and aligning.

## Guiding Principles
1. **Progressive disclosure:** keep the primary workflow (load → preview → print) clean while hiding advanced knobs behind expandable panels.
2. **Non-destructive adjustments:** every change should update the preview instantly without rewriting original files until the user exports.
3. **Transparency:** show calculated sizes (pixels/mm/inches), number of rows/columns, and estimated paper usage to build trust.
4. **Cross-platform parity:** every feature and shortcut must behave the same on Windows, macOS, and Linux. Use Electron + modern web tech (React/TypeScript) to share UI logic and native bridges for printing.
5. **Offline-first:** no network requirement. All processing happens locally via Node/Python bindings or pure JS libraries.
6. **Extensible prompts:** architect copy, palette, and feature toggles so future prompts or automation (e.g., GPT-assisted helpers) can hook into consistent IDs and data contracts.

## Architecture Snapshot
- **Electron shell:** orchestrates windows, menus, and native dialogs. Main process manages file IO, printer access, and packaging.
- **Renderer app (React + TypeScript):** houses the UI—canvas preview, inspector panels, progress modals, and onboarding hints.
- **Image engine (Node or Python worker):** leverages existing tiling logic (e.g., by invoking `image_to_a4_tiles.py` or rewriting in Node using sharp/canvas) via IPC, streaming progress back to renderer.
- **State management:** use Zustand or Redux Toolkit for predictable state and undo/redo of layout tweaks.
- **Design language:** modern neutral palette, subtle accent color for active tiles, large tap targets, accessible typography (WCAG AA), and keyboard shortcuts for power users.

This document serves as the anchor for all follow-up prompts. Subsequent sections must reference and refine these principles while delving into concrete UI flows, component contracts, data models, and final implementation guidance.
