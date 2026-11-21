/**
 * Lazy client-side Single-XObject PDF exporter powered by self-hosted pdf-lib (MIT).
 */

import { formatDimensions, mmToPt, rowLabel } from './layout.js';

let pdfLibPromise = null;

async function getPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = import('../vendor/pdf-lib/pdf-lib.esm.min.js');
  }
  return pdfLibPromise;
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ў: 'u', ї: 'yi', є: 'ye', ґ: 'g',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'Zh', З: 'Z', И: 'I',
  Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T',
  У: 'U', Ф: 'F', Х: 'Kh', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch', Ъ: '', Ы: 'Y',
  Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya', І: 'I', Ў: 'U', Ї: 'Yi', Є: 'Ye', Ґ: 'G',
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ś: 's', ź: 'z', ż: 'z',
  Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ś: 'S', Ź: 'Z', Ż: 'Z',
};

/**
 * Sanitize text for PDF StandardFonts WinAnsi encoding so Unicode filenames never throw.
 */
export function toWinAnsiSafe(str) {
  if (!str) return '';
  let mapped = '';
  for (const ch of String(str)) {
    if (TRANSLIT[ch] !== undefined) {
      mapped += TRANSLIT[ch];
      continue;
    }
    const code = ch.charCodeAt(0);
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      mapped += ch;
    } else {
      mapped += '?';
    }
  }
  return mapped.replace(/\s+/g, ' ').trim();
}

async function rasterizeImageBlobForPdf(blob, width, height) {
  let w = Math.max(1, width || 1200);
  let h = Math.max(1, height || 900);
  const canvas = document.createElement('canvas');

  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    w = Math.max(1, bitmap.width || w);
    h = Math.max(1, bitmap.height || h);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = url;
      });
      w = Math.max(1, img.naturalWidth || w);
      h = Math.max(1, img.naturalHeight || h);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const useJpeg = w * h > 4_000_000;
  const outMime = useJpeg ? 'image/jpeg' : 'image/png';
  const outBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encode failed'))), outMime, 0.94);
  });
  return {
    bytes: new Uint8Array(await outBlob.arrayBuffer()),
    mimeType: outMime,
  };
}

function drawCrosshair(page, rgb, cx, cy, armPt = 6) {
  const white = rgb(1, 1, 1);
  const dark = rgb(0.1, 0.1, 0.12);
  page.drawLine({ start: { x: cx - armPt, y: cy }, end: { x: cx + armPt, y: cy }, thickness: 1.6, color: white });
  page.drawLine({ start: { x: cx, y: cy - armPt }, end: { x: cx, y: cy + armPt }, thickness: 1.6, color: white });
  page.drawLine({ start: { x: cx - armPt, y: cy }, end: { x: cx + armPt, y: cy }, thickness: 0.55, color: dark });
  page.drawLine({ start: { x: cx, y: cy - armPt }, end: { x: cx, y: cy + armPt }, thickness: 0.55, color: dark });
}

