# Breakdown of Key Sections

This document refines the overarching guidelines into focused areas that later prompts can tackle individually. Each section lists intent, scope, and tangible outputs so future instructions stay grounded and efficient.

## 1. User Journeys & Workflow
- Map the primary flow: Import → Preview → Adjust tiles → Export/Print.
- Secondary flows: reopen recent projects, tweak advanced settings, batch export.
- Define UI states (empty, loading, ready, exporting, printing) and transitions.

## 2. Layout & Navigation
- Window chrome: top toolbar (open, save, print), left navigation for modes (Preview, Settings, Export), status bar with DPI/tile summary.
- Central split view: left shows image preview with sheet grid overlay; right hosts collapsible panels.
- Support light/dark themes; ensure WCAG AA contrast.

## 3. Controls & Inspector Panels
- **Document panel:** paper size, orientation, DPI, margins, overlap.
- **Grid panel:** rows/cols override, auto-fit toggle, lock aspect.
- **Guides panel:** crop marks, labels, bleed, show/hide preview hints.
- **Output panel:** format selection (PDF/PNG/JPG), destination picker, naming scheme, print options.
- Inline validation + real-time numeric feedback (e.g., "Printable area 183x260 mm").

## 4. Preview Canvas Behaviour
- Zoom/pan gestures, tile hover to highlight row/column, tooltip with sheet index.
- Drag handles to adjust tile count manually (snap to integers, show measurement ghosting).
- Overlay legend for margins vs overlap using color coding.

## 5. Export & Printing Pipeline
- Flowchart for invoking backend tiler (Node Sharp worker or Python bridge).
- Progress modal with steps: queue job → slice → render → package → done.
- Printing: leverage Electron's `webContents.print` with preview, custom margins, and OS dialog bridging.

## 6. Persistence & Project Files
- Auto-save JSON project describing inputs, settings, last preview.
- Recent files list with thumbnails.
- Safe overwrite prompts + version stamping (timestamp in exported PDFs).

## 7. Accessibility & Internationalization
- Keyboard shortcuts (Ctrl/Cmd+O, Ctrl/Cmd+P, +/- zoom, arrow nudge tiles).
- Screen reader labels for sliders/toggles; announce tile counts after adjustments.
- Text resources extracted for translation; support metric/imperial toggles.

## 8. Tech Stack & Infrastructure
- Electron main process responsibilities, IPC contracts, error handling.
- Renderer stack recommendation: React + Vite + Tailwind/Chakra, Zustand for state.
- Packaging with Electron Builder for Win/macOS/Linux, auto-update hooks, crash reporting stub.

Each of these sections should later receive a dedicated prompt that references this outline, specifies deliverables (e.g., wireframes, state diagrams, code scaffolds), and ensures consistency with `ui_prompt_guidelines.md`.
