const { parentPort } = require('worker_threads');
const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { normalizeGrid, computeGeometry } = require('../shared/documentMath');

const cancelledJobs = new Set();

parentPort.on('message', async (message) => {
  if (!message) return;
  if (message.type === 'cancel' && message.jobId) {
    cancelledJobs.add(message.jobId);
    return;
  }
  if (message.type !== 'start' || !message.request) {
    return;
  }

  const request = message.request;
  const { jobId } = request;
  try {
    const result = await processJob(request);
    if (isCancelled(jobId)) {
      parentPort.postMessage({ type: 'error', jobId, error: 'Job cancelled' });
      return;
    }
    parentPort.postMessage({ type: 'complete', jobId, output: result });
  } catch (error) {
    parentPort.postMessage({ type: 'error', jobId, error: error.message || String(error) });
  } finally {
    cancelledJobs.delete(jobId);
  }
});

const emitProgress = (jobId, step, progress, message) => {
  parentPort.postMessage({
    type: 'progress',
    jobId,
    step,
    progress,
    message
  });
};

const emitLog = (jobId, message) => parentPort.postMessage({ type: 'log', jobId, message });

const isCancelled = (jobId) => cancelledJobs.has(jobId);


async function processJob(request) {
  const { jobId, imagePath, document, grid, guides, export: exportSettings, tempDir } = request;
  emitProgress(jobId, 'queued', 0, 'Job queued');
  await fs.mkdir(tempDir, { recursive: true });

  const source = sharp(imagePath, { sequentialRead: true });
  const metadata = await source.metadata();
  emitLog(jobId, `Source image: ${metadata.width}x${metadata.height}`);
  const normalizedGrid = normalizeGrid(grid);
  const geometry = computeGeometry(document, normalizedGrid);
  emitLog(jobId, `Page ${document.paperSize} (${document.orientation}) @ ${document.dpi} DPI`);
  emitLog(jobId, `Grid ${normalizedGrid.rows}x${normalizedGrid.cols}`);
  const placement = computeImagePlacement(metadata, geometry);
  emitLog(jobId, `Image scale ${placement.scale.toFixed(3)} · offset (${placement.offsetX}, ${placement.offsetY})`);
  const totalTiles = normalizedGrid.rows * normalizedGrid.cols;
  const tiles = [];
  const useMonochrome = Boolean(exportSettings?.monochrome);
  let index = 0;

  for (let row = 0; row < normalizedGrid.rows; row += 1) {
    for (let col = 0; col < normalizedGrid.cols; col += 1) {
      if (isCancelled(jobId)) {
        throw new Error('Job cancelled');
      }
      const tileBuffer = await renderTile({
        jobId,
        source,
        placement,
        geometry,
        guides,
        row,
        col,
        monochrome: useMonochrome
      });
      index += 1;
      tiles.push({ buffer: tileBuffer, row: row + 1, col: col + 1 });
      emitProgress(jobId, 'slicing', index / totalTiles, `Slicing tile ${index} of ${totalTiles}`);
    }
  }

  if (!tiles.length) {
    throw new Error('No tiles were generated for the requested grid.');
  }

  const outputs = await persistTiles({
    jobId,
    tiles,
    geometry,
    exportSettings,
    tempDir
  });

  return {
    files: outputs,
    totalTiles,
    pageSizePx: { width: geometry.pageWidthPx, height: geometry.pageHeightPx },
    source: { width: metadata.width || 0, height: metadata.height || 0 }
  };
}

function computeImagePlacement(metadata = {}, geometry = {}) {
  const sourceWidth = Math.max(1, Number(metadata.width) || 1);
  const sourceHeight = Math.max(1, Number(metadata.height) || 1);
  const canvasWidth = Math.max(1, Number(geometry.canvasWidthPx) || 1);
  const canvasHeight = Math.max(1, Number(geometry.canvasHeightPx) || 1);
  const scale = Math.max(Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight), 1e-3);
  const fittedWidth = Math.round(sourceWidth * scale);
  const fittedHeight = Math.round(sourceHeight * scale);
  const offsetX = Math.round((canvasWidth - fittedWidth) / 2);
  const offsetY = Math.round((canvasHeight - fittedHeight) / 2);
  return {
    scale,
    width: fittedWidth,
    height: fittedHeight,
    offsetX,
    offsetY,
    bounds: { x: offsetX, y: offsetY, width: fittedWidth, height: fittedHeight },
    sourceWidth,
    sourceHeight
  };
}

const intersectRect = (a, b) => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { x, y, width, height };
};

