#!/usr/bin/env python3
"""Utility for splitting a large raster image into printable A4 tiles."""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

from PIL import Image, ImageDraw, ImageFont

A4_WIDTH_MM = 210
A4_HEIGHT_MM = 297
MM_PER_INCH = 25.4
SUPPORTED_FORMATS = ("png", "jpg", "pdf")


def mm_to_px(value_mm: float, dpi: int) -> int:
    """Convert millimetres to whole pixels for the requested DPI."""
    return int(round(value_mm / MM_PER_INCH * dpi))


def compute_page_pixels(dpi: int, orientation: str) -> Tuple[int, int]:
    """Return (width, height) in pixels for A4 at the given DPI and orientation."""
    width_mm, height_mm = (A4_WIDTH_MM, A4_HEIGHT_MM)
    if orientation == "landscape":
        width_mm, height_mm = height_mm, width_mm
    width_px = mm_to_px(width_mm, dpi)
    height_px = mm_to_px(height_mm, dpi)
    return width_px, height_px


def compute_tile_counts(image_size: int, content_size: int, overlap_px: int) -> int:
    """Determine how many tiles are required along a single dimension."""
    if image_size <= content_size:
        return 1
    step = content_size - overlap_px
    if step <= 0:
        raise ValueError("Overlap is too large for the requested margins/page size")
    return int(math.ceil((image_size - overlap_px) / step))


