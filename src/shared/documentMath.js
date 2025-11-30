const MM_PER_INCH = 25.4;

const PAPER_SIZES_MM = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 }
};

const clampDimension = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(fallback, Math.round(parsed));
};

const normalizeGrid = (grid = {}) => ({
  rows: clampDimension(grid.rows, 1),
  cols: clampDimension(grid.cols, 1)
});

const mmToPx = (mm, dpi) => {
  const value = Number(mm) || 0;
  const resolvedDpi = Math.max(1, Number(dpi) || 1);
  return Math.round((value / MM_PER_INCH) * resolvedDpi);
};

const pxToMm = (px, dpi) => {
  const value = Number(px) || 0;
  const resolvedDpi = Math.max(1, Number(dpi) || 1);
  return (value / resolvedDpi) * MM_PER_INCH;
};

const computeGeometry = (document = {}, grid = { rows: 1, cols: 1 }) => {
  const dpi = Math.max(1, Number(document.dpi) || 1);
  const marginMm = Math.max(0, Number(document.marginMm) || 0);
  const overlapMm = Math.max(0, Number(document.overlapMm) || 0);
  const base = PAPER_SIZES_MM[document.paperSize] || PAPER_SIZES_MM.A4;
  const widthMm = document.orientation === 'landscape' ? base.height : base.width;
  const heightMm = document.orientation === 'landscape' ? base.width : base.height;
  const pageWidthPx = mmToPx(widthMm, dpi);
  const pageHeightPx = mmToPx(heightMm, dpi);
  const marginPx = mmToPx(marginMm, dpi);
  const overlapPx = mmToPx(overlapMm, dpi);
  const printableWidthPx = Math.max(0, pageWidthPx - marginPx * 2);
  const printableHeightPx = Math.max(0, pageHeightPx - marginPx * 2);
  const stepX = Math.max(1, printableWidthPx - overlapPx);
  const stepY = Math.max(1, printableHeightPx - overlapPx);
  const canvasWidthPx = printableWidthPx + Math.max(0, grid.cols - 1) * stepX;
  const canvasHeightPx = printableHeightPx + Math.max(0, grid.rows - 1) * stepY;

  return {
    pageWidthPx,
    pageHeightPx,
    pageWidthPt: (pageWidthPx / dpi) * 72,
    pageHeightPt: (pageHeightPx / dpi) * 72,
    marginPx,
    overlapPx,
    printableWidthPx,
    printableHeightPx,
    stepX,
    stepY,
    canvasWidthPx,
    canvasHeightPx
  };
};

const computeTilePayload = (document = {}, grid = { rows: 1, cols: 1 }) => {
  const normalizedGrid = normalizeGrid(grid);
  const base = PAPER_SIZES_MM[document.paperSize] || PAPER_SIZES_MM.A4;
  const widthMm = document.orientation === 'landscape' ? base.height : base.width;
  const heightMm = document.orientation === 'landscape' ? base.width : base.height;
  const margin = Math.max(0, Number(document.marginMm) || 0);
  const overlap = Math.max(0, Number(document.overlapMm) || 0);
  const printableWidth = Math.max(0, widthMm - margin * 2);
  const printableHeight = Math.max(0, heightMm - margin * 2);
  const posterWidth = printableWidth * normalizedGrid.cols - Math.max(0, normalizedGrid.cols - 1) * overlap;
  const posterHeight = printableHeight * normalizedGrid.rows - Math.max(0, normalizedGrid.rows - 1) * overlap;

  return {
    rows: normalizedGrid.rows,
    cols: normalizedGrid.cols,
    printableAreaMm: { width: printableWidth, height: printableHeight },
    posterSizeMm: { width: Math.max(posterWidth, 0), height: Math.max(posterHeight, 0) },
    pageCount: normalizedGrid.rows * normalizedGrid.cols
  };
};

const DEFAULT_SUGGESTION_LIMITS = {
  maxRows: 10,
  maxCols: 10,
  maxPages: 40,
  maxUpscaleFactor: 1.35,
  fallbackUpscaleFactor: 6
};

