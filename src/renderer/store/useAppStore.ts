import { create } from 'zustand';
import { computeTilesState, pushHistory, snapshotState, upsertRecent } from './stateHelpers';
import { FALLBACK_LOCALE, normalizeLocale } from '../i18n/locales';

export type ViewState = 'empty' | 'loading' | 'ready' | 'exporting' | 'printing' | 'error';
export type Mode = 'preview' | 'settings' | 'export' | 'learn';

export interface DocumentSettings {
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  dpi: number; // 72–600
  marginMm: number;
  overlapMm: number;
}

export interface GridSettings {
  autoFit: boolean;
  rows: number;
  cols: number;
  lockAspect: boolean;
}

export interface GuideSettings {
  cropMarks: boolean;
  tileLabels: boolean;
  bleedMm: number;
  showGuidesInPreview: boolean;
}

export interface ExportSettings {
  format: 'pdf' | 'png' | 'jpg';
  destination: string;
  namingTemplate: string;
  openAfterExport: boolean;
  sendToPrinter: boolean;
  monochrome: boolean;
}

export interface JobStatus {
  id: string | null;
  step: 'idle' | 'queued' | 'slicing' | 'rendering' | 'packaging' | 'printing' | 'done' | 'error';
  progress: number;
  message?: string;
  error?: string;
}

export interface TileOverlay {
  id: string;
  type: 'margin' | 'overlap' | 'tile';
  label: string;
  color: string;
}

export interface TilesState {
  rows: number;
  cols: number;
  posterSizeMm: { width: number; height: number };
  printableAreaMm: { width: number; height: number };
  pageCount: number;
  previewOverlay: TileOverlay[];
}

export interface ProjectMetadata {
  projectPath?: string;
  recentFiles: Array<{ path: string; thumbnail: string; updatedAt: number }>;
  dirty: boolean;
  lastSavedAt?: string;
}

export interface Preferences {
  locale: string;
  unitSystem: 'metric' | 'imperial';
  textScale: number; // multiplier 0.9–1.2
  highContrast: boolean;
}

export interface ImageAsset {
  path: string;
  width: number;
  height: number;
  thumbnail: string;
  previewDataUrl?: string;
}

export interface ProjectFile {
  schemaVersion: 1;
  document: DocumentSettings;
  grid: GridSettings;
  guides: GuideSettings;
  export: Omit<ExportSettings, 'destination'>;
  image: { path: string; width: number; height: number; checksum: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistorySnapshot {
  document: DocumentSettings;
  grid: GridSettings;
  guides: GuideSettings;
  export: ExportSettings;
}

export interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
}

export interface AppStore {
  viewState: ViewState;
  mode: Mode;
  document: DocumentSettings;
  grid: GridSettings;
  guides: GuideSettings;
  export: ExportSettings;
  job: JobStatus;
  metadata: ProjectMetadata;
  preferences: Preferences;
  image?: ImageAsset;
  tiles: TilesState;
  statusMessage: string;
  history: HistoryState;
  setMode: (mode: Mode) => void;
  setViewState: (state: ViewState) => void;
  setDocument: (partial: Partial<DocumentSettings>) => void;
  setGrid: (partial: Partial<GridSettings>) => void;
  setGuides: (partial: Partial<GuideSettings>) => void;
  setExport: (partial: Partial<ExportSettings>) => void;
  loadImage: (path: string) => Promise<void>;
  startExport: () => Promise<void>;
  cancelExport: () => Promise<void>;
  recordJobUpdate: (job: Partial<JobStatus>) => void;
  markDirty: (dirty: boolean) => void;
  saveProject: (path?: string) => Promise<void>;
  loadProject: (path?: string) => Promise<void>;
  setPreferences: (partial: Partial<Preferences>) => void;
  undo: () => void;
  redo: () => void;
}

const initialJob: JobStatus = {
  id: null,
  step: 'idle',
  progress: 0
};

const generateJobId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `job-${Date.now()}`;
};

const detectLocale = () => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLocale(navigator.language);
  }
  return FALLBACK_LOCALE;
};


