# Workflow & State Specification

## Primary Journey
1. **Launch / Empty State**  
   - App opens to a welcome canvas with drag-and-drop zone, recent files list, and "Browse" button.  
   - Status bar shows default paper (A4 portrait, 300 DPI) and zero tiles.
2. **Import Image**  
   - User drags file or selects via dialog.  
   - UI enters `loading` state; spinner overlays preview pane while renderer extracts metadata.  
   - Transition to `ready` once initial tiling completes.
3. **Preview & Adjust**  
   - Preview canvas displays tiled grid with overlay legend.  
   - Inspector panels allow changes to DPI, margins, overlap, rows/cols, guide toggles.  
   - Each change instantly recalculates tiles; state remains `ready` but flags `dirty` for unsaved exports.
4. **Export or Print**  
   - User selects Export → chooses format/destination → triggers backend slicing job.  
   - App enters `exporting` state; progress modal shows steps (queue → slice → render → package).  
   - Successful completion returns to `ready`, surfaces success toast with file links.  
   - Selecting Print runs similar flow but concludes with OS print dialog; state `printing` until job completes or is canceled.

## Secondary Journeys
- **Reopen Recent Project:** from empty state or menu, user picks a saved `.poster.json`. App loads stored settings, re-renders preview, resumes in `ready` state with `loadedFromProject=true` flag.
- **Advanced Settings:** user toggles "Advanced" in inspector to expose developer panels (bleed, naming templates). Changes behave like primary adjustments; undo stack tracks modifications.
- **Batch Export:** from Export panel, user selects multiple source images (or folder). App processes sequentially, displaying batch progress with per-file status; state cycles `exporting` per asset while queue remains active.

## State Definitions & Transitions
```
┌────────┐   import    ┌────────┐   success    ┌─────────┐
│ empty  │────────────▶│ loading│────────────▶│ ready    │
└────────┘             └────────┘             │ (dirty?) │
     ▲                      │                 └─────┬───┘
     │ project load         │error                     │
     │                      ▼                          │
┌──────────┐◀──────────────┴────┐                 export/print
│ project  │    error dialog    │                          │
│ error    │                    │                          ▼
└──────────┘                    ▼                     ┌──────────┐
                     ┌────────────────────┐          │ exporting│
                     │ toast + return to  │◀────────▶│ printing │
                     │ previous stable    │  cancel  └──────────┘
                     │ state              │               │
                     └────────────────────┘        success│ failure
                                                      │    │
                                                      ▼    ▼
                                             ┌──────────┐ ┌─────────┐
                                             │ success  │ │ failure │
                                             │ dialog   │ │ dialog  │
                                             └─────┬────┘ └────┬────┘
                                                   ▼          ▼
                                               back to ready  ready+error flag
```

### State Flags
- `dirty`: preview diverges from last export; triggers reminder badge on Export button.
- `batchMode`: indicates multi-file queue UI is active.
- `projectLoaded`: toggles availability of "Save Project" vs "Save Project As".

## Screen Flow Narrative
1. **Welcome Screen** — shows hero illustration, CTA buttons (Open Image, Open Project, Learn More), list of recents. Transition to Preview once file is selected.
2. **Preview Workspace** — main split view active. Toolbar actions (Open, Undo/Redo, Save Project, Export, Print). Navigator on left for switching between Preview, Settings, Export summary. Status bar shows DPI, rows×cols, paper usage.
3. **Export Modal** — overlay with job summary, destination path, format selection. After confirming, modal turns into progress tracker. Completion yields success screen with "Open Folder" and "Print Again" shortcuts.
4. **Print Dialog Flow** — on Print action, app generates temporary tiles/PDF, then opens OS print dialog. On completion/cancel, returns to Preview with toast message.

## Data Passed Between States
- `DocumentSettings`: DPI, paper type, orientation, margins, overlaps.
- `GridSettings`: autoFit boolean, rows, cols, aspect lock.
- `GuideSettings`: booleans for crop marks, labels, bleed size.
- `ExportSettings`: format, destination, naming, include guides.
- `JobStatus`: queue ID, step, progress %, ETA.

## Error Handling Strategy
- Inline validation prevents transitions when inputs invalid.  
- For backend failures (e.g., tiler crash), app surfaces toast + keeps user in Preview, allowing re-run.  
- Project load errors (missing assets) show repair dialog offering to relink source image.