function drawAssemblyMapPage(outDoc, layout, source, options, pdfLib) {
  const { rgb } = pdfLib;
  const pageW = mmToPt(layout.sheetW);
  const pageH = mmToPt(layout.sheetH);
  const page = outDoc.addPage([pageW, pageH]);
  const { font, fontBold } = options._fonts;

  const pad = mmToPt(14);
  const ink = rgb(0.09, 0.09, 0.11);
  const muted = rgb(0.36, 0.36, 0.42);
  const cobalt = rgb(0.11, 0.31, 0.85);
  const red = rgb(0.86, 0.15, 0.15);
  const border = rgb(0.75, 0.76, 0.8);
  const fillLight = rgb(0.95, 0.96, 0.99);
  const fillSkip = rgb(0.92, 0.92, 0.93);

  let y = pageH - pad - 18;
  page.drawText('ASSEMBLY MAP & SCALE CHECK', { x: pad, y, size: 16, font: fontBold, color: ink });
  y -= 16;

  const safeName = toWinAnsiSafe(source.filename || 'poster');
  const dimsCm = formatDimensions(layout.posterW, layout.posterH, 'cm');
  const dimsIn = formatDimensions(layout.posterW, layout.posterH, 'in');
  const summary = `Source: ${safeName}  |  Poster: ${dimsCm} (${dimsIn})  |  Grid: ${layout.cols}x${layout.rows} (${layout.activeCount} sheets on ${layout.paperName} ${layout.orientation})`;
  page.drawText(summary.slice(0, 120), { x: pad, y, size: 8.5, font, color: muted });
  y -= 14;

  // Print-at-100% calibration banner + 50mm / 2in rulers
  const boxH = 82;
  const boxY = y - boxH;
  page.drawRectangle({
    x: pad,
    y: boxY,
    width: pageW - 2 * pad,
    height: boxH,
    borderColor: red,
    borderWidth: 1,
    color: rgb(0.99, 0.96, 0.96),
  });
  page.drawText('PRINT AT 100% / ACTUAL SIZE (disable Fit-to-Page). Measure rulers before cutting:', {
    x: pad + 10,
    y: boxY + boxH - 16,
    size: 9.5,
    font: fontBold,
    color: red,
  });

  // 50 mm ruler
  const r50x = pad + 12;
  const r50y = boxY + 34;
  const r50w = mmToPt(50);
  page.drawLine({ start: { x: r50x, y: r50y }, end: { x: r50x + r50w, y: r50y }, thickness: 1.5, color: ink });
  for (let i = 0; i <= 5; i++) {
    const tx = r50x + mmToPt(i * 10);
    const tickH = i === 0 || i === 5 ? 10 : 6;
    page.drawLine({ start: { x: tx, y: r50y }, end: { x: tx, y: r50y + tickH }, thickness: 1, color: i === 0 || i === 5 ? red : ink });
  }
  page.drawText('0', { x: r50x - 2, y: r50y - 11, size: 7.5, font, color: ink });
  page.drawText('50 mm exact', { x: r50x + r50w - 28, y: r50y - 11, size: 7.5, font: fontBold, color: red });

  // 2 inch ruler
  const r2x = Math.max(r50x + r50w + 46, pageW * 0.5);
  const r2w = mmToPt(50.8);
  if (r2x + r2w < pageW - pad - 10) {
    page.drawLine({ start: { x: r2x, y: r50y }, end: { x: r2x + r2w, y: r50y }, thickness: 1.5, color: ink });
    for (let i = 0; i <= 4; i++) {
      const tx = r2x + mmToPt(i * 12.7);
      const tickH = i === 0 || i === 4 ? 10 : 6;
      page.drawLine({ start: { x: tx, y: r50y }, end: { x: tx, y: r50y + tickH }, thickness: 1, color: i === 0 || i === 4 ? red : ink });
    }
    page.drawText('0"', { x: r2x - 2, y: r50y - 11, size: 7.5, font, color: ink });
    page.drawText('2.0 in exact', { x: r2x + r2w - 30, y: r50y - 11, size: 7.5, font: fontBold, color: red });
  }

  // Diagram area
  const footerReserve = 78;
  const diagTop = boxY - 18;
  const diagBottom = pad + footerReserve;
  const diagMaxW = pageW - 2 * pad;
  const diagMaxH = Math.max(80, diagTop - diagBottom);

  const gridTotalW = Math.max(1, (layout.cols - 1) * layout.stepX + layout.printW);
  const gridTotalH = Math.max(1, (layout.rows - 1) * layout.stepY + layout.printH);
  const scale = Math.min(diagMaxW / gridTotalW, diagMaxH / gridTotalH);

  const drawW = gridTotalW * scale;
  const drawH = gridTotalH * scale;
  const ox = pad + (diagMaxW - drawW) / 2;
  const oy = diagBottom + (diagMaxH - drawH) / 2;

  // Draw poster outline inside sheet grid
  page.drawRectangle({
    x: ox,
    y: oy + drawH - layout.posterH * scale,
    width: layout.posterW * scale,
    height: layout.posterH * scale,
    color: fillLight,
    borderColor: cobalt,
    borderWidth: 1.2,
  });

  // Draw each tile cell (fills first, then borders & centered labels so overlaps never collide with text)
  for (const tile of layout.tiles) {
    if (!tile.excluded) continue;
    const tx = ox + tile.x0 * scale;
    const tw = layout.printW * scale;
    const th = layout.printH * scale;
    const ty = oy + drawH - (tile.y0 + layout.printH) * scale;
    page.drawRectangle({
      x: tx,
      y: ty,
      width: tw,
      height: th,
      color: fillSkip,
      opacity: 0.55,
    });
  }

  for (const tile of layout.tiles) {
    const tx = ox + tile.x0 * scale;
    const tw = layout.printW * scale;
    const th = layout.printH * scale;
    const ty = oy + drawH - (tile.y0 + layout.printH) * scale;

    page.drawRectangle({
      x: tx,
      y: ty,
      width: tw,
      height: th,
      borderColor: tile.excluded ? border : cobalt,
      borderWidth: 0.75,
    });

    const insetLeft = tile.hasLeft ? layout.overlapMm * scale : 0;
    const insetTop = tile.hasTop ? layout.overlapMm * scale : 0;
    const labelSize = Math.max(6, Math.min(13, Math.min(tw, th) * 0.28));
    page.drawText(tile.excluded ? `${tile.label} (skip)` : tile.label, {
      x: tx + insetLeft + 4,
      y: ty + th - insetTop - labelSize - 4,
      size: labelSize,
      font: fontBold,
      color: tile.excluded ? muted : ink,
    });
  }

  // Assembly instructions footer
  const instrY = pad + 46;
  page.drawLine({ start: { x: pad, y: instrY + 14 }, end: { x: pageW - pad, y: instrY + 14 }, thickness: 0.6, color: border });
  page.drawText('HOW TO ASSEMBLE:', { x: pad, y: instrY, size: 8.5, font: fontBold, color: ink });
  page.drawText('1. Trim the TOP and LEFT white printer margins along the crop marks.', { x: pad, y: instrY - 12, size: 8, font, color: muted });
  page.drawText('2. Keep RIGHT and BOTTOM dashed overlap tabs intact and apply glue/tape.', { x: pad, y: instrY - 23, size: 8, font, color: muted });
  page.drawText('3. Align corner (+) crosshairs row by row (A1 -> A2 -> B1).', { x: pad, y: instrY - 34, size: 8, font, color: muted });
  page.drawText('Generated 100% locally in your browser · widepostermaker.com', {
    x: pad,
    y: pad - 2,
    size: 7.5,
    font,
    color: muted,
  });
}

