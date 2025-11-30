declare module '@shared/documentMath' {
  export type PaperSize = 'A4' | 'Letter';
  export type Orientation = 'portrait' | 'landscape';

  export interface DocumentSettings {
    dpi?: number;
    paperSize?: PaperSize;
    orientation?: Orientation;
    marginMm?: number;
    overlapMm?: number;
  }

  export interface GridSettings {
    rows?: number;
    cols?: number;
  }

  export interface Geometry {
    pageWidthPx: number;
    pageHeightPx: number;
    pageWidthPt: number;
    pageHeightPt: number;
    marginPx: number;
    overlapPx: number;
    printableWidthPx: number;
    printableHeightPx: number;
    stepX: number;
    stepY: number;
    canvasWidthPx: number;
    canvasHeightPx: number;
  }

  export interface TilePayload {
    rows: number;
    cols: number;
    printableAreaMm: { width: number; height: number };
    posterSizeMm: { width: number; height: number };
    pageCount: number;
  }

  export interface SuggestionOptions {
    maxRows?: number;
    maxCols?: number;
    maxPages?: number;
    maxUpscaleFactor?: number;
    fallbackUpscaleFactor?: number;
  }

  export interface GridSuggestion {
    rows: number;
    cols: number;
    pageCount: number;
    posterSizeMm: { width: number; height: number };
    printableAreaMm: { width: number; height: number };
    canvasWidthPx: number;
    canvasHeightPx: number;
    printableWidthPx: number;
    printableHeightPx: number;
    wasteRatio: number;
    sourceToCanvasRatio: number;
    resolutionScale: number;
    requiresUpscale: boolean;
    upscaleFactor: number;
    requiresDownscale: boolean;
  }

  export const MM_PER_INCH: number;
  export const PAPER_SIZES_MM: Record<PaperSize, { width: number; height: number }>;

  export function normalizeGrid(grid?: GridSettings): { rows: number; cols: number };
  export function mmToPx(mm: number, dpi: number): number;
  export function pxToMm(px: number, dpi: number): number;
  export function computeGeometry(document?: DocumentSettings, grid?: GridSettings): Geometry;
  export function computeTilePayload(document?: DocumentSettings, grid?: GridSettings): TilePayload;
  export function suggestGridForImage(
    image?: { width?: number; height?: number },
    document?: DocumentSettings,
    options?: SuggestionOptions
  ): GridSuggestion | null;

  const documentMath: {
    MM_PER_INCH: typeof MM_PER_INCH;
    PAPER_SIZES_MM: typeof PAPER_SIZES_MM;
    normalizeGrid: typeof normalizeGrid;
    mmToPx: typeof mmToPx;
    pxToMm: typeof pxToMm;
    computeGeometry: typeof computeGeometry;
    computeTilePayload: typeof computeTilePayload;
    suggestGridForImage: typeof suggestGridForImage;
  };

  export default documentMath;
}
