/**
 * Lazy PDF reader powered by self-hosted pdf.js (Apache-2.0).
 */

import { PT_PER_MM } from './layout.js';

let pdfjsPromise = null;

async function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('../vendor/pdfjs/pdf.min.mjs').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL(
        '../vendor/pdfjs/pdf.worker.min.mjs',
        import.meta.url,
      ).href;
      return mod;
    });
  }
  return pdfjsPromise;
}

/**
 * Load a PDF from Uint8Array using a sliced copy so the caller's buffer is never detached.
 */
export async function loadPdfDocument(uint8Array) {
  const pdfjs = await getPdfJs();
  const dataCopy = uint8Array.slice();
  const loadingTask = pdfjs.getDocument({
    data: dataCopy,
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const pdfDoc = await loadingTask.promise;

  async function renderPageToCanvas(pageNum, scale) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.round(viewport.width));
    const height = Math.max(1, Math.round(viewport.height));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return { canvas, width, height };
  }

  return {
    numPages: pdfDoc.numPages,

    async getPageInfo(pageNum) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      return {
        pageNum,
        widthPt: viewport.width,
        heightPt: viewport.height,
        widthMm: viewport.width / PT_PER_MM,
        heightMm: viewport.height / PT_PER_MM,
        rotation: ((page.rotate % 360) + 360) % 360,
      };
    },

    async renderPreview(pageNum, maxSidePx = 1600) {
      const page = await pdfDoc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const longest = Math.max(base.width, base.height, 1);
      const scale = Math.min(4, Math.max(0.1, maxSidePx / longest));
      return renderPageToCanvas(pageNum, scale);
    },

    async renderForRasterFallback(pageNum, targetWidthPx, targetHeightPx) {
      const page = await pdfDoc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const maxDim = 4096;
      const desiredLongest = Math.max(1200, Math.min(maxDim, Math.max(targetWidthPx, targetHeightPx)));
      const scale = Math.min(8, Math.max(0.25, desiredLongest / Math.max(base.width, base.height, 1)));
      const { canvas, width, height } = await renderPageToCanvas(pageNum, scale);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Raster fallback encode failed'))), 'image/png');
      });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return { bytes, width, height };
    },

    async destroy() {
      await pdfDoc.destroy();
    },
  };
}
