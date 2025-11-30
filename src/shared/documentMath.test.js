const {
  normalizeGrid,
  mmToPx,
  pxToMm,
  computeGeometry,
  computeTilePayload,
  suggestGridForImage
} = require('./documentMath');

const baseDocument = {
  paperSize: 'A4',
  orientation: 'portrait',
  dpi: 300,
  marginMm: 5,
  overlapMm: 3
};

const baseGrid = { rows: 3, cols: 4 };

describe('normalizeGrid', () => {
  it('forces finite positive integers for rows/cols', () => {
    expect(normalizeGrid({ rows: 0, cols: -10 })).toEqual({ rows: 1, cols: 1 });
    expect(normalizeGrid({ rows: 2.2, cols: '5' })).toEqual({ rows: 2, cols: 5 });
    expect(normalizeGrid({})).toEqual({ rows: 1, cols: 1 });
  });
});

describe('mmToPx', () => {
  it('converts millimeters to pixels given dpi', () => {
    expect(mmToPx(25.4, 300)).toBe(300);
    expect(mmToPx(0, 300)).toBe(0);
    expect(mmToPx(undefined, undefined)).toBe(0);
  });
});

describe('pxToMm', () => {
  it('converts pixels back to millimeters', () => {
    expect(pxToMm(300, 300)).toBeCloseTo(25.4, 5);
    expect(pxToMm(0, 300)).toBe(0);
    expect(pxToMm(undefined, undefined)).toBe(0);
  });
});

describe('computeGeometry', () => {
  it('calculates canvas and page metrics for portrait A4', () => {
    const geometry = computeGeometry(baseDocument, baseGrid);
    expect(geometry.pageWidthPx).toBeGreaterThan(0);
    expect(geometry.pageHeightPx).toBeGreaterThan(geometry.pageWidthPx);
    expect(geometry.printableWidthPx).toBeLessThan(geometry.pageWidthPx);
    expect(geometry.canvasWidthPx).toBeGreaterThan(geometry.printableWidthPx);
    expect(geometry.stepX).toBe(geometry.printableWidthPx - geometry.overlapPx);
    expect(geometry.pageWidthPt).toBeCloseTo((geometry.pageWidthPx / baseDocument.dpi) * 72, 5);
  });

  it('swaps width/height for landscape layouts', () => {
    const portrait = computeGeometry(baseDocument, baseGrid);
    const landscape = computeGeometry({ ...baseDocument, orientation: 'landscape' }, baseGrid);
    expect(landscape.pageWidthPx).toBe(portrait.pageHeightPx);
    expect(landscape.pageHeightPx).toBe(portrait.pageWidthPx);
  });
});

describe('suggestGridForImage', () => {
  it('prefers a single page when the source fits comfortably', () => {
    const suggestion = suggestGridForImage({ width: 2400, height: 3600 }, baseDocument);
    expect(suggestion).not.toBeNull();
    expect(suggestion.rows).toBe(1);
    expect(suggestion.cols).toBe(1);
    expect(suggestion.requiresUpscale).toBe(false);
  });

  it('adds more columns for very wide images', () => {
    const suggestion = suggestGridForImage({ width: 9000, height: 1800 }, baseDocument);
    expect(suggestion).not.toBeNull();
    expect(suggestion.rows).toBe(1);
    expect(suggestion.cols).toBeGreaterThan(1);
  });

  it('ensures the poster canvas fully contains the source dimensions when possible', () => {
    const suggestion = suggestGridForImage({ width: 10240, height: 6680 }, baseDocument);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.rows).toBeGreaterThanOrEqual(2);
    expect(suggestion?.cols).toBeGreaterThanOrEqual(5);
    expect(Math.round(suggestion.posterSizeMm.width)).toBeGreaterThanOrEqual(Math.round(pxToMm(10240, baseDocument.dpi)));
    expect(Math.round(suggestion.posterSizeMm.height)).toBeGreaterThanOrEqual(Math.round(pxToMm(6680, baseDocument.dpi)));
    expect(suggestion.requiresDownscale).toBe(false);
  });

  it('falls back to minimal upscale when the source is too small', () => {
    const suggestion = suggestGridForImage({ width: 800, height: 600 }, baseDocument);
    expect(suggestion).not.toBeNull();
    expect(suggestion.requiresUpscale).toBe(true);
    expect(suggestion.pageCount).toBe(1);
  });
});

describe('computeTilePayload', () => {
  it('returns printable area and poster size in millimeters', () => {
    const payload = computeTilePayload(baseDocument, baseGrid);
    expect(payload.pageCount).toBe(12);
    expect(payload.printableAreaMm).toEqual({ width: 200, height: 287 });
    expect(Math.round(payload.posterSizeMm.width)).toBe(791);
    expect(Math.round(payload.posterSizeMm.height)).toBe(855);
  });

  it('guards against invalid grid values', () => {
    const payload = computeTilePayload(baseDocument, { rows: 0, cols: NaN });
    expect(payload.rows).toBe(1);
    expect(payload.cols).toBe(1);
    expect(payload.pageCount).toBe(1);
  });
});