/**
 * Generate a print-ready multi-page tiled PDF using Single-XObject embedding.
 *
 * @param {object} args
 * @returns {Promise<{bytes: Uint8Array, mode: 'vector'|'raster', pageCount: number, warnings: string[]}>}
 */
export async function generateTiledPdf({ source, layout, options = {}, onProgress = null }) {
  if (layout.tooManySheets || layout.activeCount <= 0) {
    throw new Error('No active sheets to export');
  }

  const pdfLib = await getPdfLib();
  const {
    PDFDocument,
    StandardFonts,
    rgb,
    degrees,
    pushGraphicsState,
    popGraphicsState,
    rectangle,
    clip,
    endPath,
  } = pdfLib;

  const opts = {
    cropMarks: options.cropMarks !== false,
    tileLabels: options.tileLabels !== false,
    includeMap: options.includeMap !== false,
  };

  const outDoc = await PDFDocument.create();
  outDoc.setTitle(`${toWinAnsiSafe(source.filename || 'poster')} - Tiled Poster`);
  outDoc.setCreator('WidePosterMaker');
  outDoc.setProducer('widepostermaker.com (100% local client-side)');

  const font = await outDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);
  opts._fonts = { font, fontBold };

  const warnings = [];
  let mode = 'raster';
  let embeddedPage = null;
  let embeddedImage = null;
  let pdfTransform = null;

  if (source.type === 'pdf') {
    try {
      const srcDoc = await PDFDocument.load(source.bytes, { ignoreEncryption: false });
      const srcPage = srcDoc.getPage(source.pageIndex || 0);
      const crop = srcPage.getCropBox() || srcPage.getMediaBox();
      const rot = ((srcPage.getRotation().angle % 360) + 360) % 360;
      const visWpt = rot === 90 || rot === 270 ? crop.height : crop.width;
      const scale = mmToPt(layout.posterW) / visWpt;

      embeddedPage = await outDoc.embedPage(srcPage, {
        left: crop.x,
        bottom: crop.y,
        right: crop.x + crop.width,
        top: crop.y + crop.height,
      });
      pdfTransform = { rot, scale };
      mode = 'vector';
    } catch (_err) {
      if (!source.pdfReader) {
        throw new Error('Could not embed PDF page');
      }
      const targetWpx = Math.round((layout.posterW / 25.4) * 180);
      const targetHpx = Math.round((layout.posterH / 25.4) * 180);
      const fallback = await source.pdfReader.renderForRasterFallback(
        (source.pageIndex || 0) + 1,
        targetWpx,
        targetHpx,
      );
      embeddedImage = await outDoc.embedPng(fallback.bytes);
      mode = 'raster';
      warnings.push('Vector embedding was unavailable for this PDF; exported high-resolution raster tiles.');
    }
  } else {
    if (source.mimeType === 'image/jpeg' && (source.exifOrientation || 1) === 1 && source.bytes) {
      embeddedImage = await outDoc.embedJpg(source.bytes);
    } else if (source.mimeType === 'image/png' && source.bytes) {
      embeddedImage = await outDoc.embedPng(source.bytes);
    } else {
      const norm = await rasterizeImageBlobForPdf(source.blob, source.width, source.height);
      embeddedImage =
        norm.mimeType === 'image/jpeg'
          ? await outDoc.embedJpg(norm.bytes)
          : await outDoc.embedPng(norm.bytes);
    }
  }

  if (opts.includeMap && layout.activeCount > 1) {
    drawAssemblyMapPage(outDoc, layout, source, opts, pdfLib);
  }

  const pageW = mmToPt(layout.sheetW);
  const pageH = mmToPt(layout.sheetH);
  const marginPt = mmToPt(layout.marginMm);
  const posterWpt = mmToPt(layout.posterW);
  const posterHpt = mmToPt(layout.posterH);
  const stepXpt = mmToPt(layout.stepX);
  const stepYpt = mmToPt(layout.stepY);

  const activeTiles = layout.tiles.filter((t) => !t.excluded);
  const totalSteps = activeTiles.length;

  for (let idx = 0; idx < activeTiles.length; idx++) {
    const tile = activeTiles[idx];
    const page = outDoc.addPage([pageW, pageH]);

    const clipLeft = marginPt;
    const clipTop = pageH - marginPt;
    const clipW = mmToPt(tile.localW);
    const clipH = mmToPt(tile.localH);
    const clipBottom = clipTop - clipH;

    const drawX = mmToPt(layout.marginMm - tile.x0);
    const drawY = mmToPt(layout.sheetH - layout.marginMm + tile.y0 - layout.posterH);

    if (clipW > 0.1 && clipH > 0.1) {
      page.pushOperators(pushGraphicsState(), rectangle(clipLeft, clipBottom, clipW, clipH), clip(), endPath());

      if (embeddedPage && pdfTransform) {
        const { rot, scale } = pdfTransform;
        if (rot === 0) {
          page.drawPage(embeddedPage, { x: drawX, y: drawY, xScale: scale, yScale: scale, rotate: degrees(0) });
        } else if (rot === 90) {
          page.drawPage(embeddedPage, {
            x: drawX,
            y: drawY + posterHpt,
            xScale: scale,
            yScale: scale,
            rotate: degrees(-90),
          });
        } else if (rot === 180) {
          page.drawPage(embeddedPage, {
            x: drawX + posterWpt,
            y: drawY + posterHpt,
            xScale: scale,
            yScale: scale,
            rotate: degrees(180),
          });
        } else {
          page.drawPage(embeddedPage, {
            x: drawX + posterWpt,
            y: drawY,
            xScale: scale,
            yScale: scale,
            rotate: degrees(90),
          });
        }
      } else if (embeddedImage) {
        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: posterWpt,
          height: posterHpt,
        });
      }

      page.pushOperators(popGraphicsState());
    }

    if (opts.cropMarks) {
      const markColor = rgb(0.25, 0.25, 0.3);
      const guideColor = rgb(0.11, 0.31, 0.85);
      const minInset = mmToPt(1.5);
      const tickLen = mmToPt(4);

      // Corner crop ticks extending into printer margins (when margins allow)
      const cx0 = clipLeft;
      const cx1 = clipLeft + clipW;
      const cy0 = clipBottom;
      const cy1 = clipTop;

      const leftStart = Math.max(minInset, cx0 - tickLen);
      const rightEnd = Math.min(pageW - minInset, cx1 + tickLen);
      const bottomStart = Math.max(minInset, cy0 - tickLen);
      const topEnd = Math.min(pageH - minInset, cy1 + tickLen);

      const corners = [
        [cx0, cy1, leftStart, cx0, cy1, topEnd],
        [cx1, cy1, cx1, rightEnd, cy1, topEnd],
        [cx0, cy0, leftStart, cx0, bottomStart, cy0],
        [cx1, cy0, cx1, rightEnd, bottomStart, cy0],
      ];
      for (const [vx, vy, hx0, hx1, vy0, vy1] of corners) {
        if (hx1 > hx0 + 1) {
          page.drawLine({ start: { x: hx0, y: vy }, end: { x: hx1, y: vy }, thickness: 0.45, color: markColor });
        }
        if (vy1 > vy0 + 1) {
          page.drawLine({ start: { x: vx, y: vy0 }, end: { x: vx, y: vy1 }, thickness: 0.45, color: markColor });
        }
      }

      // Dashed overlap cut/glue guides on right and bottom overlap seams
      const seamX = clipLeft + stepXpt;
      const seamY = clipTop - stepYpt;

      if (tile.hasRight && layout.overlapMm > 0 && seamX < cx1 - 0.5) {
        page.drawLine({
          start: { x: seamX, y: cy0 },
          end: { x: seamX, y: cy1 },
          thickness: 1.4,
          color: rgb(1, 1, 1),
          opacity: 0.75,
        });
        page.drawLine({
          start: { x: seamX, y: cy0 },
          end: { x: seamX, y: cy1 },
          thickness: 0.6,
          color: guideColor,
          dashArray: [4, 3],
        });
        drawCrosshair(page, rgb, seamX, cy1);
        drawCrosshair(page, rgb, seamX, cy0);
      }

      if (tile.hasBottom && layout.overlapMm > 0 && seamY > cy0 + 0.5) {
        page.drawLine({
          start: { x: cx0, y: seamY },
          end: { x: cx1, y: seamY },
          thickness: 1.4,
          color: rgb(1, 1, 1),
          opacity: 0.75,
        });
        page.drawLine({
          start: { x: cx0, y: seamY },
          end: { x: cx1, y: seamY },
          thickness: 0.6,
          color: guideColor,
          dashArray: [4, 3],
        });
        drawCrosshair(page, rgb, cx0, seamY);
        drawCrosshair(page, rgb, cx1, seamY);
      }

      // Corner alignment crosshairs
      drawCrosshair(page, rgb, cx0, cy1);
      drawCrosshair(page, rgb, cx1, cy1);
      drawCrosshair(page, rgb, cx0, cy0);
      drawCrosshair(page, rgb, cx1, cy0);
    }

    if (opts.tileLabels) {
      const labelColor = rgb(0.35, 0.35, 0.4);
      const text = `${tile.label}  (Row ${tile.row + 1}, Col ${tile.col + 1})`;
      if (layout.marginMm >= 4) {
        const yPos = Math.max(mmToPt(1.6), layout.marginMm >= 6 ? mmToPt(layout.marginMm - 4.2) : mmToPt(1.6));
        page.drawText(text, {
          x: Math.max(mmToPt(4), clipLeft),
          y: yPos,
          size: 7.5,
          font: fontBold,
          color: labelColor,
        });
      }

      // Neighbor glue-tab hints inside overlap area (covered when assembled)
      if (layout.overlapMm >= 6) {
        if (tile.hasRight) {
          const rightNeighbor = `${rowLabel(tile.row)}${tile.col + 2}`;
          const hx = clipLeft + stepXpt + 3;
          const hy = Math.max(clipBottom + 8, clipTop - 16);
          if (hx + 22 < clipLeft + clipW) {
            page.drawRectangle({
              x: hx - 2,
              y: hy - 2.5,
              width: Math.min(22, clipLeft + clipW - hx),
              height: 10,
              color: rgb(1, 1, 1),
              opacity: 0.88,
            });
            page.drawText(`-> ${rightNeighbor}`, {
              x: hx,
              y: hy,
              size: 6.2,
              font: fontBold,
              color: rgb(0.11, 0.31, 0.85),
            });
          }
        }
        if (tile.hasBottom) {
          const bottomNeighbor = `${rowLabel(tile.row + 1)}${tile.col + 1}`;
          const hx = clipLeft + 8;
          const hy = clipTop - stepYpt - 10;
          if (hy > clipBottom + 3) {
            page.drawRectangle({
              x: hx - 2,
              y: hy - 2.5,
              width: 24,
              height: 10,
              color: rgb(1, 1, 1),
              opacity: 0.88,
            });
            page.drawText(`v ${bottomNeighbor}`, {
              x: hx,
              y: hy,
              size: 6.2,
              font: fontBold,
              color: rgb(0.11, 0.31, 0.85),
            });
          }
        }
      }
    }

    if (onProgress) {
      onProgress(idx + 1, totalSteps);
    }
  }

  const bytes = await outDoc.save();
  return {
    bytes,
    mode,
    pageCount: outDoc.getPageCount(),
    warnings,
  };
}
