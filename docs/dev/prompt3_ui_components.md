# UI Layout & Component Inventory

## High-Level Layout (Split Workspace)
1. **Top Toolbar (persistent)**  
   - Left cluster: App logo, "Open Image", "Open Project", "Save Project".  
   - Middle: breadcrumb showing current file name + unsaved indicator.  
   - Right cluster: Undo/Redo, Theme toggle, Export, Print buttons.  
   - Height ~56 px, translucent background, drop shadow when scrolling.
2. **Left Mode Rail (72 px)**  
   - Icons and labels for: Preview, Settings, Export, Learn.  
   - Shows tooltips + keyboard shortcuts.  
   - Active item highlights with accent color.
3. **Main Split**  
   - **Preview Canvas (flex 2):**  
     - HTML canvas/WebGL surface with tiled image.  
     - Overlays for margins (hashed), overlap (soft color), tile grid lines.  
     - Zoom controls floating bottom-right, fit-to-screen button, coordinate readout.  
   - **Inspector Panels (flex 1):**  
     - Accordion with Document, Grid, Guides, Output sections.  
     - Each section includes labeled inputs, slider+number pairs, toggles, validation hints, inline metrics.
4. **Status Bar (32 px)**  
   - Displays DPI, Rows×Cols, Printable size, Current zoom %, Job status (idle/exporting).  
   - Right side hosts notifications (success/error toasts originate here).

## Wireframe Descriptions
- **Document Panel**: card with dropdowns for Paper Size (A4, Letter), buttons for orientation (portrait/landscape), numeric input for DPI, slider for margin + mm readout, overlap control. Metrics line below: "Printable area: 183×260 mm" updating live.
- **Grid Panel**: toggle for "Auto-fit"; when disabled, two stepper inputs for Rows/Cols plus "Lock aspect" checkbox. Visual miniature grid preview updates as numbers change.
- **Guides Panel**: toggles for Crop Marks, Tile Labels, Bleed; bleed input in mm appears when enabled. Checkbox for "Show guides in preview". Sample screenshot thumbnail shows effect.
- **Output Panel**: segmented control for PDF/PNG/JPG, path picker with "Browse" button, naming format input (e.g., `tile_r{row}_c{col}`), checkbox for "Open folder after export" and "Send to printer".
- **Preview Overlay**: top-left legend chips for Colors (Margins / Overlap / Tile). Hovering over tile outlines shows tooltip `Row 02, Col 03 – 210×297mm`. Drag handles at outer edges allow manual increments of rows/cols.

## Component Inventory
| Component | Type | Props / State | Notes |
| --- | --- | --- | --- |
| `AppShell` | layout | `{ children }` | Hosts toolbar, rail, status bar; manages theme + window resizing. |
| `TopToolbar` | layout | `{ fileName, dirty, onOpenImage, onSaveProject, onUndo, onRedo, onExport, onPrint }` | Uses platform-specific shortcuts labels. |
| `ModeRail` | navigation | `{ activeMode, onChange }` | Supports keyboard navigation. |
| `PreviewCanvas` | data-visual | `{ imageSrc, tiles, zoom, margins, overlap, guides, onZoomChange, onPan, onTileHover, onDragHandle }` | Canvas/WebGL rendering; high-DPI aware. |
| `ZoomControls` | control | `{ zoom, onChange, onFit }` | Buttons + slider for 25–400%. |
| `DocumentPanel` | inspector | `{ settings, onChange }` | Composed of subcomponents: `PaperSelect`, `OrientationToggle`, `DpiInput`, `MarginInput`, `OverlapInput`. |
| `GridPanel` | inspector | `{ autoFit, rows, cols, lockAspect, onChange }` | Auto-fit disables manual inputs. |
| `GuidesPanel` | inspector | `{ cropMarks, tileLabels, bleed, showGuides, onChange }`. |
| `OutputPanel` | inspector | `{ format, destination, naming, openAfter, sendToPrinter, onChange }`. |
| `MetricsBar` | feedback | `{ dpi, rows, cols, posterSize, zoom, jobStatus }` | Lives in status bar. |
| `ToastCenter` | feedback | `{ messages, onDismiss }` | stacked notifications. |
| `ProgressModal` | modal | `{ job, onCancel }` | Steps: queue, slice, render, package, done. |
| `RecentProjectsList` | list | `{ items, onOpen }` | Shown on welcome screen + File menu. |
| `FileDropZone` | utility | `{ onDrop, onBrowse }` | Accepts drag&drop, shows supported formats. |
| `PrintDialogBridge` | service | `{ jobConfig }` | Wraps Electron `webContents.print`, emits completion events. |
| `ProjectAutosaveIndicator` | utility | `{ status }` | Icon + tooltip; integrates with state manager. |

### Shared UI Atoms
- `LabeledSlider`, `NumericInput`, `StepperInput`, `ToggleSwitch`, `SegmentedControl`, `ChipLegend`, `Tooltip`, `Modal`, `AccordionSection`.

## Interaction Notes
- All inspector inputs send debounced updates (100 ms) to prevent thrashing the renderer while still feeling instant.
- Preview canvas and inspector stay in sync via global state store (Zustand).  
- Tooltips display keyboard shortcuts (e.g., "Zoom In (+)").  
- Theme toggle instantly updates palettes using CSS variables.
