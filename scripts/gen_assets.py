#!/usr/bin/env python3
"""Generate static PNG icons and the 1200x630 OpenGraph preview card."""

from __future__ import annotations

import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "src/assets"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        [
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        if bold
        else [
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    )
    for path in candidates:
        if pathlib.Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_grid_icon(size: int) -> Image.Image:
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = int(s * 0.19)
    draw.rounded_rectangle((0, 0, s - 1, s - 1), radius=radius, fill=(24, 24, 27, 255))

    pad = int(s * 0.15)
    gap = int(s * 0.06)
    cell = (s - 2 * pad - gap) // 2
    inset = max(2, int(cell * 0.15))

    colors = [
        (29, 78, 216, 255),
        (37, 99, 235, 225),
        (37, 99, 235, 225),
        (59, 130, 246, 200),
    ]
    idx = 0
    for r in range(2):
        for c in range(2):
            x0 = pad + c * (cell + gap)
            y0 = pad + r * (cell + gap)
            draw.rounded_rectangle((x0, y0, x0 + cell, y0 + cell), radius=max(2, s // 32), fill=(255, 255, 255, 255))
            draw.rectangle((x0 + inset, y0 + inset, x0 + cell - inset, y0 + cell - inset), fill=colors[idx])
            idx += 1

    # Vermilion center crosshair
    cx, cy = s // 2, s // 2
    arm = int(s * 0.08)
    stroke = max(3, s // 24)
    draw.line((cx - arm, cy, cx + arm, cy), fill=(239, 68, 68, 255), width=stroke)
    draw.line((cx, cy - arm, cx, cy + arm), fill=(239, 68, 68, 255), width=stroke)

    return img.resize((size, size), Image.Resampling.LANCZOS)


def draw_og_image() -> Image.Image:
    W, H = 1200, 630
    bg = (246, 245, 240)
    ink = (24, 24, 27)
    muted = (82, 82, 91)
    cobalt = (29, 78, 216)
    red = (220, 38, 38)

    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)

    # Subtle drafting grid lines
    for x in range(0, W, 40):
        draw.line((x, 0, x, H), fill=(234, 232, 224), width=1)
    for y in range(0, H, 40):
        draw.line((0, y, W, y), fill=(234, 232, 224), width=1)

    # Top accent bar
    draw.rectangle((0, 0, W, 10), fill=cobalt)

    f_badge = load_font(22, bold=True)
    f_title = load_font(62, bold=True)
    f_sub = load_font(32, bold=False)
    f_meta = load_font(24, bold=True)

    # Left typography column
    draw.rounded_rectangle((72, 82, 396, 126), radius=8, fill=(224, 231, 255))
    draw.text((90, 92), "100% LOCAL IN BROWSER", font=f_badge, fill=cobalt)

    draw.text((72, 165), "WidePosterMaker", font=f_title, fill=ink)
    draw.text((72, 255), "Print Giant Posters on", font=f_sub, fill=muted)
    draw.text((72, 300), "A4 & US Letter Paper", font=f_sub, fill=muted)

    bullets = [
        "Images & Vector PDFs (Zero Upload)",
        "Crop Marks, Glue Tabs & 100% Scale",
        "Assembly Map + Calibration Ruler",
    ]
    y_b = 382
    for item in bullets:
        draw.ellipse((74, y_b + 8, 86, y_b + 20), fill=cobalt)
        draw.text((100, y_b), item, font=load_font(24), fill=ink)
        y_b += 42

    draw.text((72, 546), "widepostermaker.com  ·  Free & Open Source (MIT)", font=f_meta, fill=cobalt)

    # Right illustration: 3x2 tiled A4 sheet grid with crop marks
    gx0, gy0 = 710, 96
    tile_w, tile_h = 128, 178
    gap = 16
    cols, rows = 3, 2

    # Drop shadow behind tile sheet block
    for r in range(rows):
        for c in range(cols):
            tx = gx0 + c * (tile_w + gap)
            ty = gy0 + r * (tile_h + gap)
            draw.rounded_rectangle((tx + 6, ty + 6, tx + tile_w + 6, ty + tile_h + 6), radius=6, fill=(214, 211, 204))
            draw.rounded_rectangle((tx, ty, tx + tile_w, ty + tile_h), radius=6, fill=(255, 255, 255), outline=(212, 212, 216), width=2)

            # Inner artwork tile
            ix0, iy0 = tx + 14, ty + 14
            ix1, iy1 = tx + tile_w - 14, ty + tile_h - 14
            shade = (
                29 + c * 18,
                78 + r * 35 + c * 14,
                216,
            )
            draw.rectangle((ix0, iy0, ix1, iy1), fill=shade)

            # Dashed glue overlap strip on right/bottom edges
            if c < cols - 1:
                draw.rectangle((ix1 - 14, iy0, ix1, iy1), fill=(191, 219, 254))
            if r < rows - 1:
                draw.rectangle((ix0, iy1 - 14, ix1, iy1), fill=(191, 219, 254))

            # Label
            label = f"{chr(65 + r)}{c + 1}"
            draw.rectangle((ix0 + 6, iy0 + 6, ix0 + 46, iy0 + 34), fill=(24, 24, 27))
            draw.text((ix0 + 14, iy0 + 9), label, font=load_font(18, bold=True), fill=(255, 255, 255))

            # Red corner crop marks
            for cx, cy in ((ix0, iy0), (ix1, iy0), (ix0, iy1), (ix1, iy1)):
                draw.line((cx - 8, cy, cx + 8, cy), fill=red, width=2)
                draw.line((cx, cy - 8, cx, cy + 8), fill=red, width=2)

    # Bottom calibration ruler preview
    rx0, ry0 = gx0, 496
    draw.rounded_rectangle((rx0, ry0, gx0 + 3 * tile_w + 2 * gap, 560), radius=8, fill=(255, 255, 255), outline=(212, 212, 216), width=2)
    draw.text((rx0 + 18, ry0 + 10), "50 mm Calibration Check · Print at 100%", font=load_font(17, bold=True), fill=ink)
    bar_x0, bar_y = rx0 + 18, ry0 + 44
    bar_w = 240
    draw.line((bar_x0, bar_y, bar_x0 + bar_w, bar_y), fill=ink, width=3)
    for i in range(6):
        tx = bar_x0 + int(i * (bar_w / 5))
        draw.line((tx, bar_y - 10, tx, bar_y + 4), fill=red if i in (0, 5) else ink, width=2)

    return img


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for size, filename in [
        (192, "icon-192.png"),
        (512, "icon-512.png"),
        (180, "apple-touch-icon.png"),
    ]:
        out = ASSETS / filename
        draw_grid_icon(size).save(out, format="PNG", optimize=True)
        print(f"Wrote {out.relative_to(ROOT)}")

    og = ASSETS / "og-image.png"
    draw_og_image().save(og, format="PNG", optimize=True)
    print(f"Wrote {og.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
