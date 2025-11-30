import type {
  AppStore,
  DocumentSettings,
  GridSettings,
  HistorySnapshot,
  HistoryState,
  TilesState
} from './useAppStore';

export const PAPER_SIZES_MM: Record<DocumentSettings['paperSize'], { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 }
};

export const computeTilesState = (document: DocumentSettings, grid: GridSettings): TilesState => {
  const base = { ...PAPER_SIZES_MM[document.paperSize] };
  const widthMm = document.orientation === 'landscape' ? base.height : base.width;
  const heightMm = document.orientation === 'landscape' ? base.width : base.height;
  const printableWidth = Math.max(0, widthMm - document.marginMm * 2);
  const printableHeight = Math.max(0, heightMm - document.marginMm * 2);
  const posterWidth = printableWidth * grid.cols - Math.max(0, grid.cols - 1) * document.overlapMm;
  const posterHeight = printableHeight * grid.rows - Math.max(0, grid.rows - 1) * document.overlapMm;
  return {
    rows: grid.rows,
    cols: grid.cols,
    posterSizeMm: { width: Math.max(posterWidth, 0), height: Math.max(posterHeight, 0) },
    printableAreaMm: { width: printableWidth, height: printableHeight },
    pageCount: grid.rows * grid.cols,
    previewOverlay: createOverlay()
  };
};

const createOverlay = (): TilesState['previewOverlay'] => [
  { id: 'margin', type: 'margin', label: 'Margin', color: 'rgba(248,113,113,0.25)' },
  { id: 'overlap', type: 'overlap', label: 'Overlap', color: 'rgba(250,204,21,0.25)' },
  { id: 'tile', type: 'tile', label: 'Tile', color: 'rgba(56,189,248,0.25)' }
];

export const snapshotState = (state: AppStore): HistorySnapshot => ({
  document: { ...state.document },
  grid: { ...state.grid },
  guides: { ...state.guides },
  export: { ...state.export }
});

export const pushHistory = (history: HistoryState, snapshot: HistorySnapshot): HistoryState => ({
  past: [...history.past, snapshot].slice(-20),
  future: []
});

export const upsertRecent = (list: AppStore['metadata']['recentFiles'], path: string, thumbnail = '') => {
  const filtered = list.filter((item) => item.path !== path);
  return [{ path, thumbnail, updatedAt: Date.now() }, ...filtered].slice(0, 6);
};
