# Wide Poster Maker – Product Brief

## Summary
Wide Poster Maker is a cross-platform Electron desktop app that turns any large raster image into a tiled, print-ready poster using ordinary A4/Letter printers. Users drop in an image, instantly preview sheet boundaries, tweak tiling parameters (DPI, orientation, paper size, margins, overlap, tile counts), and export to PDF/PNG/JPG or print directly. The interface favors a streamlined load → preview → print funnel with advanced controls tucked into expandable panels, preserving approachability while offering pro-level precision. All processing runs locally (offline-first) and maintains identical behavior on Windows, macOS, and Linux.

## Target Users
- **Casual creators:** people crafting wall art, collages, or school projects who need a guided, friendly workflow.
- **Power users:** photographers, cosplayers, educators requiring accurate sizing, predictable overlap, and customizable guides.

## Must-Have Capabilities
1. **Live preview canvas** showing the source image with tile boundaries, margins, and overlaps.
2. **Interactive controls** for DPI, orientation, paper format, margins, overlaps, and manual tile count overrides.
3. **Flexible export pipeline** supporting multi-page PDF, individual PNG/JPG tiles, and native print dialogs.
4. **Guides & labeling tools** to add crop marks, bleed indicators, and per-tile labels for easier assembly.
5. **Cross-platform parity** with identical workflows and shortcuts on Windows/macOS/Linux, packaged via Electron Builder.
6. **Transparent metrics** displaying poster dimensions, sheet counts, and material usage after every adjustment.

## Success Metrics
- **Time-to-preview:** <5 seconds from file import to initial tiled preview on reference hardware.
- **Adjustment feedback:** <200 ms latency for preview updates when sliders/toggles change.
- **Export reliability:** 99% of exports complete without errors in internal QA matrix (paper sizes × formats × OSes).
- **User confidence:** 90% of beta testers agree that on-screen metrics match printed output within ±2 mm.
- **Adoption:** 80% of first-run users complete at least one export or print action.

## Acceptance Checklist
- [ ] Application opens a full-screen window with load/preview/print workflow and follows the visual language described in `ui_prompt_guidelines.md`.
- [ ] Importing a bitmap immediately renders a tiled preview with accurate sheet outlines and size annotations.
- [ ] Inspector panels expose all tiling parameters with inline validation and real-time metric readouts.
- [ ] Guide options (crop marks, labels) render both in preview and exported assets without visual artifacts.
- [ ] Exports succeed to PDF, PNG, and JPG, preserving DPI and tile metadata; printing works via OS dialog.
- [ ] All features function offline and identically across Windows, macOS, and Linux builds.
- [ ] Keyboard shortcuts, accessibility labels, and theme colors meet WCAG AA contrast requirements.
- [ ] State changes do not mutate the original image—exports only occur when initiated.
- [ ] Telemetry/crash logging (if enabled) respects privacy and can be disabled for offline environments.
