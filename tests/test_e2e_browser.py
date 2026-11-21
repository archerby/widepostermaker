"""End-to-end headless Chrome verification of layout math, EXIF, Single-XObject PDFs, and rotated vector PDF tiling."""

from __future__ import annotations

import base64
import functools
import http.server
import json
import pathlib
import shutil
import socketserver
import subprocess
import tempfile
import threading

import fitz
import pypdf
import pytest
from PIL import Image, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
CHROME_PATH = pathlib.Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")

CSP_HEADER = (
    "default-src 'self'; script-src 'self'; style-src 'self'; "
    "img-src 'self' blob: data:; worker-src 'self' blob:; "
    "connect-src 'self' blob:; font-src 'self'; object-src 'none'; "
    "base-uri 'self'; form-action 'none'"
)


def create_quadrant_image(path: pathlib.Path, width: int, height: int, exif_orientation: int | None = None) -> None:
    im = Image.new("RGB", (width, height), (255, 255, 255))
    hw, hh = width // 2, height // 2
    im.paste(Image.new("RGB", (hw, hh), (220, 30, 30)), (0, 0))          # TL Red
    im.paste(Image.new("RGB", (width - hw, hh), (30, 180, 60)), (hw, 0)) # TR Green
    im.paste(Image.new("RGB", (hw, height - hh), (30, 70, 220)), (0, hh)) # BL Blue
    im.paste(Image.new("RGB", (width - hw, height - hh), (240, 200, 20)), (hw, hh)) # BR Yellow

    if exif_orientation is not None:
        exif = im.getexif()
        exif[0x0112] = exif_orientation
        im.save(path, format="JPEG", quality=95, exif=exif.tobytes())
    else:
        im.save(path, format="JPEG", quality=95)


