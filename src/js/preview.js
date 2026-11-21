/**
 * Interactive HiDPI tile grid preview canvas.
 */

export class TilePreview {
  constructor(canvas, onTileToggle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onTileToggle = onTileToggle;
    this.sourceDrawable = null;
    this.layout = null;
    this.drawRect = null;

    this._handleClick = this._handleClick.bind(this);
    this._render = this._render.bind(this);

    this.canvas.addEventListener('click', this._handleClick);
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this.canvas.parentElement);
    }
    window.addEventListener('resize', this._render);
  }

  update(sourceDrawable, layout) {
    this.sourceDrawable = sourceDrawable;
    this.layout = layout;
    this._render();
  }

  clear() {
    this.sourceDrawable = null;
    this.layout = null;
    this.drawRect = null;
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  destroy() {
    this.canvas.removeEventListener('click', this._handleClick);
    window.removeEventListener('resize', this._render);
    if (this._ro) this._ro.disconnect();
  }

  _handleClick(evt) {
    if (!this.layout || !this.drawRect || this.layout.tooManySheets || !this.onTileToggle) return;
    const rect = this.canvas.getBoundingClientRect();
    const cssX = evt.clientX - rect.left;
    const cssY = evt.clientY - rect.top;
    const { x, y, w, h } = this.drawRect;
    if (cssX < x || cssX > x + w || cssY < y || cssY > y + h) return;

    const mmX = ((cssX - x) / w) * this.layout.posterW;
    const mmY = ((cssY - y) / h) * this.layout.posterH;

    // Pick tile whose center is nearest to pointer when landing on an overlap strip
    let bestTile = null;
    let bestDist = Infinity;
    for (const tile of this.layout.tiles) {
      if (mmX >= tile.x0 && mmX <= tile.x1 && mmY >= tile.y0 && mmY <= tile.y1) {
        const cx = tile.x0 + tile.localW / 2;
        const cy = tile.y0 + tile.localH / 2;
        const d = (mmX - cx) ** 2 + (mmY - cy) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestTile = tile;
        }
      }
    }
    if (bestTile) {
      this.onTileToggle(bestTile.key);
    }
  }

  _render() {
    const canvas = this.canvas;
    const parent = canvas.parentElement;
    if (!parent) return;

    const cssW = Math.max(260, parent.clientWidth || 560);
    const cssH = Math.max(260, Math.min(540, Math.round(cssW * 0.72)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    // Drafting backdrop
    ctx.fillStyle = '#f1efe7';
    ctx.fillRect(0, 0, cssW, cssH);

    if (!this.sourceDrawable || !this.layout) {
      ctx.restore();
      return;
    }

    const pad = 18;
    const availW = cssW - pad * 2;
    const availH = cssH - pad * 2;
    const scale = Math.min(availW / this.layout.posterW, availH / this.layout.posterH);
    const drawW = this.layout.posterW * scale;
    const drawH = this.layout.posterH * scale;
    const ox = (cssW - drawW) / 2;
    const oy = (cssH - drawH) / 2;
    this.drawRect = { x: ox, y: oy, w: drawW, h: drawH };

    // Drop shadow & white poster sheet base
    ctx.fillStyle = 'rgba(24, 24, 27, 0.12)';
    ctx.fillRect(ox + 4, oy + 4, drawW, drawH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox, oy, drawW, drawH);

    ctx.drawImage(this.sourceDrawable, ox, oy, drawW, drawH);

    if (this.layout.tooManySheets) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.18)';
      ctx.fillRect(ox, oy, drawW, drawH);
      ctx.restore();
      return;
    }

    // Draw tile grid overlay
    for (const tile of this.layout.tiles) {
      const tx = ox + tile.x0 * scale;
      const ty = oy + tile.y0 * scale;
      const tw = tile.localW * scale;
      const th = tile.localH * scale;
      if (tw <= 0.5 || th <= 0.5) continue;

      if (tile.excluded) {
        ctx.fillStyle = 'rgba(24, 24, 27, 0.56)';
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx + 4, ty + 4);
        ctx.lineTo(tx + tw - 4, ty + th - 4);
        ctx.moveTo(tx + tw - 4, ty + 4);
        ctx.lineTo(tx + 4, ty + th - 4);
        ctx.stroke();
      } else if (this.layout.overlapMm > 0) {
        // Subtle blue tint on right & bottom glue overlap tabs
        const ovPx = this.layout.overlapMm * scale;
        ctx.fillStyle = 'rgba(29, 78, 216, 0.14)';
        if (tile.hasRight && tw > ovPx) {
          ctx.fillRect(tx + tw - ovPx, ty, ovPx, th);
        }
        if (tile.hasBottom && th > ovPx) {
          ctx.fillRect(tx, ty + th - ovPx, tw, ovPx);
        }
      }

      // Tile border
      ctx.strokeStyle = tile.excluded ? 'rgba(255, 255, 255, 0.7)' : 'rgba(220, 38, 38, 0.85)';
      ctx.lineWidth = 1.25;
      ctx.strokeRect(tx, ty, tw, th);

      // High-contrast label pill if tile is big enough
      if (tw >= 26 && th >= 20) {
        const fontSize = Math.max(10, Math.min(13, Math.floor(Math.min(tw, th) * 0.25)));
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
        const text = tile.excluded ? `${tile.label} ×` : tile.label;
        const metrics = ctx.measureText(text);
        const pw = Math.min(tw - 4, metrics.width + 10);
        const ph = fontSize + 6;
        const px = tx + 4;
        const py = ty + 4;

        ctx.fillStyle = tile.excluded ? 'rgba(220, 38, 38, 0.92)' : 'rgba(24, 24, 27, 0.82)';
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        ctx.fillText(text, px + 5, py + 3);
      }
    }

    ctx.restore();
  }
}
