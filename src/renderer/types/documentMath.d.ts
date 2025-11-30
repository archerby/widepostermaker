import type { DocumentSettings, GridSettings } from '../store/useAppStore';

declare module '@shared/documentMath' {
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

  export interface DocumentMathModule {
    computeGeometry(document: DocumentSettings, grid: GridSettings): Geometry;
    computeTilePayload(document: DocumentSettings, grid: GridSettings): TilePayload;
    suggestGridForImage(
      image: { width: number; height: number },
      document: DocumentSettings,
      options?: {
        maxRows?: number;
        maxCols?: number;
        maxPages?: number;
        maxUpscaleFactor?: number;
        fallbackUpscaleFactor?: number;
      }
    ): GridSuggestion | null;
    mmToPx(mm: number, dpi: number): number;
    pxToMm(px: number, dpi: number): number;
  }

  export const computeGeometry: DocumentMathModule['computeGeometry'];
  export const computeTilePayload: DocumentMathModule['computeTilePayload'];
  export const suggestGridForImage: DocumentMathModule['suggestGridForImage'];
  export const mmToPx: DocumentMathModule['mmToPx'];
  export const pxToMm: DocumentMathModule['pxToMm'];

  const documentMath: DocumentMathModule;
  export default documentMath;
}
