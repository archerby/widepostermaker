/**
 * Main interactive controller for WidePosterMaker.
 */

import {
  PAPERS,
  cmToMm,
  computeLayout,
  formatDimensions,
  inToMm,
  mmToCm,
  mmToIn,
} from './layout.js';
import { readJpegExifOrientation } from './exif.js';
import { createSamplePosterBlob } from './sample.js';
import { TilePreview } from './preview.js';

const $ = (id) => document.getElementById(id);

function readI18nStrings() {
  const el = $('i18n-data');
  if (!el) return {};
  try {
    return JSON.parse(el.textContent || '{}');
  } catch {
    return {};
  }
}

const I18N = readI18nStrings();
const msg = (key, fallback) => (I18N[key] !== undefined ? I18N[key] : fallback);

function detectLocalePaper() {
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  const first = (langs[0] || '').toLowerCase();
  if (first === 'en-us' || first === 'en-ca') return 'letter';
  return 'a4';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sanitizeDownloadBase(filename) {
  const base = (filename || 'poster').replace(/\.[^.]+$/, '');
  const clean = base.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return clean || 'poster';
}

async function decodeImageDrawable(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(msg('errImageDecode', 'Could not decode image file.')));
      img.src = url;
    });
    const width = img.naturalWidth || img.width || 1200;
    const height = img.naturalHeight || img.height || 900;
    // Render onto an independent canvas so Blob URL can be revoked immediately
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return { drawable: canvas, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function initPosterApp() {
  const appRoot = $('poster-app');
  if (!appRoot) return;

  const ds = document.body.dataset;
  const qp = new URLSearchParams(window.location.search);

  let initialPaper = ds.presetPaper && ds.presetPaper !== 'auto' ? ds.presetPaper : detectLocalePaper();
  if (qp.has('paper') && PAPERS[qp.get('paper')]) {
    initialPaper = qp.get('paper');
  }

  let initialUnits = ds.presetUnits && ds.presetUnits !== 'auto'
    ? ds.presetUnits
    : PAPERS[initialPaper].defaultUnits === 'in'
      ? 'in'
      : 'cm';
  if (qp.has('units') && ['cm', 'mm', 'in'].includes(qp.get('units'))) {
    initialUnits = qp.get('units');
  }

  let initialMode = ds.presetMode || 'sheets-width';
  let initialValue = Number(ds.presetValue) || 3;
  if (qp.has('mode') && ['sheets-width', 'sheets-height', 'size-width', 'size-height', 'scale'].includes(qp.get('mode'))) {
    initialMode = qp.get('mode');
  }
  if (qp.has('cols')) {
    initialMode = 'sheets-width';
    initialValue = Number(qp.get('cols')) || initialValue;
  } else if (qp.has('rows')) {
    initialMode = 'sheets-height';
    initialValue = Number(qp.get('rows')) || initialValue;
  } else if (qp.has('scale')) {
    initialMode = 'scale';
    initialValue = Number(qp.get('scale')) || 100;
  } else if (qp.has('width')) {
    initialMode = 'size-width';
    initialValue = Number(qp.get('width')) || 60;
  }

  const els = {
    dropzone: $('dropzone'),
    fileInput: $('file-input'),
    btnSample: $('btn-sample'),
    btnChangeFile: $('btn-change-file'),
    emptyState: $('empty-state'),
    workspace: $('workspace'),
    previewCanvas: $('preview-canvas'),
    previewCaption: $('preview-caption'),
    pdfPageControls: $('pdf-page-controls'),
    btnPrevPage: $('btn-prev-page'),
    pdfPageLabel: $('pdf-page-label'),
    btnNextPage: $('btn-next-page'),
    paperSelect: $('paper-select'),
    oriSelect: $('ori-select'),
    unitsSelect: $('units-select'),
    modeSelect: $('mode-select'),
    sizeValue: $('size-value'),
    sizeUnitLabel: $('size-unit-label'),
    marginInput: $('margin-input'),
    overlapInput: $('overlap-input'),
    optCropMarks: $('opt-crop-marks'),
    optTileLabels: $('opt-tile-labels'),
    optAssemblyMap: $('opt-assembly-map'),
    summarySheets: $('summary-sheets'),
    summarySize: $('summary-size'),
    summaryDpi: $('summary-dpi'),
    summaryWarnings: $('summary-warnings'),
    summaryExcluded: $('summary-excluded'),
    btnResetExcluded: $('btn-reset-excluded'),
    btnDownload: $('btn-download'),
    btnPrint: $('btn-print'),
    exportStatus: $('export-status'),
  };

  // Apply initial presets to DOM inputs
  els.paperSelect.value = initialPaper;
  els.unitsSelect.value = initialUnits;
  els.modeSelect.value = initialMode;
  els.sizeValue.value = String(initialValue);
  if (qp.has('ori') && ['auto', 'portrait', 'landscape'].includes(qp.get('ori'))) {
    els.oriSelect.value = qp.get('ori');
  }
  if (qp.has('margin')) {
    els.marginInput.value = String(Math.max(0, Math.min(40, Number(qp.get('margin')) || 0)));
  } else if (initialPaper === 'letter' || initialPaper === 'legal') {
    els.marginInput.value = '6';
    els.overlapInput.value = '12';
  }
  if (qp.has('overlap')) {
    els.overlapInput.value = String(Math.max(0, Math.min(80, Number(qp.get('overlap')) || 0)));
  }
  if (ds.presetMap === 'true') {
    els.optAssemblyMap.checked = true;
  }

  let currentUnits = els.unitsSelect.value;
  let currentSource = null;
  let currentLayout = null;
  let excludedTiles = new Set();
  let busy = false;
  let lastPdfObjectUrl = null;

  const preview = new TilePreview(els.previewCanvas, (tileKey) => {
    if (excludedTiles.has(tileKey)) excludedTiles.delete(tileKey);
    else excludedTiles.add(tileKey);
    recompute();
  });

  function setStatus(text, isError = false) {
    els.exportStatus.textContent = text || '';
    els.exportStatus.classList.toggle('status-error', Boolean(isError));
  }

  function updateModeLabel() {
    const mode = els.modeSelect.value;
    const units = els.unitsSelect.value;
    if (mode === 'sheets-width' || mode === 'sheets-height') {
      els.sizeUnitLabel.textContent = msg('unitSheets', 'sheets');
      els.sizeValue.min = '1';
      els.sizeValue.max = '20';
      els.sizeValue.step = '1';
    } else if (mode === 'scale') {
      els.sizeUnitLabel.textContent = '%';
      els.sizeValue.min = '10';
      els.sizeValue.max = '1000';
      els.sizeValue.step = '5';
    } else {
      els.sizeUnitLabel.textContent = units;
      els.sizeValue.min = '1';
      els.sizeValue.max = units === 'mm' ? '20000' : units === 'cm' ? '2000' : '800';
      els.sizeValue.step = units === 'mm' ? '10' : '1';
    }
  }

  function getModeValueInInternalUnits() {
    const mode = els.modeSelect.value;
    const raw = Number(els.sizeValue.value);
    if (!Number.isFinite(raw) || raw <= 0) return mode === 'scale' ? 100 : 3;
    if (mode === 'size-width' || mode === 'size-height') {
      const units = els.unitsSelect.value;
      if (units === 'cm') return cmToMm(raw);
      if (units === 'in') return inToMm(raw);
      return raw;
    }
    return raw;
  }

  function recompute() {
    updateModeLabel();
    if (!currentSource) return;

    const layout = computeLayout({
      srcWidth: currentSource.width,
      srcHeight: currentSource.height,
      srcPhysWmm: currentSource.physWmm,
      srcPhysHmm: currentSource.physHmm,
      isVector: currentSource.type === 'pdf',
      paper: els.paperSelect.value,
      orientation: els.oriSelect.value,
      mode: els.modeSelect.value,
      value: getModeValueInInternalUnits(),
      marginMm: Number(els.marginInput.value) || 0,
      overlapMm: Number(els.overlapInput.value) || 0,
      excludedTiles,
    });
    currentLayout = layout;

    preview.update(currentSource.drawable, layout);

    const units = els.unitsSelect.value;
    const totalSheetsText = `${layout.cols}×${layout.rows} (${layout.activeCount} ${layout.paperName} ${layout.orientation})`;
    els.summarySheets.textContent = totalSheetsText;
    els.summarySize.textContent = `${formatDimensions(layout.posterW, layout.posterH, units)} · ${layout.scalePct}%`;

    if (layout.isVector) {
      els.summaryDpi.textContent = msg('qualityVector', 'Vector (infinite sharpness)');
      els.summaryDpi.dataset.tier = 'vector';
    } else {
      const tierMap = {
        crisp: msg('qualityCrisp', 'crisp print'),
        good: msg('qualityGood', 'good for wall viewing'),
        low: msg('qualityLow', 'low resolution — consider fewer sheets'),
      };
      els.summaryDpi.textContent = `~${layout.dpi} DPI (${tierMap[layout.qualityTier]})`;
      els.summaryDpi.dataset.tier = layout.qualityTier;
    }

    const excludedCount = excludedTiles.size;
    els.summaryExcluded.hidden = excludedCount === 0;
    if (excludedCount > 0) {
      els.btnResetExcluded.textContent = `Restore ${excludedCount} skipped`;
    }

    if (layout.tooManySheets) {
      els.summaryWarnings.textContent = `Grid exceeds 400 sheets (${layout.totalCount}). Reduce poster size or sheet count.`;
      els.summaryWarnings.hidden = false;
      els.btnDownload.disabled = true;
      els.btnPrint.disabled = true;
    } else if (layout.activeCount === 0) {
      els.summaryWarnings.textContent = 'All sheets are currently skipped. Click a tile on the preview to re-enable it.';
      els.summaryWarnings.hidden = false;
      els.btnDownload.disabled = true;
      els.btnPrint.disabled = true;
    } else {
      els.summaryWarnings.hidden = true;
      els.btnDownload.disabled = busy;
      els.btnPrint.disabled = busy;
    }

    const mapNote = optsIncludeMap() && layout.activeCount > 1 ? ' + 1 assembly map page' : '';
    els.previewCaption.textContent = `${currentSource.filename} · Click any sheet to skip/include · Output: ${layout.activeCount} tile${layout.activeCount === 1 ? '' : 's'}${mapNote}`;
  }

  function optsIncludeMap() {
    return els.optAssemblyMap.checked;
  }

  async function releasePreviousSource() {
    if (currentSource && currentSource.pdfReader) {
      try {
        await currentSource.pdfReader.destroy();
      } catch {
        // ignore cleanup error
      }
    }
    currentSource = null;
  }

  async function renderPdfPage(pageNum) {
    if (!currentSource || !currentSource.pdfReader) return;
    setStatus(msg('statusRenderingPdf', 'Rendering PDF preview...'));
    const info = await currentSource.pdfReader.getPageInfo(pageNum);
    const rendered = await currentSource.pdfReader.renderPreview(pageNum, 1600);
    currentSource.pageIndex = pageNum - 1;
    currentSource.width = rendered.width;
    currentSource.height = rendered.height;
    currentSource.physWmm = info.widthMm;
    currentSource.physHmm = info.heightMm;
    currentSource.drawable = rendered.canvas;

    const total = currentSource.pdfReader.numPages;
    els.pdfPageControls.hidden = total <= 1;
    els.pdfPageLabel.textContent = `Page ${pageNum} / ${total}`;
    els.btnPrevPage.disabled = pageNum <= 1;
    els.btnNextPage.disabled = pageNum >= total;
    excludedTiles.clear();
    setStatus('');
    recompute();
  }

  async function loadInputFile(fileOrBlob, filename) {
    if (busy) return;
    busy = true;
    setStatus(msg('statusLoading', 'Loading file locally...'));
    try {
      await releasePreviousSource();
      excludedTiles.clear();

      const bytes = new Uint8Array(await fileOrBlob.arrayBuffer());
      const name = filename || fileOrBlob.name || 'poster';
      const isPdf =
        fileOrBlob.type === 'application/pdf' ||
        name.toLowerCase().endsWith('.pdf') ||
        (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);

      if (isPdf) {
        const { loadPdfDocument } = await import('./pdf-reader.js');
        const pdfReader = await loadPdfDocument(bytes);
        currentSource = {
          type: 'pdf',
          filename: name,
          bytes,
          pdfReader,
          pageIndex: 0,
          width: 1,
          height: 1,
          physWmm: 210,
          physHmm: 297,
          drawable: null,
        };
        els.emptyState.hidden = true;
        els.workspace.hidden = false;
        await renderPdfPage(1);
      } else {
        const mimeType = fileOrBlob.type || (name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
        const exifOrientation = mimeType === 'image/jpeg' ? readJpegExifOrientation(bytes) : 1;
        const decoded = await decodeImageDrawable(fileOrBlob);
        currentSource = {
          type: 'image',
          filename: name,
          blob: fileOrBlob,
          bytes,
          mimeType,
          exifOrientation,
          width: decoded.width,
          height: decoded.height,
          physWmm: (decoded.width / 96) * 25.4,
          physHmm: (decoded.height / 96) * 25.4,
          drawable: decoded.drawable,
        };
        els.pdfPageControls.hidden = true;
        els.emptyState.hidden = true;
        els.workspace.hidden = false;
        setStatus('');
        recompute();
      }
    } catch (err) {
      setStatus(err && err.message ? err.message : msg('errLoad', 'Could not open this file.'), true);
    } finally {
      busy = false;
      if (currentSource && currentLayout && !currentLayout.tooManySheets && currentLayout.activeCount > 0) {
        els.btnDownload.disabled = false;
        els.btnPrint.disabled = false;
      }
    }
  }

  async function loadSamplePoster() {
    const sample = await createSamplePosterBlob();
    await loadInputFile(sample.blob, sample.filename);
  }

  async function buildPdf() {
    if (!currentSource || !currentLayout || busy) return null;
    busy = true;
    els.btnDownload.disabled = true;
    els.btnPrint.disabled = true;
    const t0 = performance.now();
    try {
      setStatus(msg('statusBuilding', 'Building print-ready PDF locally...'));
      const { generateTiledPdf } = await import('./pdf-exporter.js');
      const result = await generateTiledPdf({
        source: currentSource,
        layout: currentLayout,
        options: {
          cropMarks: els.optCropMarks.checked,
          tileLabels: els.optTileLabels.checked,
          includeMap: els.optAssemblyMap.checked,
        },
      });
      const elapsed = Math.round(performance.now() - t0);
      const modeTag = result.mode === 'vector' ? 'Vector PDF' : 'PDF';
      const warnText = result.warnings.length ? ` · Note: ${result.warnings[0]}` : '';
      setStatus(
        `${modeTag} ready (${result.pageCount} pages, ${formatBytes(result.bytes.byteLength)}, ${elapsed} ms). Remember: print at 100% / Actual Size.${warnText}`,
      );
      return result;
    } catch (err) {
      setStatus(err && err.message ? err.message : msg('errExport', 'PDF export failed.'), true);
      return null;
    } finally {
      busy = false;
      if (currentLayout && !currentLayout.tooManySheets && currentLayout.activeCount > 0) {
        els.btnDownload.disabled = false;
        els.btnPrint.disabled = false;
      }
    }
  }

  function revokeLastObjectUrl() {
    if (lastPdfObjectUrl) {
      URL.revokeObjectURL(lastPdfObjectUrl);
      lastPdfObjectUrl = null;
    }
  }

  // Event listeners
  els.fileInput.addEventListener('change', () => {
    const f = els.fileInput.files && els.fileInput.files[0];
    if (f) loadInputFile(f, f.name);
    els.fileInput.value = '';
  });

  els.btnChangeFile.addEventListener('click', () => els.fileInput.click());
  els.btnSample.addEventListener('click', () => loadSamplePoster());

  ['dragenter', 'dragover'].forEach((ev) => {
    els.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropzone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    els.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropzone.classList.remove('is-dragover');
    });
  });
  els.dropzone.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadInputFile(f, f.name);
  });

  window.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          loadInputFile(file, file.name || 'pasted-poster.png');
          break;
        }
      }
    }
  });

  els.btnPrevPage.addEventListener('click', () => {
    if (currentSource && currentSource.pageIndex > 0) {
      renderPdfPage(currentSource.pageIndex);
    }
  });
  els.btnNextPage.addEventListener('click', () => {
    if (currentSource && currentSource.pdfReader && currentSource.pageIndex + 1 < currentSource.pdfReader.numPages) {
      renderPdfPage(currentSource.pageIndex + 2);
    }
  });

  els.unitsSelect.addEventListener('change', () => {
    const nextUnits = els.unitsSelect.value;
    const mode = els.modeSelect.value;
    if (mode === 'size-width' || mode === 'size-height') {
      const val = Number(els.sizeValue.value);
      if (Number.isFinite(val) && val > 0) {
        const mm = currentUnits === 'cm' ? cmToMm(val) : currentUnits === 'in' ? inToMm(val) : val;
        const converted = nextUnits === 'cm' ? mmToCm(mm) : nextUnits === 'in' ? mmToIn(mm) : mm;
        els.sizeValue.value = nextUnits === 'mm' ? String(Math.round(converted)) : converted.toFixed(1);
      }
    }
    currentUnits = nextUnits;
    recompute();
  });

  els.modeSelect.addEventListener('change', () => {
    const mode = els.modeSelect.value;
    if (mode === 'scale') {
      els.sizeValue.value = '100';
    } else if (mode === 'sheets-width' || mode === 'sheets-height') {
      els.sizeValue.value = currentLayout
        ? String(mode === 'sheets-width' ? currentLayout.cols : currentLayout.rows)
        : '3';
    } else if (currentLayout) {
      const mm = mode === 'size-width' ? currentLayout.posterW : currentLayout.posterH;
      const u = els.unitsSelect.value;
      const val = u === 'cm' ? mmToCm(mm) : u === 'in' ? mmToIn(mm) : mm;
      els.sizeValue.value = u === 'mm' ? String(Math.round(val)) : val.toFixed(1);
    }
    recompute();
  });

  [els.paperSelect, els.oriSelect, els.sizeValue, els.marginInput, els.overlapInput, els.optCropMarks, els.optTileLabels, els.optAssemblyMap].forEach((el) => {
    el.addEventListener('input', recompute);
    el.addEventListener('change', recompute);
  });

  els.btnResetExcluded.addEventListener('click', () => {
    excludedTiles.clear();
    recompute();
  });

  els.btnDownload.addEventListener('click', async () => {
    const res = await buildPdf();
    if (!res) return;
    revokeLastObjectUrl();
    const blob = new Blob([res.bytes], { type: 'application/pdf' });
    lastPdfObjectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = lastPdfObjectUrl;
    const base = sanitizeDownloadBase(currentSource.filename);
    a.download = `${base}-poster-${currentLayout.cols}x${currentLayout.rows}-${currentLayout.paperId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(revokeLastObjectUrl, 60_000);
  });

  els.btnPrint.addEventListener('click', async () => {
    const res = await buildPdf();
    if (!res) return;
    revokeLastObjectUrl();
    const blob = new Blob([res.bytes], { type: 'application/pdf' });
    lastPdfObjectUrl = URL.createObjectURL(blob);
    const win = window.open(lastPdfObjectUrl, '_blank', 'noopener');
    if (!win) {
      // Clean fallback if popup blocker blocked opening PDF tab
      const a = document.createElement('a');
      a.href = lastPdfObjectUrl;
      a.download = `${sanitizeDownloadBase(currentSource.filename)}-poster-${currentLayout.cols}x${currentLayout.rows}-${currentLayout.paperId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus('Pop-up blocked — downloaded PDF instead. Open it and print at 100% / Actual Size.');
    }
  });

  updateModeLabel();
  if (qp.get('sample') === '1') {
    loadSamplePoster();
  }
}

initPosterApp();
