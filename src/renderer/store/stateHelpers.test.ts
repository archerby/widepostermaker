import { describe, expect, it } from 'vitest';
import { computeTilesState, pushHistory, upsertRecent } from './stateHelpers';
import type {
  DocumentSettings,
  GridSettings,
  HistorySnapshot,
  HistoryState,
  ProjectMetadata
} from './useAppStore';

const baseDocument: DocumentSettings = {
  paperSize: 'A4',
  orientation: 'portrait',
  dpi: 300,
  marginMm: 5,
  overlapMm: 3
};

const baseGrid: GridSettings = {
  rows: 3,
  cols: 4,
  autoFit: false,
  lockAspect: true
};

describe('computeTilesState', () => {
  it('calculates printable area and poster dimensions for portrait layouts', () => {
    const tiles = computeTilesState(baseDocument, baseGrid);
    expect(tiles.pageCount).toBe(12);
    expect(tiles.printableAreaMm).toEqual({ width: 200, height: 287 });
    expect(Math.round(tiles.posterSizeMm.width)).toBe(791);
    expect(Math.round(tiles.posterSizeMm.height)).toBe(855);
  });

  it('swaps dimensions for landscape layouts', () => {
    const tiles = computeTilesState({ ...baseDocument, orientation: 'landscape' }, baseGrid);
    expect(tiles.printableAreaMm.width).toBe(287);
    expect(tiles.printableAreaMm.height).toBe(200);
  });
});

describe('pushHistory', () => {
  const emptyHistory: HistoryState = { past: [], future: [] };
  const snapshot: HistorySnapshot = {
    document: baseDocument,
    grid: baseGrid,
    guides: {
      cropMarks: true,
      tileLabels: true,
      bleedMm: 0,
      showGuidesInPreview: true
    },
    export: {
      format: 'pdf',
      destination: '',
      namingTemplate: 'tile_{row}_{col}',
      openAfterExport: false,
      sendToPrinter: false,
      monochrome: false
    }
  };

  it('appends snapshots and clears future history', () => {
    const next = pushHistory(emptyHistory, snapshot);
    expect(next.past).toHaveLength(1);
    expect(next.future).toHaveLength(0);
  });

  it('keeps a rolling window of 20 snapshots', () => {
    const history: HistoryState = {
      past: Array.from({ length: 20 }, () => snapshot),
      future: [snapshot]
    };
    const next = pushHistory(history, snapshot);
    expect(next.past).toHaveLength(20);
    expect(next.future).toHaveLength(0);
  });
});

describe('upsertRecent', () => {
  const recentFiles: ProjectMetadata['recentFiles'] = [
    { path: 'foo.poster.json', thumbnail: '', updatedAt: Date.now() - 10 },
    { path: 'bar.poster.json', thumbnail: '', updatedAt: Date.now() - 5 }
  ];

  it('deduplicates by path and moves entry to front', () => {
    const updated = upsertRecent(recentFiles, 'foo.poster.json', 'thumb');
    expect(updated[0].path).toBe('foo.poster.json');
    expect(updated[0].thumbnail).toBe('thumb');
    expect(updated).toHaveLength(2);
  });

  it('caps the list at six entries', () => {
    const seed = Array.from({ length: 6 }, (_, index) => ({
      path: `project-${index}.poster.json`,
      thumbnail: '',
      updatedAt: index
    }));
    const updated = upsertRecent(seed as ProjectMetadata['recentFiles'], 'new.poster.json');
    expect(updated).toHaveLength(6);
    expect(updated[0].path).toBe('new.poster.json');
  });
});