const evaluateGridCandidates = (imagePx, document, limits, upscaleLimit) => {
  const candidates = [];
  const aspectImage = imagePx.width / imagePx.height;
  for (let rows = 1; rows <= limits.maxRows; rows += 1) {
    for (let cols = 1; cols <= limits.maxCols; cols += 1) {
      const pageCount = rows * cols;
      if (limits.maxPages && pageCount > limits.maxPages) {
        continue;
      }
      const geometry = computeGeometry(document, { rows, cols });
      if (!geometry.canvasWidthPx || !geometry.canvasHeightPx) {
        continue;
      }
      const widthScale = imagePx.width / geometry.canvasWidthPx;
      const heightScale = imagePx.height / geometry.canvasHeightPx;
      const minScale = Math.min(widthScale, heightScale);
      const safeScale = Math.max(minScale, 1e-6);
      const upscaleFactor = minScale >= 1 ? 1 : 1 / safeScale;
      if (upscaleFactor > upscaleLimit) {
        continue;
      }
      const requiresDownscale = geometry.canvasWidthPx + 0.5 < imagePx.width || geometry.canvasHeightPx + 0.5 < imagePx.height;
      const aspectPoster = geometry.canvasWidthPx / geometry.canvasHeightPx;
      const aspectDiff = Math.abs(aspectPoster - aspectImage) / aspectImage;
      const detailPenalty = Math.abs(minScale - 1);
      candidates.push({
        rows,
        cols,
        pageCount,
        geometry,
        aspectDiff,
        detailPenalty,
        upscaleFactor,
        minScale,
        requiresDownscale
      });
    }
  }

  candidates.sort((a, b) => {
    if (a.requiresDownscale !== b.requiresDownscale) {
      return a.requiresDownscale ? 1 : -1;
    }
    if (a.detailPenalty !== b.detailPenalty) {
      return a.detailPenalty - b.detailPenalty;
    }
    if (a.aspectDiff !== b.aspectDiff) {
      return a.aspectDiff - b.aspectDiff;
    }
    if (a.pageCount !== b.pageCount) {
      return a.pageCount - b.pageCount;
    }
    const areaA = a.geometry.canvasWidthPx * a.geometry.canvasHeightPx;
    const areaB = b.geometry.canvasWidthPx * b.geometry.canvasHeightPx;
    if (areaA !== areaB) {
      return areaB - areaA;
    }
    if (a.rows !== b.rows) {
      return a.rows - b.rows;
    }
    return a.cols - b.cols;
  });

  return candidates[0] || null;
};

const suggestGridForImage = (image = {}, document = {}, options = {}) => {
  const widthPx = Number(image.width) || 0;
  const heightPx = Number(image.height) || 0;
  if (widthPx <= 0 || heightPx <= 0) {
    return null;
  }
  const maxPagesOption = Number(options.maxPages);
  const limits = {
    maxRows: clampDimension(options.maxRows ?? DEFAULT_SUGGESTION_LIMITS.maxRows, 1),
    maxCols: clampDimension(options.maxCols ?? DEFAULT_SUGGESTION_LIMITS.maxCols, 1),
    maxPages: Number.isFinite(maxPagesOption) && maxPagesOption > 0 ? Math.round(maxPagesOption) : DEFAULT_SUGGESTION_LIMITS.maxPages,
    maxUpscaleFactor: Math.max(options.maxUpscaleFactor ?? DEFAULT_SUGGESTION_LIMITS.maxUpscaleFactor, 1),
    fallbackUpscaleFactor: Math.max(
      options.fallbackUpscaleFactor ?? DEFAULT_SUGGESTION_LIMITS.fallbackUpscaleFactor,
      options.maxUpscaleFactor ?? DEFAULT_SUGGESTION_LIMITS.maxUpscaleFactor,
      1
    )
  };

  const attempt = (upscaleFactor) =>
    evaluateGridCandidates({ width: widthPx, height: heightPx }, document, limits, upscaleFactor);

  let best = attempt(limits.maxUpscaleFactor);
  if (!best && limits.fallbackUpscaleFactor > limits.maxUpscaleFactor) {
    best = attempt(limits.fallbackUpscaleFactor);
  }
  if (!best) {
    return null;
  }

  const tilePayload = computeTilePayload(document, { rows: best.rows, cols: best.cols });
  const resolutionScale = 1 / Math.max(best.minScale, 1e-6);
  return {
    rows: best.rows,
    cols: best.cols,
    pageCount: best.pageCount,
    posterSizeMm: tilePayload.posterSizeMm,
    printableAreaMm: tilePayload.printableAreaMm,
    canvasWidthPx: best.geometry.canvasWidthPx,
    canvasHeightPx: best.geometry.canvasHeightPx,
    printableWidthPx: best.geometry.printableWidthPx,
    printableHeightPx: best.geometry.printableHeightPx,
    wasteRatio: best.aspectDiff,
    sourceToCanvasRatio: best.minScale,
    resolutionScale,
    requiresUpscale: best.upscaleFactor > 1.001,
    upscaleFactor: best.upscaleFactor,
    requiresDownscale: best.requiresDownscale
  };
};

exports.MM_PER_INCH = MM_PER_INCH;
exports.PAPER_SIZES_MM = PAPER_SIZES_MM;
exports.normalizeGrid = normalizeGrid;
exports.mmToPx = mmToPx;
exports.pxToMm = pxToMm;
exports.computeGeometry = computeGeometry;
exports.computeTilePayload = computeTilePayload;
exports.suggestGridForImage = suggestGridForImage;

const documentMath = {
  MM_PER_INCH,
  PAPER_SIZES_MM,
  normalizeGrid,
  mmToPx,
  pxToMm,
  computeGeometry,
  computeTilePayload,
  suggestGridForImage
};

exports.default = documentMath;