type RendererImageReadyPayload = {
  jobId: string;
  imageMeta: ImageAsset;
  tiles?: Partial<TilesState> & { rows: number; cols: number };
  previewPath?: string;
  recommendedGrid?: {
    rows: number;
    cols: number;
    pageCount: number;
    reason?: string;
    wasteRatio?: number;
    resolutionScale?: number;
    requiresUpscale?: boolean;
  };
};

type RendererJobProgressPayload = {
  jobId: string;
  step: JobStatus['step'];
  progress: number;
  message?: string;
};

type RendererJobCompletePayload = {
  jobId: string;
  outputPaths: string[];
};

type RendererJobErrorPayload = {
  jobId: string;
  error: string;
};

let ipcListenersBound = false;

const bindIpcListeners = (set: (fn: (state: AppStore) => Partial<AppStore>) => void, get: () => AppStore) => {
  if (ipcListenersBound || typeof window === 'undefined' || !window.posterAPI) {
    return;
  }
  ipcListenersBound = true;
  window.posterAPI.onImageReady?.(async (payload: RendererImageReadyPayload) => {
    let previewDataUrl: string | undefined;
    if (payload.previewPath && window.posterAPI?.readPreview) {
      previewDataUrl = (await window.posterAPI.readPreview(payload.previewPath)) ?? undefined;
    }
    set((state) => {
      const recommendation = payload.recommendedGrid;
      const shouldApplyRecommendation = Boolean(
        state.grid.autoFit &&
        recommendation &&
        (recommendation.rows !== state.grid.rows || recommendation.cols !== state.grid.cols)
      );
      const nextGrid = shouldApplyRecommendation
        ? { ...state.grid, rows: recommendation!.rows, cols: recommendation!.cols }
        : state.grid;
      const nextTiles = computeTilesState(state.document, nextGrid);
      const mergedTiles: TilesState = {
        ...nextTiles,
        ...payload.tiles,
        rows: nextTiles.rows,
        cols: nextTiles.cols,
        previewOverlay: payload.tiles?.previewOverlay ?? nextTiles.previewOverlay
      };
      return {
        grid: nextGrid,
        tiles: mergedTiles,
        history: shouldApplyRecommendation ? pushHistory(state.history, snapshotState(state)) : state.history,
        image: { ...payload.imageMeta, previewDataUrl: previewDataUrl ?? state.image?.previewDataUrl },
        viewState: 'ready',
        statusMessage: recommendation?.reason ?? 'Preview ready',
        metadata: {
          ...state.metadata,
          dirty: true,
          recentFiles: upsertRecent(state.metadata.recentFiles, payload.imageMeta.path, payload.previewPath ?? '')
        }
      };
    });
  });

  window.posterAPI.onJobProgress?.((payload: RendererJobProgressPayload) => {
    const current = get().job;
    if (current.id !== payload.jobId) return;
    set(() => ({ job: { ...current, step: payload.step, progress: payload.progress, message: payload.message } }));
  });

  window.posterAPI.onJobComplete?.((payload: RendererJobCompletePayload) => {
    const current = get().job;
    if (current.id !== payload.jobId) return;
    set((state) => ({
      job: { ...state.job, step: 'done', progress: 1, message: 'Export complete' },
      viewState: 'ready',
      metadata: { ...state.metadata, dirty: false },
      statusMessage: `Export finished · ${payload.outputPaths.length} files`
    }));
  });

  window.posterAPI.onJobError?.((payload: RendererJobErrorPayload) => {
    const current = get().job;
    if (current.id !== payload.jobId) return;
    set(() => ({
      job: { ...current, step: 'error', progress: current.progress, error: payload.error },
      viewState: 'error',
      statusMessage: payload.error
    }));
  });
};

const simulateImageReady = (path: string, set: (fn: (state: AppStore) => Partial<AppStore>) => void, get: () => AppStore) => {
  const tiles = computeTilesState(get().document, get().grid);
  setTimeout(() => {
    set((state) => ({
      image: {
        path,
        width: 4800,
        height: 3200,
        thumbnail: ''
      },
      tiles,
      viewState: 'ready',
      statusMessage: 'Preview ready',
      metadata: {
        ...state.metadata,
        dirty: true,
        recentFiles: upsertRecent(state.metadata.recentFiles, path)
      }
    }));
  }, 600);
};

