# State Management & Data Contracts

## Store Architecture (Zustand)
```ts
interface DocumentSettings {
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  dpi: number; // 72–600
  marginMm: number; // uniform for now
  overlapMm: number;
}

interface GridSettings {
  autoFit: boolean;
  rows: number; // >=1
  cols: number; // >=1
  lockAspect: boolean;
}

interface GuideSettings {
  cropMarks: boolean;
  tileLabels: boolean;
  bleedMm: number;
  showGuidesInPreview: boolean;
}

interface ExportSettings {
  format: 'pdf' | 'png' | 'jpg';
  destination: string; // absolute path
  namingTemplate: string; // e.g., "tile_r{row}_c{col}"
  openAfterExport: boolean;
  sendToPrinter: boolean;
}

interface JobStatus {
  id: string;
  step: 'idle' | 'queued' | 'slicing' | 'rendering' | 'packaging' | 'printing' | 'done' | 'error';
  progress: number; // 0-1
  message?: string;
  error?: string;
}

interface ProjectMetadata {
  projectPath?: string;
  recentFiles: Array<{ path: string; thumbnail: string; updatedAt: number }>;
  dirty: boolean;
}

interface AppState {
  document: DocumentSettings;
  grid: GridSettings;
  guides: GuideSettings;
  export: ExportSettings;
  job: JobStatus;
  metadata: ProjectMetadata;
  image?: { path: string; width: number; height: number; thumbnail: string };
  tiles: {
    rows: number;
    cols: number;
    posterSizeMm: { width: number; height: number };
    previewOverlay: TileOverlay[];
  };
}
```

### Actions
- `setDocument(partial: Partial<DocumentSettings>)`
- `setGrid(partial: Partial<GridSettings>)`
- `setGuides(partial: Partial<GuideSettings>)`
- `setExport(partial: Partial<ExportSettings>)`
- `loadImage(meta)` → triggers IPC to backend for first tiling pass.
- `startExport()` / `cancelExport()`
- `recordJobUpdate(JobStatus)`
- `markDirty(flag: boolean)`
- `saveProject(path?)`
- `loadProject(path)`

Undo/redo tracked via Zustand middleware storing previous state snapshots for document/grid/guide/export slices.

## IPC Contracts
| Channel | Direction | Payload | Description |
| --- | --- | --- | --- |
| `tiler:loadImage` | renderer → main | `{ path: string, settings: DocumentSettings & GridSettings & GuideSettings }` | Request metadata + initial tiled preview. |
| `tiler:imageReady` | main → renderer | `{ imageMeta, tiles, previewPath }` | Returns processed preview textures + tile counts. |
| `tiler:export` | renderer → main | `{ imagePath, settings: DocumentSettings, grid: GridSettings, guides: GuideSettings, export: ExportSettings }` | Kick off export job. |
| `tiler:progress` | main → renderer | `{ jobId, step, progress, message? }` | Streaming status updates for progress modal. |
| `tiler:complete` | main → renderer | `{ jobId, outputPaths }` | Signals job success + files. |
| `tiler:error` | main → renderer | `{ jobId, error }` | Propagates failure details. |
| `printing:run` | renderer → main | `{ jobId, pdfPath, options }` | Requests OS print dialog. |
| `project:save` | renderer → main | `{ path, payload: ProjectFile }` | Persist project JSON.
| `project:load` | renderer → main | `{ path }` | Load project + verify assets.

Main process validates incoming payloads using Zod schema mirrors to prevent malformed data.

## Project File Format
```ts
interface ProjectFile {
  schemaVersion: 1;
  document: DocumentSettings;
  grid: GridSettings;
  guides: GuideSettings;
  export: Omit<ExportSettings, 'destination'>;
  image: { path: string; width: number; height: number; checksum: string };
  createdAt: string; // ISO
  updatedAt: string;
}
```
- Stored as JSON with `.poster.json` extension.  
- Includes checksum for relinking detection; missing files trigger relink dialog.

## Derived Data Calculations
- **Tile counts** derived from document + grid settings (auto-fit uses DPI, paper size, margins, overlap).  
- **Poster size** computed as `(tile printable width × cols - overlap adjustments)`.  
- **Material usage**: pages = rows × cols; area mm² for display in metrics bar.

## Persistence Strategy
- Autosave throttle: writes project snapshot every 30 seconds or when idle for 5 seconds after change.  
- Recent files stored via Electron `appData` path in `recentProjects.json`.  
- Export history kept in memory per session for quick re-run.

## Error & Validation Schema
- Frontend ensures numeric inputs stay within ranges; invalid inputs show inline errors and disable Export button.  
- Main process re-validates before handing data to tiler worker.  
- All IPC responses include `jobId` for correlation.
