import { useId, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useAppStore } from '../store/useAppStore';
import { computeGeometry } from '@shared/documentMath';
import { GridPanel } from './panels/GridPanel';
import { DocumentPanel } from './panels/DocumentPanel';
import { GuidesPanel } from './panels/GuidesPanel';
import { OutputPanel } from './panels/OutputPanel';

const toFileUrl = (filePath?: string) => {
  if (!filePath) {
    return undefined;
  }
  if (filePath.startsWith('file://')) {
    return filePath;
  }
  const normalized = filePath.replace(/\\/g, '/');
  const encoded = encodeURI(normalized);
  if (/^[a-zA-Z]:/.test(normalized)) {
    return `file:///${encoded}`;
  }
  return normalized.startsWith('/') ? `file://${encoded}` : `file:///${encoded}`;
};

export function PreviewWorkspace() {
  const image = useAppStore((state) => state.image);
  const grid = useAppStore((state) => state.grid);
  const document = useAppStore((state) => state.document);
  const viewState = useAppStore((state) => state.viewState);
  const guides = useAppStore((state) => state.guides);
  const tiles = useAppStore((state) => state.tiles);
  const metadata = useAppStore((state) => state.metadata);

  const tileCount = useMemo(() => grid.rows * grid.cols, [grid]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const geometry = useMemo(() => computeGeometry(document, grid), [document, grid]);
  const tileWidth = tiles.printableAreaMm.width;
  const tileHeight = tiles.printableAreaMm.height;
  const hoveredInfo =
    hoveredIndex !== null
      ? {
          row: Math.floor(hoveredIndex / grid.cols) + 1,
          col: (hoveredIndex % grid.cols) + 1
        }
      : null;
  const { t, formatMeasurement } = useI18n();
  const previewLabel = image?.path ?? metadata.projectPath ?? t('preview.untitled');
  const tileSizeText = t('preview.tileSize', {
    width: formatMeasurement(tileWidth),
    height: formatMeasurement(tileHeight)
  });
  const previewSrc = useMemo(() => {
    if (!image) {
      return undefined;
    }
    if (image.previewDataUrl) {
      return image.previewDataUrl;
    }
    if (image.thumbnail) {
      return toFileUrl(image.thumbnail);
    }
    return toFileUrl(image.path);
  }, [image]);
  const hasImage = Boolean(previewSrc);
  const previewSummaryId = 'preview-summary';
  const previewSummary = t('preview.summary', {
    rows: grid.rows,
    cols: grid.cols,
    posterWidth: formatMeasurement(tiles.posterSizeMm.width),
    posterHeight: formatMeasurement(tiles.posterSizeMm.height),
    printableWidth: formatMeasurement(tiles.printableAreaMm.width),
    printableHeight: formatMeasurement(tiles.printableAreaMm.height),
    pages: tiles.pageCount
  });
  const posterAspectRatio = geometry.canvasWidthPx && geometry.canvasHeightPx ? `${geometry.canvasWidthPx} / ${geometry.canvasHeightPx}` : '1 / 1';
  const previewAlt = t('preview.imageAlt', { label: previewLabel });
  const imageFit = useMemo(() => {
    const canvasWidth = Math.max(geometry.canvasWidthPx, 1);
    const canvasHeight = Math.max(geometry.canvasHeightPx, 1);
    const sourceWidth = Math.max(image?.width ?? canvasWidth, 1);
    const sourceHeight = Math.max(image?.height ?? canvasHeight, 1);
    const rawScale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
    const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
    const fittedWidth = sourceWidth * scale;
    const fittedHeight = sourceHeight * scale;
    return {
      width: fittedWidth,
      height: fittedHeight,
      offsetX: (canvasWidth - fittedWidth) / 2,
      offsetY: (canvasHeight - fittedHeight) / 2
    };
  }, [geometry.canvasWidthPx, geometry.canvasHeightPx, image?.width, image?.height]);
  const imageBounds = {
    x: imageFit.offsetX,
    y: imageFit.offsetY,
    width: imageFit.width,
    height: imageFit.height
  };

  const statusLine = `${document.paperSize} · ${document.dpi} DPI · ${grid.rows}×${grid.cols}`;
  const posterImageId = useId();
  const tileClipBaseId = useId();
  const viewBox = `${-geometry.marginPx} ${-geometry.marginPx} ${geometry.canvasWidthPx + geometry.marginPx * 2} ${geometry.canvasHeightPx + geometry.marginPx * 2}`;
  const tileFrames = useMemo(() => {
    const frames: Array<{ id: string; row: number; col: number; sheetX: number; sheetY: number }> = [];
    for (let row = 0; row < grid.rows; row += 1) {
      for (let col = 0; col < grid.cols; col += 1) {
        const sheetX = col * geometry.stepX - geometry.marginPx;
        const sheetY = row * geometry.stepY - geometry.marginPx;
        frames.push({ id: `r${row}c${col}`, row, col, sheetX, sheetY });
      }
    }
    return frames;
  }, [geometry.marginPx, geometry.stepX, geometry.stepY, grid.cols, grid.rows]);

  return (
    <section className="workspace" aria-busy={viewState === 'loading'}>
      <div className="workspace__preview">
        <header className="preview__header">
          <div>
            <strong>{previewLabel}</strong>
            <p>{statusLine}</p>
          </div>
          <span>
            {t('preview.tilesLabel')}: {tileCount}
          </span>
        </header>
        <div className="preview__canvas">
          {viewState === 'loading' ? (
            <div className="preview__loading">{t('preview.loading')}</div>
          ) : (
            <div className="preview__stage" aria-describedby={previewSummaryId}>
              <p id={previewSummaryId} className="sr-only">
                {previewSummary}
              </p>
              <div className="preview__frame" style={{ aspectRatio: posterAspectRatio }}>
                <svg className="preview__svg" viewBox={viewBox} role="img" aria-label={previewAlt}>
                  <defs>
                    {hasImage && (
                      <image
                        id={posterImageId}
                        href={previewSrc}
                        x={imageBounds.x}
                        y={imageBounds.y}
                        width={imageBounds.width}
                        height={imageBounds.height}
                        preserveAspectRatio="xMidYMid meet"
                      />
                    )}
                  </defs>
                  <rect className="preview__poster-bg" x="0" y="0" width={geometry.canvasWidthPx} height={geometry.canvasHeightPx} />
                  {hasImage && <use href={`#${posterImageId}`} className="preview__image-base" />}
                  {guides.showGuidesInPreview && (
                    <g className="preview__sheets" aria-hidden={!hasImage}>
                      {tileFrames.map((frame, index) => {
                        const clipId = `${tileClipBaseId}-${frame.id}`;
                        const sheetX = frame.sheetX;
                        const sheetY = frame.sheetY;
                        const printableX = sheetX + geometry.marginPx;
                        const printableY = sheetY + geometry.marginPx;
                        const intersectsImage =
                          hasImage &&
                          imageBounds.width > 0 &&
                          imageBounds.height > 0 &&
                          printableX < imageBounds.x + imageBounds.width &&
                          printableX + geometry.printableWidthPx > imageBounds.x &&
                          printableY < imageBounds.y + imageBounds.height &&
                          printableY + geometry.printableHeightPx > imageBounds.y;
                        const showEmptyOverlay = hasImage && !intersectsImage;

                        return (
                          <g
                            key={frame.id}
                            className={index === hoveredIndex ? 'preview__sheet is-active' : 'preview__sheet'}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          >
                            <title>{t('preview.hoveredTile', { row: frame.row + 1, col: frame.col + 1 })}</title>
                            {hasImage && (
                              <>
                                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                                  <rect x={printableX} y={printableY} width={geometry.printableWidthPx} height={geometry.printableHeightPx} />
                                </clipPath>
                                <g className="preview__sheet-media" clipPath={`url(#${clipId})`}>
                                  <use href={`#${posterImageId}`} className="preview__sheet-media-image" />
                                </g>
                              </>
                            )}
                            <rect
                              className="preview__sheet-border"
                              x={sheetX}
                              y={sheetY}
                              width={geometry.pageWidthPx}
                              height={geometry.pageHeightPx}
                              rx={Math.min(geometry.marginPx * 0.25, 16)}
                            />
                            <rect
                              className="preview__sheet-printable"
                              x={printableX}
                              y={printableY}
                              width={geometry.printableWidthPx}
                              height={geometry.printableHeightPx}
                            />
                            {showEmptyOverlay && (
                              <rect
                                className="preview__sheet-empty"
                                x={printableX}
                                y={printableY}
                                width={geometry.printableWidthPx}
                                height={geometry.printableHeightPx}
                              />
                            )}
                            {guides.cropMarks && (
                              <rect
                                className="preview__sheet-crop"
                                x={printableX}
                                y={printableY}
                                width={geometry.pageWidthPx - geometry.marginPx * 2}
                                height={geometry.pageHeightPx - geometry.marginPx * 2}
                              />
                            )}
                            {guides.tileLabels && (
                              <text
                                className="preview__sheet-label"
                                x={sheetX + geometry.pageWidthPx / 2}
                                y={sheetY + geometry.pageHeightPx - Math.max(geometry.marginPx * 0.4, 12)}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                {t('preview.tileLabel', { row: frame.row + 1, col: frame.col + 1 })}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  )}
                </svg>
              </div>
              {hoveredInfo && (
                <div className="tile-tooltip" role="status">
                  {t('preview.hoveredTile', { row: hoveredInfo.row, col: hoveredInfo.col })} · {tileSizeText}
                </div>
              )}
            </div>
          )}
        </div>
        <footer className="preview__footer">
          <span>{previewSummary}</span>
          <button type="button" className="ghost" disabled>
            {t('preview.fitToggle')}
          </button>
        </footer>
      </div>
      <aside className="inspector" aria-label="Document controls">
        <GridPanel />
        <DocumentPanel />
        <GuidesPanel />
        <OutputPanel />
      </aside>
    </section>
  );
}