const simulateExport = (jobId: string, set: (fn: (state: AppStore) => Partial<AppStore>) => void, get: () => AppStore) => {
  const steps: JobStatus['step'][] = ['queued', 'slicing', 'rendering', 'packaging'];
  let progress = 0;
  let index = 0;
  const interval = setInterval(() => {
    const current = get().job;
    if (current.id !== jobId || get().viewState !== 'exporting') {
      clearInterval(interval);
      return;
    }
    progress = Math.min(progress + 0.15, 1);
    if (progress > (index + 1) / steps.length && index < steps.length - 1) {
      index += 1;
    }
  set(() => ({ job: { ...current, progress, step: steps[index], message: `Step ${index + 1} of ${steps.length}` } }));
    if (progress >= 1) {
      clearInterval(interval);
      setTimeout(() => {
        set((state) => ({
          job: { ...state.job, step: 'done', progress: 1, message: 'Export complete' },
          viewState: 'ready',
          metadata: { ...state.metadata, dirty: false },
          statusMessage: 'Export finished – files ready'
        }));
      }, 300);
    }
  }, 600);
};

export const useAppStore = create<AppStore>((set, get) => {
  bindIpcListeners(set, get);

  const document: DocumentSettings = {
    paperSize: 'A4',
    orientation: 'portrait',
    dpi: 300,
    marginMm: 5,
    overlapMm: 3
  };

  const grid: GridSettings = {
    rows: 3,
    cols: 4,
    autoFit: true,
    lockAspect: true
  };

  const guides: GuideSettings = {
    cropMarks: true,
    tileLabels: true,
    bleedMm: 0,
    showGuidesInPreview: true
  };

  const exportSettings: ExportSettings = {
    format: 'pdf',
    destination: '',
    namingTemplate: 'tile_r{row}_c{col}',
    openAfterExport: true,
    sendToPrinter: false,
    monochrome: false
  };

  const tiles = computeTilesState(document, grid);

  const preferences: Preferences = {
    locale: detectLocale(),
    unitSystem: 'metric',
    textScale: 1,
    highContrast: false
  };

  return {
    viewState: 'empty',
    mode: 'preview',
    document,
    grid,
    guides,
    export: exportSettings,
    job: initialJob,
    metadata: {
      dirty: false,
      recentFiles: []
    },
    preferences,
    tiles,
    statusMessage: 'Drop an image to get started',
    history: { past: [], future: [] },

    setMode: (mode) => set({ mode }),
    setViewState: (state) => set({ viewState: state }),

    setDocument: (partial) =>
      set((state) => {
        const next = { ...state.document, ...partial };
        return {
          document: next,
          tiles: computeTilesState(next, state.grid),
          metadata: { ...state.metadata, dirty: true },
          history: pushHistory(state.history, snapshotState(state))
        };
      }),

    setGrid: (partial) =>
      set((state) => {
        const next = { ...state.grid, ...partial };
        const nextTiles = computeTilesState(state.document, next);
        const statusMessage = `Row count ${next.rows}, column count ${next.cols}, poster ${Math.round(nextTiles.posterSizeMm.width)} × ${Math.round(nextTiles.posterSizeMm.height)} mm`;
        return {
          grid: next,
          tiles: nextTiles,
          metadata: { ...state.metadata, dirty: true },
          history: pushHistory(state.history, snapshotState(state)),
          statusMessage
        };
      }),

    setGuides: (partial) =>
      set((state) => ({
        guides: { ...state.guides, ...partial },
        metadata: { ...state.metadata, dirty: true },
        history: pushHistory(state.history, snapshotState(state))
      })),

    setExport: (partial) =>
      set((state) => ({
        export: { ...state.export, ...partial },
        metadata: { ...state.metadata, dirty: true },
        history: pushHistory(state.history, snapshotState(state))
      })),

    loadImage: async (path: string) => {
      set({ viewState: 'loading', statusMessage: 'Analyzing image…' });
      const payload = {
        path,
        settings: get().document,
        grid: get().grid,
        guides: get().guides
      };
      if (window.posterAPI?.loadImage) {
        await window.posterAPI.loadImage(payload);
      } else {
        simulateImageReady(path, set, get);
      }
    },

    startExport: async () => {
      const state = get();
      if (!state.image) {
        set({ statusMessage: 'Load an image before exporting' });
        return;
      }
  const tempJobId = generateJobId();
      set({
        viewState: 'exporting',
        mode: 'export',
        job: {
          id: tempJobId,
          step: 'queued',
          progress: 0,
          message: 'Preparing export queue'
        }
      });
      const payload = {
        imagePath: state.image.path,
        settings: state.document,
        grid: state.grid,
        guides: state.guides,
        export: state.export
      };
      if (window.posterAPI?.startExport) {
        const response = await window.posterAPI.startExport(payload);
        if (response?.jobId) {
          set((current) => ({ job: { ...current.job, id: response.jobId } }));
        }
      } else {
        simulateExport(tempJobId, set, get);
      }
    },

    cancelExport: async () => {
      const jobId = get().job.id;
      if (jobId && window.posterAPI?.cancelExport) {
        await window.posterAPI.cancelExport(jobId);
      }
      set((state) => ({
        viewState: 'ready',
        job: initialJob,
        statusMessage: 'Export canceled',
        metadata: { ...state.metadata, dirty: true }
      }));
    },

    recordJobUpdate: (job) => set((state) => ({ job: { ...state.job, ...job } })),

    markDirty: (dirty) => set((state) => ({ metadata: { ...state.metadata, dirty } })),

    setPreferences: (partial) =>
      set((state) => ({
        preferences: { ...state.preferences, ...partial }
      })),

    saveProject: async (path?: string) => {
      const state = get();
      const { destination, ...exportWithoutDestination } = state.export;
      const payload: ProjectFile = {
        schemaVersion: 1,
        document: state.document,
        grid: state.grid,
        guides: state.guides,
        export: exportWithoutDestination,
        image: state.image
          ? {
              path: state.image.path,
              width: state.image.width,
              height: state.image.height,
              checksum: 'dev'
            }
          : null,
        createdAt: state.metadata.lastSavedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (window.posterAPI?.saveProject) {
        const result = await window.posterAPI.saveProject({ path, payload, destination });
        if (result?.path) {
          set((current) => ({
            metadata: {
              ...current.metadata,
              dirty: false,
              projectPath: result.path,
              lastSavedAt: new Date().toISOString(),
              recentFiles: upsertRecent(current.metadata.recentFiles, result.path)
            }
          }));
        }
      }
    },

    loadProject: async (path?: string) => {
      if (!window.posterAPI?.loadProject) return;
      const result = await window.posterAPI.loadProject(path);
      if (!result) return;
      const { payload: filePayload, path: projectPath } = result;
      set({
        document: filePayload.document,
        grid: filePayload.grid,
        guides: filePayload.guides,
        export: {
          ...get().export,
          ...filePayload.export,
          destination: get().export.destination
        },
        tiles: computeTilesState(filePayload.document, filePayload.grid),
        viewState: 'ready',
        image: filePayload.image
          ? {
              path: filePayload.image.path,
              width: filePayload.image.width,
              height: filePayload.image.height,
              thumbnail: '',
              previewDataUrl: get().image?.previewDataUrl
            }
          : get().image,
        metadata: {
          projectPath,
          dirty: false,
          lastSavedAt: filePayload.updatedAt,
          recentFiles: upsertRecent(get().metadata.recentFiles, projectPath)
        },
        statusMessage: 'Project loaded',
        history: { past: [], future: [] }
      });
    },

    undo: () =>
      set((state) => {
        if (!state.history.past.length) return {};
        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, -1);
        const snapshot = snapshotState(state);
        return {
          document: { ...previous.document },
          grid: { ...previous.grid },
          guides: { ...previous.guides },
          export: { ...previous.export },
          tiles: computeTilesState(previous.document, previous.grid),
          history: { past: newPast, future: [snapshot, ...state.history.future] },
          metadata: { ...state.metadata, dirty: true }
        };
      }),

    redo: () =>
      set((state) => {
        if (!state.history.future.length) return {};
        const next = state.history.future[0];
        const newFuture = state.history.future.slice(1);
        const snapshot = snapshotState(state);
        return {
          document: { ...next.document },
          grid: { ...next.grid },
          guides: { ...next.guides },
          export: { ...next.export },
          tiles: computeTilesState(next.document, next.grid),
          history: { past: [...state.history.past, snapshot], future: newFuture },
          metadata: { ...state.metadata, dirty: true }
        };
      })
  };
});
