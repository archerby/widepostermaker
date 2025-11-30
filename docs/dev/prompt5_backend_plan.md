# Backend / Image Engine Plan

## Overview
The renderer issues high-level tiling requests via IPC. The main process orchestrates a dedicated worker responsible for CPU-intensive slicing using either:
1. **Node-based pipeline (default):** built on [`sharp`](https://sharp.pixelplumbing.com/) for raster resizing/cropping.  
2. **Python bridge (fallback/compat):** spawns `image_to_a4_tiles.py` via child_process for parity with existing script.

Both paths must emit uniform progress events so the UI can stay agnostic.

## Module Structure
```
app/
├─ main/
│  ├─ ipcHandlers/tiler.ts
│  ├─ services/ImageEngine.ts   // strategy wrapper
│  ├─ services/NodeTilerWorker.ts
│  ├─ services/PythonTilerWorker.ts
│  └─ services/PrintService.ts
└─ workers/
   └─ nodeTilerWorker.ts        // runs in worker thread
```

### `ImageEngine` (TypeScript)
```ts
interface TilingRequest {
  jobId: string;
  imagePath: string;
  document: DocumentSettings;
  grid: GridSettings;
  guides: GuideSettings;
  export: ExportSettings;
}

interface ImageEngine {
  slice(request: TilingRequest): Promise<TilingResult>;
  cancel(jobId: string): void;
}
```
- Detects environment (GPU acceleration availability, Python presence).  
- Chooses Node worker by default; falls back to Python if sharp fails or unsupported image format arises.

### Worker Thread (Node Sharp)
- Receives serialized request via `parentPort`.  
- Steps: load image → scale canvas → compute tiles → crop/paste per tile → render guides/labels via Canvas API → export.
- Exports as:  
  - PDF: use `pdf-lib` to assemble pages.  
  - PNG/JPG: `sharp` pipeline writes to temp folder.
- Emits progress events: `queued`, `slicing` (per tile), `rendering` (guide overlay), `packaging` (writing files), `done`.

### Python Bridge
- Launch command:  
  `python image_to_a4_tiles.py --input <img> --output-dir <tmp> --dpi <dpi> ... --format png --add-guides`.  
- Provide JSON settings via temp file or env var.  
- Capture stdout lines; parse for `PROGRESS step=... pct=...` markers to mirror Node events.  
- Convert resulting files into standard result payload.

## Command Signatures
```ts
// Node IPC -> Worker
parentPort.postMessage({ type: 'start', request });
parentPort.postMessage({ type: 'cancel', jobId });

// Worker -> Main
parentPort.postMessage({ type: 'progress', jobId, step: 'slicing', progress: 0.42 });
parentPort.postMessage({ type: 'complete', jobId, output: { files, previewPdf } });
parentPort.postMessage({ type: 'error', jobId, error: message });
```

```bash
# Python bridge invocation
python image_to_a4_tiles.py \
  --input "{imagePath}" \
  --output-dir "{tmpDir}" \
  --dpi {dpi} \
  --orientation {orientation} \
  --margin-mm {margin} \
  --overlap-mm {overlap} \
  --format {format} \
  {--add-guides if guides enabled}
```

## Progress Event Semantics
| Step | Description | Progress Calculation |
| --- | --- | --- |
| `queued` | job accepted, awaiting worker | 0 |
| `slicing` | cropping tiles | tileIndex / totalTiles |
| `rendering` | applying guides, labels | tileIndex / totalTiles |
| `packaging` | writing files, bundling PDF | bytesWritten / totalBytes |
| `printing` | sending to OS dialog | pageIndex / totalPages |
| `done` | success | 1 |
| `error` | failure | n/a |

## Temp Storage & Cleanup
- Each job gets `app.getPath('temp')/postermaker/<jobId>`.  
- After success, files move to destination folder (and optional printer). Temp cleaned on completion or app launch.

## Printing Flow
1. After export (PDF), `PrintService` loads PDF into hidden BrowserWindow.  
2. Calls `webContents.print({ silent: false, margins: 'default', pageSize: 'A4' })`.  
3. Emits `printing` progress events until callback resolves or rejects.  
4. On cancel/error, surfaces dialog & retains exported PDF so user can retry.

## Error Handling
- Worker exceptions bubble via `error` events with stack traces stored in logs.  
- Python bridge monitors exit codes; non-zero exit triggers fallback suggestion.  
- All errors captured by crash reporter stub + optional telemetry.