def draw_guides(draw: ImageDraw.ImageDraw, page_size: Tuple[int, int], margin_px: int) -> None:
    """Draw simple crop marks near the edges of the tile."""
    page_w, page_h = page_size
    mark_len = max(20, min(page_w, page_h) // 25)
    inset = max(margin_px, 5)
    color = (64, 64, 64)

    # Four corners: draw small L-shaped marks just inside the printable area.
    corners = [
        ((inset, inset), (inset + mark_len, inset)),
        ((inset, inset), (inset, inset + mark_len)),
        ((page_w - inset, inset), (page_w - inset - mark_len, inset)),
        ((page_w - inset, inset), (page_w - inset, inset + mark_len)),
        ((inset, page_h - inset), (inset + mark_len, page_h - inset)),
        ((inset, page_h - inset), (inset, page_h - inset - mark_len)),
        ((page_w - inset, page_h - inset), (page_w - inset - mark_len, page_h - inset)),
        ((page_w - inset, page_h - inset), (page_w - inset, page_h - inset - mark_len)),
    ]
    for start, end in corners:
        draw.line((*start, *end), fill=color, width=1)


def annotate_tile(draw: ImageDraw.ImageDraw, page_size: Tuple[int, int], label: str) -> None:
    """Add a subtle identifier text to the tile."""
    page_w, page_h = page_size
    font = ImageFont.load_default()
    text_bbox = draw.textbbox((0, 0), label, font=font)
    padding = 6
    box_w = text_bbox[2] - text_bbox[0] + padding * 2
    box_h = text_bbox[3] - text_bbox[1] + padding * 2
    box_x = page_w - box_w - padding
    box_y = page_h - box_h - padding
    draw.rectangle(
        (box_x, box_y, box_x + box_w, box_y + box_h),
        fill=(255, 255, 255, 220),
        outline=(200, 200, 200),
    )
    draw.text((box_x + padding, box_y + padding), label, fill=(0, 0, 0), font=font)


def generate_tiles(
    canvas: Image.Image,
    page_size: Tuple[int, int],
    content_size: Tuple[int, int],
    margin_px: int,
    overlap_px: int,
    add_guides: bool,
) -> List[Tuple[Image.Image, int, int]]:
    """Split the prepared canvas into page-sized tiles."""
    page_w, page_h = page_size
    content_w, content_h = content_size
    step_x = content_w - overlap_px
    step_y = content_h - overlap_px
    if step_x <= 0 or step_y <= 0:
        raise ValueError("Overlap is too large for the printable area")

    tiles: List[Tuple[Image.Image, int, int]] = []
    tiles_x = compute_tile_counts(canvas.width, content_w, overlap_px)
    tiles_y = compute_tile_counts(canvas.height, content_h, overlap_px)

    for row in range(tiles_y):
        top = row * step_y
        bottom = top + content_h
        for col in range(tiles_x):
            left = col * step_x
            right = left + content_w
            # Last row/column can be smaller; Pillow crop clamps automatically, so
            # these edge tiles simply contain the remaining content centered in the page.
            region = canvas.crop((left, top, right, bottom))
            page = Image.new("RGB", page_size, color=(255, 255, 255))
            page.paste(region.convert("RGB"), (margin_px, margin_px))
            draw = ImageDraw.Draw(page)
            if add_guides:
                draw_guides(draw, page_size, margin_px)
            label = f"Row {row + 1:02d}, Col {col + 1:02d}"
            annotate_tile(draw, page_size, label)
            tiles.append((page, row + 1, col + 1))
    return tiles


def create_canvas(
    image: Image.Image,
    content_size: Tuple[int, int],
    overlap_px: int,
) -> Image.Image:
    """Scale/pad the source image so it fills the tiling grid."""
    content_w, content_h = content_size
    cols = compute_tile_counts(image.width, content_w, overlap_px)
    rows = compute_tile_counts(image.height, content_h, overlap_px)
    step_x = content_w - overlap_px
    step_y = content_h - overlap_px
    grid_w = content_w if cols == 1 else content_w + (cols - 1) * step_x
    grid_h = content_h if rows == 1 else content_h + (rows - 1) * step_y

    scale = min(grid_w / image.width, grid_h / image.height)
    new_size = (
        max(1, int(round(image.width * scale))),
        max(1, int(round(image.height * scale))),
    )
    resized = image.resize(new_size, Image.Resampling.LANCZOS) if new_size != image.size else image.copy()
    canvas = Image.new("RGBA", (grid_w, grid_h), color=(255, 255, 255, 0))
    offset = ((grid_w - new_size[0]) // 2, (grid_h - new_size[1]) // 2)
    canvas.paste(resized, offset)
    return canvas


def save_tiles(
    tiles: Sequence[Tuple[Image.Image, int, int]],
    output_dir: Path,
    fmt: str,
    dpi: int,
) -> List[Path]:
    """Persist the generated tiles according to the requested format."""
    generated: List[Path] = []
    if fmt == "pdf":
        pdf_path = output_dir / "tiles.pdf"
        if not tiles:
            raise RuntimeError("No tiles generated")
        rgb_tiles = [tile.convert("RGB") for tile, _, _ in tiles]
        first, rest = rgb_tiles[0], rgb_tiles[1:]
        first.save(pdf_path, save_all=True, append_images=rest, resolution=dpi)
        generated.append(pdf_path)
    else:
        for tile, row, col in tiles:
            name = f"tile_r{row:02d}_c{col:02d}.{fmt}"
            target = output_dir / name
            save_kwargs = {"dpi": (dpi, dpi)}
            if fmt == "jpg":
                save_kwargs["quality"] = 95
                save_kwargs["subsampling"] = 0
            tile.save(target, **save_kwargs)
            generated.append(target)
    return generated


def split_image_to_tiles(
    image_path: Path,
    output_dir: Path,
    dpi: int,
    orientation: str,
    margin_mm: float,
    overlap_mm: float,
    fmt: str,
    add_guides: bool,
) -> List[Path]:
    """High-level wrapper coordinating the tiling workflow."""
    if not image_path.exists():
        raise FileNotFoundError(f"Input image not found: {image_path}")
    output_dir.mkdir(parents=True, exist_ok=True)

    page_w, page_h = compute_page_pixels(dpi, orientation)
    margin_px = mm_to_px(margin_mm, dpi)
    overlap_px = mm_to_px(overlap_mm, dpi)
    printable_w = page_w - margin_px * 2
    printable_h = page_h - margin_px * 2
    if printable_w <= 0 or printable_h <= 0:
        raise ValueError("Margins are too large for the selected page size")
    if overlap_px >= printable_w or overlap_px >= printable_h:
        raise ValueError("Overlap must be smaller than the printable width/height")

    with Image.open(image_path) as img:
        img = img.convert("RGBA")
        src_w, src_h = img.size
        print(f"Source image: {src_w} x {src_h} px")
        print(f"Page size ({orientation}) at {dpi} DPI: {page_w} x {page_h} px")
        print(
            "Printable area per tile:"
            f" {printable_w} x {printable_h} px (margins {margin_px}px, overlap {overlap_px}px)"
        )
        canvas = create_canvas(img, (printable_w, printable_h), overlap_px)

    tile_list = generate_tiles(
        canvas=canvas,
        page_size=(page_w, page_h),
        content_size=(printable_w, printable_h),
        margin_px=margin_px,
        overlap_px=overlap_px,
        add_guides=add_guides,
    )
    print(f"Tile grid: {len({row for _, row, _ in tile_list})} rows x {len({col for _, _, col in tile_list})} cols")
    print(f"Saving tiles to: {output_dir}")
    return save_tiles(tile_list, output_dir, fmt, dpi)


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Split a large raster image into printable A4 tiles.",
    )
    parser.add_argument("-i", "--input", required=True, type=Path, help="Path to the source image file")
    parser.add_argument(
        "-o",
        "--output-dir",
        required=True,
        type=Path,
        help="Directory where the generated tiles will be saved",
    )
    parser.add_argument("--dpi", type=int, default=300, help="Target print DPI (default: 300)")
    parser.add_argument(
        "--orientation",
        choices=("portrait", "landscape"),
        default="portrait",
        help="Page orientation (default: portrait)",
    )
    parser.add_argument(
        "--margin-mm",
        type=float,
        default=0.0,
        help="Optional page margins in millimetres (applied on all sides)",
    )
    parser.add_argument(
        "--overlap-mm",
        type=float,
        default=0.0,
        help="Optional overlap between neighbouring tiles in millimetres",
    )
    parser.add_argument(
        "--format",
        choices=SUPPORTED_FORMATS,
        default="png",
        help="Export format: png, jpg, or pdf (default: png)",
    )
    parser.add_argument(
        "--add-guides",
        action="store_true",
        help="Draw thin cut guides along tile edges",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str]) -> int:
    """CLI entry point."""
    args = parse_args(argv)
    try:
        generated = split_image_to_tiles(
            image_path=args.input,
            output_dir=args.output_dir,
            dpi=args.dpi,
            orientation=args.orientation,
            margin_mm=args.margin_mm,
            overlap_mm=args.overlap_mm,
            fmt=args.format,
            add_guides=args.add_guides,
        )
    except Exception as exc:  # pylint: disable=broad-except
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.format == "pdf":
        print("Generated PDF:")
    else:
        print("Generated tiles:")
    for path in generated:
        print(f"  - {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
