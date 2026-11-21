/**
 * Pure poster tiling geometry in millimeters (zero DOM dependencies).
 */

export const PT_PER_MM = 72 / 25.4;
export const MM_PER_INCH = 25.4;
export const MAX_SHEETS = 400;

const PAPER_MAP = Object.create(null);
PAPER_MAP.a4 = Object.freeze({
  id: 'a4',
  name: 'A4',
  widthMm: 210,
  heightMm: 297,
  defaultUnits: 'mm',
});
PAPER_MAP.letter = Object.freeze({
  id: 'letter',
  name: 'US Letter',
  widthMm: 215.9,
  heightMm: 279.4,
  defaultUnits: 'in',
});
PAPER_MAP.a3 = Object.freeze({
  id: 'a3',
  name: 'A3',
  widthMm: 297,
  heightMm: 420,
  defaultUnits: 'mm',
});
PAPER_MAP.legal = Object.freeze({
  id: 'legal',
  name: 'US Legal',
  widthMm: 215.9,
  heightMm: 355.6,
  defaultUnits: 'in',
});
export const PAPERS = Object.freeze(PAPER_MAP);

export function clamp(val, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function clampInt(val, min, max) {
  return Math.round(clamp(val, min, max));
}

export function mmToPt(mm) {
  return mm * PT_PER_MM;
}

export function mmToCm(mm) {
  return mm / 10;
}

export function mmToIn(mm) {
  return mm / MM_PER_INCH;
}

export function cmToMm(cm) {
  return cm * 10;
}

export function inToMm(inches) {
  return inches * MM_PER_INCH;
}

/**
 * Convert 0-based row index to Excel-style letters: 0 -> A, 25 -> Z, 26 -> AA.
 */
export function rowLabel(rowIndex) {
  if (!Number.isFinite(rowIndex) || rowIndex < 0) return 'A';
  let n = Math.floor(rowIndex);
  let out = '';
  while (true) {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return out;
}

/**
 * Human-readable tile coordinate (1-based column), e.g. A1, A2, B1.
 */
export function tileLabel(row, col) {
  return `${rowLabel(row)}${col + 1}`;
}

/**
 * Format width x height nicely in requested unit system.
 */
export function formatDimensions(wMm, hMm, units = 'cm') {
  if (units === 'in') {
    return `${mmToIn(wMm).toFixed(1)} × ${mmToIn(hMm).toFixed(1)} in`;
  }
  if (units === 'mm') {
    return `${Math.round(wMm)} × ${Math.round(hMm)} mm`;
  }
  return `${mmToCm(wMm).toFixed(1)} × ${mmToCm(hMm).toFixed(1)} cm`;
}

function resolveSheetGeometry(paperObj, orientation, marginInputMm, overlapInputMm) {
  const isLand = orientation === 'landscape';
  const sheetW = isLand ? paperObj.heightMm : paperObj.widthMm;
  const sheetH = isLand ? paperObj.widthMm : paperObj.heightMm;
  const maxMargin = Math.min(sheetW, sheetH) * 0.2;
  const marginMm = clamp(marginInputMm, 0, maxMargin);
  const printW = Math.max(10, sheetW - 2 * marginMm);
  const printH = Math.max(10, sheetH - 2 * marginMm);
  const maxOverlap = Math.min(printW, printH) * 0.45;
  const overlapMm = clamp(overlapInputMm, 0, maxOverlap);
  const stepX = Math.max(1, printW - overlapMm);
  const stepY = Math.max(1, printH - overlapMm);
  return { sheetW, sheetH, marginMm, printW, printH, overlapMm, stepX, stepY, orientation };
}

function solveGridForOrientation(geom, aspectH, physWmm, physHmm, mode, value) {
  const { printW, printH, overlapMm, stepX, stepY } = geom;
  let posterW;
  let posterH;
  let cols;
  let rows;

  if (mode === 'sheets-width') {
    cols = clampInt(value, 1, 20);
    posterW = cols * stepX + overlapMm;
    posterH = posterW * aspectH;
    rows = Math.max(1, Math.ceil((posterH - overlapMm - 1e-6) / stepY));
  } else if (mode === 'sheets-height') {
    rows = clampInt(value, 1, 20);
    posterH = rows * stepY + overlapMm;
    posterW = posterH / aspectH;
    cols = Math.max(1, Math.ceil((posterW - overlapMm - 1e-6) / stepX));
  } else if (mode === 'size-width') {
    posterW = clamp(value, 10, 20000);
    posterH = posterW * aspectH;
    cols = Math.max(1, Math.ceil((posterW - overlapMm - 1e-6) / stepX));
    rows = Math.max(1, Math.ceil((posterH - overlapMm - 1e-6) / stepY));
  } else if (mode === 'size-height') {
    posterH = clamp(value, 10, 20000);
    posterW = posterH / aspectH;
    cols = Math.max(1, Math.ceil((posterW - overlapMm - 1e-6) / stepX));
    rows = Math.max(1, Math.ceil((posterH - overlapMm - 1e-6) / stepY));
  } else if (mode === 'scale') {
    const scalePct = clamp(value, 5, 2000);
    posterW = physWmm * (scalePct / 100);
    posterH = physHmm * (scalePct / 100);
    cols = Math.max(1, Math.ceil((posterW - overlapMm - 1e-6) / stepX));
    rows = Math.max(1, Math.ceil((posterH - overlapMm - 1e-6) / stepY));
  } else {
    throw new Error(`Unsupported sizing mode: ${mode}`);
  }

  const totalSheets = cols * rows;
  const waste = cols * printW * rows * printH - posterW * posterH;
  return { ...geom, posterW, posterH, cols, rows, totalSheets, waste };
}

/**
 * Compute complete tiling layout for an image or PDF page.
 *
 * @param {object} params
 * @returns {object}
 */
export function computeLayout(params) {
  const {
    srcWidth,
    srcHeight,
    srcPhysWmm,
    srcPhysHmm,
    isVector = false,
    paper = 'a4',
    orientation = 'auto',
    mode = 'sheets-width',
    value = 3,
    marginMm = 5,
    overlapMm = 10,
    excludedTiles = null,
  } = params;

  if (!Number.isFinite(srcWidth) || srcWidth <= 0 || !Number.isFinite(srcHeight) || srcHeight <= 0) {
    throw new Error('Source dimensions must be positive finite numbers');
  }

  const paperObj = Object.hasOwn(PAPERS, paper) ? PAPERS[paper] : PAPERS.a4;
  const aspectH = srcHeight / srcWidth;
  const physWmm = Number.isFinite(srcPhysWmm) && srcPhysWmm > 0 ? srcPhysWmm : (srcWidth / 96) * MM_PER_INCH;
  const physHmm = Number.isFinite(srcPhysHmm) && srcPhysHmm > 0 ? srcPhysHmm : physWmm * aspectH;

  let chosen;
  if (orientation === 'auto') {
    if (mode === 'sheets-width' || mode === 'sheets-height') {
      const autoOri = srcWidth >= srcHeight ? 'landscape' : 'portrait';
      const geom = resolveSheetGeometry(paperObj, autoOri, marginMm, overlapMm);
      chosen = solveGridForOrientation(geom, aspectH, physWmm, physHmm, mode, value);
    } else {
      const pGeom = resolveSheetGeometry(paperObj, 'portrait', marginMm, overlapMm);
      const lGeom = resolveSheetGeometry(paperObj, 'landscape', marginMm, overlapMm);
      const pSol = solveGridForOrientation(pGeom, aspectH, physWmm, physHmm, mode, value);
      const lSol = solveGridForOrientation(lGeom, aspectH, physWmm, physHmm, mode, value);

      if (pSol.totalSheets < lSol.totalSheets) {
        chosen = pSol;
      } else if (lSol.totalSheets < pSol.totalSheets) {
        chosen = lSol;
      } else if (Math.abs(pSol.waste - lSol.waste) > 1e-3) {
        chosen = pSol.waste <= lSol.waste ? pSol : lSol;
      } else {
        chosen = srcWidth >= srcHeight ? lSol : pSol;
      }
    }
  } else {
    const fixedOri = orientation === 'landscape' ? 'landscape' : 'portrait';
    const geom = resolveSheetGeometry(paperObj, fixedOri, marginMm, overlapMm);
    chosen = solveGridForOrientation(geom, aspectH, physWmm, physHmm, mode, value);
  }

  const totalCount = chosen.totalSheets;
  const tooManySheets = totalCount > MAX_SHEETS;
  const excludedSet =
    excludedTiles instanceof Set
      ? excludedTiles
      : new Set(Array.isArray(excludedTiles) ? excludedTiles : []);

  const tiles = [];
  let activeCount = 0;

  if (!tooManySheets) {
    for (let r = 0; r < chosen.rows; r++) {
      for (let c = 0; c < chosen.cols; c++) {
        const x0 = c * chosen.stepX;
        const y0 = r * chosen.stepY;
        const x1 = x0 + chosen.printW;
        const y1 = y0 + chosen.printH;

        const visX0 = Math.max(x0, 0);
        const visY0 = Math.max(y0, 0);
        const visX1 = Math.min(x1, chosen.posterW);
        const visY1 = Math.min(y1, chosen.posterH);

        const localW = Math.max(0, visX1 - visX0);
        const localH = Math.max(0, visY1 - visY0);
        const key = `${r}-${c}`;
        const excluded = excludedSet.has(key);
        if (!excluded) activeCount += 1;

        tiles.push({
          row: r,
          col: c,
          key,
          label: tileLabel(r, c),
          x0,
          y0,
          x1,
          y1,
          localW,
          localH,
          hasLeft: c > 0,
          hasRight: c < chosen.cols - 1,
          hasTop: r > 0,
          hasBottom: r < chosen.rows - 1,
          excluded,
        });
      }
    }
  }

  const dpi = isVector ? null : Math.round(srcWidth / (chosen.posterW / MM_PER_INCH));
  let qualityTier = 'vector';
  if (dpi !== null) {
    if (dpi >= 150) qualityTier = 'crisp';
    else if (dpi >= 90) qualityTier = 'good';
    else qualityTier = 'low';
  }

  const scalePct = Math.round((chosen.posterW / physWmm) * 100);

  return {
    paperId: paperObj.id,
    paperName: paperObj.name,
    requestedOrientation: orientation,
    orientation: chosen.orientation,
    sheetW: chosen.sheetW,
    sheetH: chosen.sheetH,
    marginMm: chosen.marginMm,
    overlapMm: chosen.overlapMm,
    printW: chosen.printW,
    printH: chosen.printH,
    stepX: chosen.stepX,
    stepY: chosen.stepY,
    posterW: chosen.posterW,
    posterH: chosen.posterH,
    cols: chosen.cols,
    rows: chosen.rows,
    totalCount,
    activeCount,
    tooManySheets,
    tiles,
    dpi,
    qualityTier,
    scalePct,
    isVector,
  };
}
