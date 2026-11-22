#!/usr/bin/env python3
"""Validate content/pages/<locale>/*.json without building dist/.

Usage: python scripts/check_content.py [locale ...]   (default: all locales)
Checks: required keys, route/slug match, every EN slug exists in the locale,
related/chips/autoTable validity, title/description length, content word counts.
Exit code 1 on any problem.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import sheetcalc  # noqa: E402

LOCALES = ["en", "ru", "de", "es", "pl"]
NEW_SLUGS = {
    "print-large-image-on-multiple-pages",
    "split-image-into-pages",
    "a0-a1-a2-poster-on-a4",
    "print-pdf-on-multiple-pages",
}
MIN_WORDS_NEW = 380  # page-specific text (lead + sections + FAQ); the tool UI adds ~170 more
MIN_WORDS_ANY = 280
REQUIRED = ["slug", "route", "template", "breadcrumbTitle", "title", "description", "h1", "lead", "presets", "sections", "faqs"]
CHIP_RE = re.compile(r"^[a-z]+=[a-z0-9.]+(?:&[a-z]+=[a-z0-9.]+)*$")


def route_for(loc: str, slug: str) -> str:
    base = "/" if loc == "en" else f"/{loc}/"
    return base if not slug else f"{base}{slug}/"


def words(page: dict) -> int:
    parts = [page["lead"]]
    for sec in page["sections"]:
        parts.append(sec["heading"])
        parts += sec.get("paragraphs", [])
        parts += sec.get("list", [])
        for row in sec.get("table", {}).get("rows", []):
            parts += row
    for faq in page["faqs"]:
        parts += [faq["q"], faq["a"]]
    return len(" ".join(parts).split())


def check(loc: str, en_slugs: set[str]) -> list[str]:
    errs: list[str] = []
    pages = {}
    for f in sorted((ROOT / "content" / "pages" / loc).glob("*.json")):
        try:
            pages[f.stem] = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errs.append(f"{loc}/{f.name}: invalid JSON: {exc}")
    slugs = {p.get("slug", "") for p in pages.values()}
    for missing in sorted(en_slugs - slugs):
        errs.append(f"{loc}: missing page for slug {missing!r}")
    for name, p in pages.items():
        tag = f"{loc}/{name}.json"
        for key in REQUIRED:
            if key not in p:
                errs.append(f"{tag}: missing key {key}")
        if any(k not in p for k in REQUIRED):
            continue
        if p["route"] != route_for(loc, p["slug"]):
            errs.append(f"{tag}: route {p['route']} != {route_for(loc, p['slug'])}")
        if len(p["title"]) > 72:
            errs.append(f"{tag}: title {len(p['title'])} chars > 72")
        if len(p["description"]) > 165:
            errs.append(f"{tag}: description {len(p['description'])} chars > 165")
        for rel in p.get("related", []):
            if rel not in slugs:
                errs.append(f"{tag}: related slug {rel!r} does not exist in {loc}")
        for chip in p.get("chips", []):
            if not CHIP_RE.match(chip.get("query", "")) or not chip.get("label"):
                errs.append(f"{tag}: bad chip {chip}")
        for sec in p["sections"]:
            at = sec.get("autoTable")
            if at:
                bad = [x for x in at["posters"] if x not in sheetcalc.POSTERS] + [x for x in at["papers"] if x not in sheetcalc.PAPERS]
                if bad:
                    errs.append(f"{tag}: autoTable unknown ids {bad}")
        n = words(p)
        need = MIN_WORDS_NEW if p["slug"] in NEW_SLUGS else MIN_WORDS_ANY
        if n < need:
            errs.append(f"{tag}: {n} words < {need}")
        print(f"  {tag:55} {n:4} words  title={len(p['title'])} desc={len(p['description'])}")
    return errs


def main() -> int:
    locs = sys.argv[1:] or LOCALES
    en_slugs = {json.loads(f.read_text(encoding="utf-8"))["slug"] for f in (ROOT / "content" / "pages" / "en").glob("*.json")}
    errs: list[str] = []
    for loc in locs:
        errs += check(loc, en_slugs)
    for e in errs:
        print("ERROR", e)
    print("OK" if not errs else f"{len(errs)} problem(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