def create_rotated_cropbox_vector_pdf(path: pathlib.Path) -> dict[str, tuple[int, int, int]]:
    """Create a 2-page vector PDF where Page 2 has non-zero CropBox and /Rotate 90."""
    doc = fitz.open()

    # Page 1: A0-like blueprint grid
    p0 = doc.new_page(width=2384, height=1684)
    p0.draw_rect(fitz.Rect(20, 20, 2364, 1664), color=(0.1, 0.25, 0.7), width=4)
    p0.insert_text((80, 120), "PAGE 1 VECTOR BLUEPRINT", fontsize=36, color=(0.1, 0.1, 0.1))

    # Page 2: MediaBox [0,0,700,500], CropBox [50,40,650,440], /Rotate 90
    p1 = doc.new_page(width=700, height=500)
    # Draw 4 colored vector quadrants inside the CropBox before rotating so visual orientation is easy to verify
    # Unrotated CropBox: x in [50..650] (w=600), y in [40..440] (h=400) in fitz top-left coords!
    p1.draw_rect(fitz.Rect(50, 40, 350, 240), fill=(0.88, 0.12, 0.12), color=None)   # unrotated TL
    p1.draw_rect(fitz.Rect(350, 40, 650, 240), fill=(0.12, 0.72, 0.24), color=None)  # unrotated TR
    p1.draw_rect(fitz.Rect(50, 240, 350, 440), fill=(0.12, 0.28, 0.88), color=None)  # unrotated BL
    p1.draw_rect(fitz.Rect(350, 240, 650, 440), fill=(0.95, 0.78, 0.08), color=None) # unrotated BR
    p1.set_cropbox(fitz.Rect(50, 40, 650, 440))
    p1.set_rotation(90)

    doc.save(path)
    doc.close()

    # Render page 2 directly via PyMuPDF to record ground-truth visual quadrant RGB colors
    verify_doc = fitz.open(path)
    pix = verify_doc[1].get_pixmap(dpi=72)
    ref_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    w, h = ref_img.size
    truth = {
        "tl": ref_img.getpixel((w // 4, h // 4)),
        "tr": ref_img.getpixel((3 * w // 4, h // 4)),
        "bl": ref_img.getpixel((w // 4, 3 * h // 4)),
        "br": ref_img.getpixel((3 * w // 4, 3 * h // 4)),
    }
    verify_doc.close()
    return truth


HARNESS_HTML = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="{CSP_HEADER}">
  <title>WidePosterMaker E2E Harness</title>
</head>
<body>
  <div id="status">Running</div>
  <script type="module" src="/__test__/runner.js"></script>
</body>
</html>
"""

RUNNER_JS = r"""
import { computeLayout, PAPERS, tileLabel, rowLabel } from '/js/layout.js';
import { readJpegExifOrientation } from '/js/exif.js';
import { loadPdfDocument } from '/js/pdf-reader.js';
import { generateTiledPdf } from '/js/pdf-exporter.js';

const errors = [];
const cspViolations = [];

window.addEventListener('error', (e) => {
  errors.push(`window.error: ${e.message || e.type}`);
});
window.addEventListener('unhandledrejection', (e) => {
  errors.push(`unhandledrejection: ${e.reason?.message || String(e.reason)}`);
});
document.addEventListener('securitypolicyviolation', (e) => {
  cspViolations.push(`${e.violatedDirective}: ${e.blockedURI}`);
});

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function bytesToBase64(u8) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function runTests() {
  // 1. layout.js unit checks
  assert(rowLabel(0) === 'A' && rowLabel(25) === 'Z' && rowLabel(26) === 'AA', 'rowLabel multi-letter');
  assert(tileLabel(1, 2) === 'B3', 'tileLabel');
  assert(PAPERS.a4.widthMm === 210 && PAPERS.letter.widthMm === 215.9, 'paper constants');

  const l1 = computeLayout({
    srcWidth: 1200,
    srcHeight: 800,
    paper: 'a4',
    orientation: 'auto',
    mode: 'sheets-width',
    value: 2,
    marginMm: 5,
    overlapMm: 10,
  });
  assert(l1.orientation === 'landscape', 'auto picks landscape for wide 3:2 photo');
  assert(l1.cols === 2, '2 cols');
  assert(Math.abs(l1.posterW - (2 * (287 - 10) + 10)) < 0.01, 'posterW math');
  assert(l1.qualityTier === 'low' || l1.dpi > 0, 'dpi calculated');

  const lTooMany = computeLayout({
    srcWidth: 2000,
    srcHeight: 2000,
    paper: 'a4',
    orientation: 'portrait',
    mode: 'size-width',
    value: 15000,
    marginMm: 5,
    overlapMm: 10,
  });
  assert(lTooMany.tooManySheets === true && lTooMany.tiles.length === 0, 'MAX_SHEETS guard');

  // 2. EXIF orientation check
  const photoBuf = new Uint8Array(await (await fetch('/__test__/fixtures/test_photo.jpg')).arrayBuffer());
  const exifRot6Buf = new Uint8Array(await (await fetch('/__test__/fixtures/test_exif_rot6.jpg')).arrayBuffer());
  assert(readJpegExifOrientation(photoBuf) === 1, 'plain jpeg exif === 1');
  assert(readJpegExifOrientation(exifRot6Buf) === 6, 'exif orientation 6 detected');

  // 3. Single-XObject image export with 1 excluded tile + Assembly Map
  const photoBlob = new Blob([photoBuf], { type: 'image/jpeg' });
  const imgLayout = computeLayout({
    srcWidth: 1200,
    srcHeight: 800,
    paper: 'a4',
    orientation: 'portrait',
    mode: 'sheets-width',
    value: 2,
    marginMm: 5,
    overlapMm: 10,
    excludedTiles: new Set(['0-1']),
  });
  assert(imgLayout.cols === 2 && imgLayout.rows === 1 || imgLayout.cols === 2, 'imgLayout');
  // Force a 2x2 grid by making a square/tall layout or sheets-height=2
  const imgLayout2x2 = computeLayout({
    srcWidth: 1200,
    srcHeight: 1600,
    paper: 'a4',
    orientation: 'portrait',
    mode: 'sheets-width',
    value: 2,
    marginMm: 5,
    overlapMm: 10,
    excludedTiles: new Set(['0-1']),
  });
  assert(imgLayout2x2.cols === 2 && imgLayout2x2.rows === 2 && imgLayout2x2.activeCount === 3, '2x2 with 1 skipped = 3');
  const imgExport = await generateTiledPdf({
    source: {
      type: 'image',
      filename: 'quadrant_photo.jpg',
      blob: photoBlob,
      bytes: photoBuf,
      mimeType: 'image/jpeg',
      exifOrientation: 1,
      width: 1200,
      height: 1600,
    },
    layout: imgLayout2x2,
    options: { cropMarks: true, tileLabels: true, includeMap: true },
  });
  assert(imgExport.pageCount === 4, '1 map + 3 tiles = 4 pages');

  // 4. Rotated + CropBox vector PDF export with Cyrillic filename
  const pdfBuf = new Uint8Array(await (await fetch('/__test__/fixtures/test_vector_rot90.pdf')).arrayBuffer());
  const reader = await loadPdfDocument(pdfBuf);
  assert(reader.numPages === 2, '2 pages in fixture PDF');
  const p2Info = await reader.getPageInfo(2);
  assert(Math.abs(p2Info.widthMm - (400 / (72 / 25.4))) < 1.5, `rotated cropbox visual widthMm=${p2Info.widthMm}`);
  assert(Math.abs(p2Info.heightMm - (600 / (72 / 25.4))) < 1.5, `rotated cropbox visual heightMm=${p2Info.heightMm}`);

  const vecLayout = computeLayout({
    srcWidth: p2Info.widthPt,
    srcHeight: p2Info.heightPt,
    srcPhysWmm: p2Info.widthMm,
    srcPhysHmm: p2Info.heightMm,
    isVector: true,
    paper: 'letter',
    orientation: 'portrait',
    mode: 'sheets-width',
    value: 2,
    marginMm: 6,
    overlapMm: 10,
  });
  const vecExport = await generateTiledPdf({
    source: {
      type: 'pdf',
      filename: 'постер_тест_2026.pdf',
      bytes: pdfBuf,
      pdfReader: reader,
      pageIndex: 1,
      width: p2Info.widthPt,
      height: p2Info.heightPt,
    },
    layout: vecLayout,
    options: { cropMarks: true, tileLabels: true, includeMap: true },
  });
  assert(vecExport.mode === 'vector', `expected vector mode, got ${vecExport.mode}`);
  await reader.destroy();

  // 5. Real UI check at 390x844 mobile width using /?sample=1 inside same-origin iframe
  const iframe = document.createElement('iframe');
  iframe.width = '390';
  iframe.height = '844';
  iframe.src = '/?sample=1';
  document.body.appendChild(iframe);
  await new Promise((resolve, reject) => {
    const t0 = performance.now();
    function poll() {
      try {
        const doc = iframe.contentDocument;
        const ws = doc && doc.getElementById('workspace');
        const cv = doc && doc.getElementById('preview-canvas');
        if (ws && !ws.hidden && cv && cv.width > 0 && doc.getElementById('summary-sheets').textContent !== '—') {
          resolve();
          return;
        }
      } catch (e) {
        reject(e);
        return;
      }
      if (performance.now() - t0 > 10000) {
        reject(new Error('Timed out waiting for /?sample=1 workspace'));
        return;
      }
      setTimeout(poll, 80);
    }
    poll();
  });
  const mDoc = iframe.contentDocument;
  const mobileScrollW = mDoc.documentElement.scrollWidth;
  const mobileClientW = mDoc.documentElement.clientWidth;
  assert(mobileScrollW <= mobileClientW, `Mobile 390px horizontal overflow: scrollWidth=${mobileScrollW} > clientWidth=${mobileClientW}`);

  // 6. Real localized UI check on /ru/?sample=1 at 390x844 mobile width
  const ruFrame = document.createElement('iframe');
  ruFrame.width = '390';
  ruFrame.height = '844';
  ruFrame.src = '/ru/?sample=1';
  document.body.appendChild(ruFrame);
  await new Promise((resolve, reject) => {
    const t0 = performance.now();
    function pollRu() {
      try {
        const doc = ruFrame.contentDocument;
        const ws = doc && doc.getElementById('workspace');
        const sheets = doc && doc.getElementById('summary-sheets');
        const cap = doc && doc.getElementById('preview-caption');
        if (ws && !ws.hidden && sheets && sheets.textContent !== '—' && cap && cap.textContent.includes('Итог:')) {
          resolve();
          return;
        }
      } catch (e) {
        reject(e);
        return;
      }
      if (performance.now() - t0 > 10000) {
        reject(new Error('Timed out waiting for /ru/?sample=1 workspace'));
        return;
      }
      setTimeout(pollRu, 80);
    }
    pollRu();
  });
  const ruDoc = ruFrame.contentDocument;
  const ruScrollW = ruDoc.documentElement.scrollWidth;
  const ruClientW = ruDoc.documentElement.clientWidth;
  assert(ruScrollW <= ruClientW, `Mobile /ru/ 390px horizontal overflow: ${ruScrollW} > ${ruClientW}`);
  const ruSummaryText = ruDoc.getElementById('summary-sheets').textContent + ' ' + ruDoc.getElementById('preview-caption').textContent;
  assert(!ruSummaryText.includes('{') && !ruSummaryText.includes('}'), `Unreplaced i18n token in RU UI: ${ruSummaryText}`);

  return {
    ok: true,
    mobileMetrics: { mobileScrollW, mobileClientW },
    imgLayout: { cols: imgLayout2x2.cols, rows: imgLayout2x2.rows, activeCount: imgLayout2x2.activeCount },
    vecLayout: { cols: vecLayout.cols, rows: vecLayout.rows, activeCount: vecLayout.activeCount },
    imgPdfB64: bytesToBase64(imgExport.bytes),
    vecPdfB64: bytesToBase64(vecExport.bytes),
    vecMode: vecExport.mode,
    errors,
    cspViolations,
  };
}

runTests()
  .catch((err) => ({
    ok: false,
    fatal: err?.stack || err?.message || String(err),
    errors,
    cspViolations,
  }))
  .then(async (payload) => {
    document.getElementById('status').textContent = payload.ok ? 'DONE' : 'FAIL';
    await fetch('/__test__/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });
"""


def make_handler(dist_dir: pathlib.Path, fixtures_dir: pathlib.Path, report_box: dict, done_event: threading.Event):
    class TestHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(dist_dir), **kwargs)

        def log_message(self, format, *args):
            pass

        def do_GET(self):
            if self.path == "/__test__/harness.html":
                body = HARNESS_HTML.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if self.path == "/__test__/runner.js":
                body = RUNNER_JS.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if self.path.startswith("/__test__/fixtures/"):
                fname = pathlib.Path(self.path).name
                fpath = fixtures_dir / fname
                if fpath.is_file():
                    body = fpath.read_bytes()
                    ctype = "application/pdf" if fname.endswith(".pdf") else "image/jpeg"
                    self.send_response(200)
                    self.send_header("Content-Type", ctype)
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
            super().do_GET()

        def do_POST(self):
            if self.path == "/__test__/report":
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length)
                report_box["data"] = json.loads(raw.decode("utf-8"))
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
                done_event.set()
                return
            self.send_response(404)
            self.end_headers()

    return TestHandler


def color_close(c1: tuple[int, int, int], c2: tuple[int, int, int], tol: int = 35) -> bool:
    return all(abs(a - b) <= tol for a, b in zip(c1, c2))


def count_xobject_subtypes(pdf_bytes: bytes) -> dict[str, int]:
    """Count distinct indirect XObjects by /Subtype across the output PDF."""
    import io

    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    seen: dict[tuple[int, int], str] = {}
    for page in reader.pages:
        resources = page.get("/Resources")
        if not resources:
            continue
        xobjs = resources.get_object().get("/XObject")
        if not xobjs:
            continue
        for _name, ref in xobjs.get_object().items():
            key = (ref.idnum, ref.generation)
            if key not in seen:
                obj = ref.get_object()
                seen[key] = str(obj.get("/Subtype", ""))
    counts: dict[str, int] = {}
    for st in seen.values():
        counts[st] = counts.get(st, 0) + 1
    return counts


@pytest.mark.skipif(not CHROME_PATH.exists(), reason="Google Chrome not found")
def test_e2e_headless_chrome_and_pdf_inspection() -> None:
    if not (DIST / "index.html").exists():
        pytest.fail("dist/index.html missing — run scripts/build.py first")

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        tmp_path = pathlib.Path(tmp)
        fixtures_dir = tmp_path / "fixtures"
        fixtures_dir.mkdir()
        chrome_profile = tmp_path / "chrome_profile"
        chrome_profile.mkdir()

        create_quadrant_image(fixtures_dir / "test_photo.jpg", 1200, 800)
        create_quadrant_image(fixtures_dir / "test_exif_rot6.jpg", 800, 1200, exif_orientation=6)
        vec_truth = create_rotated_cropbox_vector_pdf(fixtures_dir / "test_vector_rot90.pdf")

        report_box: dict = {}
        done_event = threading.Event()
        handler_cls = make_handler(DIST, fixtures_dir, report_box, done_event)

        class ReusableTCPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
            daemon_threads = True

        server = ReusableTCPServer(("127.0.0.1", 0), handler_cls)
        port = server.server_address[1]
        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()

        chrome_proc = subprocess.Popen(
            [
                str(CHROME_PATH),
                "--headless=new",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                f"--user-data-dir={chrome_profile}",
                f"http://127.0.0.1:{port}/__test__/harness.html",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        try:
            finished = done_event.wait(timeout=30)
            assert finished, "Timed out waiting for headless Chrome test report"
        finally:
            chrome_proc.terminate()
            try:
                chrome_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                chrome_proc.kill()
            server.shutdown()
            server.server_close()

        rep = report_box.get("data", {})
        assert rep.get("ok"), f"Browser test runner failed: {rep}"
        assert not rep.get("errors"), f"Unhandled browser errors: {rep.get('errors')}"
        assert not rep.get("cspViolations"), f"CSP violations detected: {rep.get('cspViolations')}"

        # 1. Inspect Image PDF output (A4 2x2 with 1 skipped tile + 1 assembly map = 4 pages)
        img_pdf_bytes = base64.b64decode(rep["imgPdfB64"])
        img_xobjs = count_xobject_subtypes(img_pdf_bytes)
        assert img_xobjs.get("/Image") == 1, f"Expected Single-XObject (/Image == 1), got {img_xobjs}"

        img_doc = fitz.open(stream=img_pdf_bytes, filetype="pdf")
        assert img_doc.page_count == 4
        for pno in range(img_doc.page_count):
            rect = img_doc[pno].rect
            assert abs(rect.width - 595.28) < 0.3, f"Page {pno} A4 width {rect.width}"
            assert abs(rect.height - 841.89) < 0.3, f"Page {pno} A4 height {rect.height}"
            pix = img_doc[pno].get_pixmap(dpi=72)
            im = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            assert sum(ImageStat.Stat(im).stddev) > 15, f"Page {pno} rendered blank"

        # Page 1 (index 1) is A1 (top-left tile): check inside poster content shows TL Red
        p_a1 = img_doc[1].get_pixmap(dpi=72)
        im_a1 = Image.frombytes("RGB", [p_a1.width, p_a1.height], p_a1.samples)
        assert color_close(im_a1.getpixel((p_a1.width // 3, p_a1.height // 3)), (220, 30, 30)), (
            f"Expected Red in A1 tile, got {im_a1.getpixel((p_a1.width // 3, p_a1.height // 3))}"
        )
        img_doc.close()

        # 2. Inspect Vector PDF output (US Letter + rotated /CropBox source)
        vec_pdf_bytes = base64.b64decode(rep["vecPdfB64"])
        vec_xobjs = count_xobject_subtypes(vec_pdf_bytes)
        assert vec_xobjs.get("/Form", 0) >= 1, f"Expected vector /Form XObject in vector PDF, got {vec_xobjs}"
        assert vec_xobjs.get("/Image", 0) == 0, f"Unexpected raster /Image in vector PDF: {vec_xobjs}"

        vec_doc = fitz.open(stream=vec_pdf_bytes, filetype="pdf")
        cols = rep["vecLayout"]["cols"]
        rows = rep["vecLayout"]["rows"]
        assert vec_doc.page_count == 1 + cols * rows  # 1 assembly map + tiles

        for pno in range(vec_doc.page_count):
            rect = vec_doc[pno].rect
            assert abs(rect.width - 612.0) < 0.3, f"Page {pno} Letter width {rect.width}"
            assert abs(rect.height - 792.0) < 0.3, f"Page {pno} Letter height {rect.height}"

        # Top-left tile (page index 1): sample inside poster top-left corner should match source visual TL
        pix_tl = vec_doc[1].get_pixmap(dpi=72)
        im_tl = Image.frombytes("RGB", [pix_tl.width, pix_tl.height], pix_tl.samples)
        sample_tl = im_tl.getpixel((80, 80))
        assert color_close(sample_tl, vec_truth["tl"]), f"Rotated vector TL mismatch: got {sample_tl}, expected {vec_truth['tl']}"

        # Bottom-right tile (last page): sample center-ish top-left of its active tile area should match visual BR
        last_page = vec_doc[-1]
        pix_br = last_page.get_pixmap(dpi=72)
        im_br = Image.frombytes("RGB", [pix_br.width, pix_br.height], pix_br.samples)
        # Active content starts at margin (~17pt) on the bottom-right tile; check multiple interior points
        hit_br = False
        for px in (40, 80, 140):
            for py in (40, 80, 140):
                if color_close(im_br.getpixel((px, py)), vec_truth["br"]):
                    hit_br = True
        assert hit_br, f"Expected visual BR color {vec_truth['br']} inside bottom-right rotated vector tile"
        vec_doc.close()