async function renderTile({ jobId, source, placement, geometry, guides, row, col, monochrome = false }) {
  const {
    printableWidthPx,
    printableHeightPx,
    pageWidthPx,
    pageHeightPx,
    marginPx,
    stepX,
    stepY
  } = geometry;
  const tileRect = {
    x: col * stepX,
    y: row * stepY,
    width: printableWidthPx,
    height: printableHeightPx
  };
  const overlap = placement.bounds ? intersectRect(tileRect, placement.bounds) : null;

  let base = sharp({
    create: {
      width: pageWidthPx,
      height: pageHeightPx,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });

  const composites = [];
  if (overlap) {
    const sourceLeft = Math.max(0, Math.floor((overlap.x - placement.offsetX) / placement.scale));
    const sourceTop = Math.max(0, Math.floor((overlap.y - placement.offsetY) / placement.scale));
    const sourceWidth = Math.max(
      1,
      Math.min(Math.round(overlap.width / placement.scale), placement.sourceWidth - sourceLeft)
    );
    const sourceHeight = Math.max(
      1,
      Math.min(Math.round(overlap.height / placement.scale), placement.sourceHeight - sourceTop)
    );
    const printableBuffer = await source
      .clone()
      .extract({ left: sourceLeft, top: sourceTop, width: sourceWidth, height: sourceHeight })
      .resize(Math.round(overlap.width), Math.round(overlap.height), { fit: 'fill' })
      .png()
      .toBuffer();

    composites.push({
      input: printableBuffer,
      left: marginPx + Math.round(overlap.x - tileRect.x),
      top: marginPx + Math.round(overlap.y - tileRect.y)
    });
    if (row === 0 && col === 0) {
      await logBufferStats(jobId, 'content r1c1', printableBuffer);
    }
  }

  const svgOverlay = createOverlaySvg({
    pageWidthPx,
    pageHeightPx,
    marginPx,
    guides,
    label: `R${row + 1} · C${col + 1}`
  });
  if (svgOverlay) {
    composites.push({ input: Buffer.from(svgOverlay) });
  }

  if (composites.length) {
    base = base.composite(composites);
  }
  let tileBuffer = await base.png().toBuffer();
  if (monochrome) {
    tileBuffer = await applyMonochromeProfile(tileBuffer);
  }
  if (row === 0 && col === 0) {
    await logBufferStats(jobId, 'tile r1c1', tileBuffer);
  }
  return tileBuffer;
}

function createOverlaySvg({ pageWidthPx, pageHeightPx, marginPx, guides, label }) {
  if (!guides?.cropMarks && !guides?.tileLabels) {
    return null;
  }
  const stroke = guides.cropMarks ? `<rect x="${marginPx}" y="${marginPx}" width="${pageWidthPx - marginPx * 2}" height="${pageHeightPx - marginPx * 2}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1" stroke-dasharray="6 4" />` : '';
  const text = guides.tileLabels
    ? `<text x="${pageWidthPx - marginPx - 8}" y="${pageHeightPx - marginPx - 12}" font-size="24" fill="#111" font-family="'Segoe UI', sans-serif" text-anchor="end">${label}</text>`
    : '';
  return `<svg width="${pageWidthPx}" height="${pageHeightPx}" xmlns="http://www.w3.org/2000/svg">${stroke}${text}</svg>`;
}

async function persistTiles({ jobId, tiles, geometry, exportSettings, tempDir }) {
  const outputDir = path.join(tempDir, 'tiles');
  await fs.mkdir(outputDir, { recursive: true });
  const format = exportSettings.format || 'pdf';
  const namingTemplate = exportSettings.namingTemplate || 'tile_r{row}_c{col}';

  if (!tiles.length) {
    throw new Error('No tiles ready to persist.');
  }

  if (format === 'pdf') {
    const pdfDoc = await PDFDocument.create();
    for (let idx = 0; idx < tiles.length; idx += 1) {
      const tile = tiles[idx];
      const jpegBuffer = await sharp(tile.buffer)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
        .toBuffer();
      const jpegImage = await pdfDoc.embedJpg(jpegBuffer);
      const page = pdfDoc.addPage([geometry.pageWidthPt, geometry.pageHeightPt]);
      page.drawImage(jpegImage, { x: 0, y: 0, width: geometry.pageWidthPt, height: geometry.pageHeightPt });
      emitProgress(jobId, 'packaging', (idx + 1) / tiles.length, `Packaging tile ${idx + 1}`);
    }
    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(outputDir, 'poster-tiles.pdf');
    await fs.writeFile(pdfPath, Buffer.from(pdfBytes));
    emitProgress(jobId, 'packaging', 0.95, 'PDF packaged');
    return [pdfPath];
  }

  const outputs = [];
  for (let idx = 0; idx < tiles.length; idx += 1) {
    const tile = tiles[idx];
    const baseName = namingTemplate.replace('{row}', tile.row).replace('{col}', tile.col);
    const extension = format === 'jpg' ? 'jpg' : 'png';
    const targetPath = path.join(outputDir, `${baseName}.${extension}`);
    let pipeline = sharp(tile.buffer);
    pipeline = format === 'jpg'
      ? pipeline.jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      : pipeline.png();
    await pipeline.toFile(targetPath);
    outputs.push(targetPath);
    emitProgress(jobId, 'packaging', (idx + 1) / tiles.length, `Writing tile ${idx + 1}`);
  }
  return outputs;
}

async function logBufferStats(jobId, label, buffer) {
  try {
    const stats = await sharp(buffer).stats();
    const means = stats.channels.slice(0, 3).map((channel) => channel.mean.toFixed(2)).join(', ');
    emitLog(jobId, `${label} mean RGB: ${means}`);
    const appearsBlank = stats.channels.slice(0, 3).every((channel) => channel.mean > 250 && channel.stddev < 1);
    if (appearsBlank) {
      emitLog(jobId, `${label} appears blank (all channels > 250, stddev < 1)`);
    }
  } catch (error) {
    emitLog(jobId, `${label} stats failed: ${error.message}`);
  }
}

async function applyMonochromeProfile(buffer) {
  return sharp(buffer)
    .flatten({ background: '#fff' })
    .greyscale()
    .modulate({ brightness: 1.05 })
    .png()
    .toBuffer();
}
