const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const NodeTilerWorker = require('../main/services/NodeTilerWorker');

const fixtureDir = path.join(os.tmpdir(), 'poster-node-worker-tests');
const sampleImagePath = path.join(fixtureDir, 'sample.png');

const ensureSampleImage = async () => {
  await fs.mkdir(fixtureDir, { recursive: true });
  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 220, g: 200, b: 255 }
    }
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#cfe8ff"/><circle cx="200" cy="200" r="100" fill="#0ea5e9"/><text x="50" y="320" font-size="64" fill="#111827">Test Poster</text></svg>`
        )
      }
    ])
    .png()
    .toFile(sampleImagePath);
};

const createRequest = async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poster-node-worker-output-'));
  return {
    jobId: `job-${Date.now()}`,
    imagePath: sampleImagePath,
    document: { paperSize: 'A4', orientation: 'portrait', dpi: 150, marginMm: 5, overlapMm: 3 },
    grid: { rows: 2, cols: 2 },
    guides: { cropMarks: true, tileLabels: true },
    export: { format: 'pdf', namingTemplate: 'tile_{row}_{col}' },
    tempDir
  };
};

describe('NodeTilerWorker integration', () => {
  beforeAll(async () => {
    await ensureSampleImage();
  });

  it('produces a non-empty PDF with tiles', async () => {
    const worker = new NodeTilerWorker();
    const request = await createRequest();
    const result = await worker.run(request);
    expect(result.files).toHaveLength(1);
    const pdfPath = result.files[0];
    const stats = await fs.stat(pdfPath);
    expect(stats.size).toBeGreaterThan(10_000);
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(request.grid.rows * request.grid.cols);
    await worker.dispose();
  });
});
