"""Sheet-count geometry for build-time tables.

A line-by-line port of resolveSheetGeometry() + the 'scale' branch of
solveGridForOrientation() and the 'auto' orientation choice in src/js/layout.js.
Parity with the real JS is asserted by tests/test_e2e_browser.py.
"""

from __future__ import annotations

import math

PAPERS: dict[str, tuple[float, float]] = {
    "a4": (210.0, 297.0),
    "letter": (215.9, 279.4),
    "a3": (297.0, 420.0),
    "legal": (215.9, 355.6),
}
PAPER_NAMES = {"a4": "A4", "letter": "US Letter", "a3": "A3", "legal": "US Legal"}

# Same defaults the app applies when the paper is chosen (app.js).
DEFAULTS: dict[str, tuple[float, float]] = {
    "a4": (5.0, 10.0),
    "a3": (5.0, 10.0),
    "letter": (6.0, 12.0),
    "legal": (6.0, 12.0),
}

POSTERS: dict[str, tuple[float, float]] = {
    "a0": (841.0, 1189.0),
    "a1": (594.0, 841.0),
    "a2": (420.0, 594.0),
    "a3": (297.0, 420.0),
}


def _clamp(val: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, val))


def _geometry(paper: str, orientation: str, margin: float, overlap: float) -> dict:
    pw, ph = PAPERS[paper]
    sheet_w, sheet_h = (ph, pw) if orientation == "landscape" else (pw, ph)
    margin = _clamp(margin, 0, min(sheet_w, sheet_h) * 0.2)
    print_w = max(10.0, sheet_w - 2 * margin)
    print_h = max(10.0, sheet_h - 2 * margin)
    overlap = _clamp(overlap, 0, min(print_w, print_h) * 0.45)
    return {
        "print_w": print_w,
        "print_h": print_h,
        "overlap": overlap,
        "step_x": max(1.0, print_w - overlap),
        "step_y": max(1.0, print_h - overlap),
    }


def _solve(geom: dict, poster_w: float, poster_h: float) -> dict:
    cols = max(1, math.ceil((poster_w - geom["overlap"] - 1e-6) / geom["step_x"]))
    rows = max(1, math.ceil((poster_h - geom["overlap"] - 1e-6) / geom["step_y"]))
    waste = cols * geom["print_w"] * rows * geom["print_h"] - poster_w * poster_h
    return {"cols": cols, "rows": rows, "total": cols * rows, "waste": waste}


def grid_for(poster: str, paper: str, margin: float | None = None, overlap: float | None = None) -> tuple[int, int]:
    """(cols, rows) for a portrait poster printed at 100 % on `paper`, orientation auto."""
    d_margin, d_overlap = DEFAULTS[paper]
    margin = d_margin if margin is None else margin
    overlap = d_overlap if overlap is None else overlap
    poster_w, poster_h = POSTERS[poster]
    p = _solve(_geometry(paper, "portrait", margin, overlap), poster_w, poster_h)
    l = _solve(_geometry(paper, "landscape", margin, overlap), poster_w, poster_h)
    if p["total"] < l["total"]:
        best = p
    elif l["total"] < p["total"]:
        best = l
    elif abs(p["waste"] - l["waste"]) > 1e-3:
        best = p if p["waste"] <= l["waste"] else l
    else:
        best = l if poster_w >= poster_h else p
    return best["cols"], best["rows"]


def matrix(posters: list[str], papers: list[str]) -> dict[str, tuple[int, int]]:
    return {f"{po}:{pa}": grid_for(po, pa) for po in posters for pa in papers}


if __name__ == "__main__":
    for key, (c, r) in matrix(list(POSTERS), list(PAPERS)).items():
        print(f"{key:12} {c} x {r} = {c * r}")
