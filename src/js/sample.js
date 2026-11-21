/**
 * Generates an offline drafting-poster sample image so first-time visitors
 * can test tiling and PDF export in one click.
 */

export async function createSamplePosterBlob() {
  const W = 1600;
  const H = 1131; // ~A-series sqrt(2) aspect ratio
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Warm drafting background
  ctx.fillStyle = '#f8f6ef';
  ctx.fillRect(0, 0, W, H);

  // Fine blueprint grid
  ctx.strokeStyle = '#e5e0d0';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Outer frame & corners
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 8;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4;
  ctx.strokeRect(72, 72, W - 144, H - 144);

  // Bold geometric architectural composition
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.arc(W * 0.68, H * 0.48, 290, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(W * 0.44, H * 0.78);
  ctx.lineTo(W * 0.66, H * 0.24);
  ctx.lineTo(W * 0.88, H * 0.78);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.globalAlpha = 0.88;
  ctx.fillRect(120, 210, 620, 420);
  ctx.globalAlpha = 1;

  // Typography
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 78px system-ui, -apple-system, sans-serif';
  ctx.fillText('WIDE POSTER', 162, 340);
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('TEST SHEET', 162, 430);

  ctx.fillStyle = '#e4e4e7';
  ctx.font = '600 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('ALIGNMENT · SEAMS · CROP MARKS', 162, 505);

  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.fillText('WIDEPOSTERMAKER.COM · 1600×1131 SAMPLE', 120, H - 110);

  // Diagonal alignment verification line across tile seams
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(90, H - 90);
  ctx.lineTo(W - 90, 90);
  ctx.stroke();
  ctx.setLineDash([]);

  // Color swatch strip
  const swatches = ['#18181b', '#1d4ed8', '#dc2626', '#047857', '#d97706'];
  swatches.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(120 + i * 74, 670, 60, 60);
  });

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to generate sample poster'))), 'image/png');
  });

  return {
    blob,
    width: W,
    height: H,
    filename: 'widepostermaker-sample.png',
  };
}
