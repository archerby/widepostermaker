"""Verification suite for multilingual static build, SEO metadata, hreflang, strict CSP, and link integrity."""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from urllib.parse import urlparse

from PIL import Image, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
DOMAIN = "https://widepostermaker.com"
LOCALES = ("en", "ru", "de", "es", "pl")
SLUGS = (
    "",
    "pdf-poster-splitter",
    "a4-poster-maker",
    "letter-poster-maker",
    "sewing-pattern-tiler",
    "how-to-glue-a-tiled-poster",
)
EXPECTED_CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; "
    "img-src 'self' blob: data:; worker-src 'self' blob:; "
    "connect-src 'self' blob:; font-src 'self'; object-src 'none'; "
    "base-uri 'self'; form-action 'none'"
)


def route_for(loc: str, slug: str) -> str:
    if loc == "en":
        return "/" if not slug else f"/{slug}/"
    return f"/{loc}/" if not slug else f"/{loc}/{slug}/"


def rel_file_for(route: str) -> str:
    clean = route.strip("/")
    return "index.html" if not clean else f"{clean}/index.html"


class PageInspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.html_lang: str = ""
        self.title: str = ""
        self._in_title = False
        self.h1s: list[str] = []
        self._in_h1 = False
        self._h1_buf: list[str] = []
        self.meta: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.anchors: list[str] = []
        self.imgs: list[str] = []
        self.scripts: list[tuple[dict[str, str], str]] = []
        self._in_script = False
        self._script_attrs: dict[str, str] = {}
        self._script_buf: list[str] = []
        self.inline_style_attrs: list[str] = []
        self.event_handler_attrs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {k.lower(): (v or "") for k, v in attrs}
        for k in attr_map:
            if k == "style":
                self.inline_style_attrs.append(tag)
            if k.startswith("on"):
                self.event_handler_attrs.append(f"{tag}.{k}")

        if tag == "html":
            self.html_lang = attr_map.get("lang", "")
        elif tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._in_h1 = True
            self._h1_buf = []
        elif tag == "meta":
            self.meta.append(attr_map)
        elif tag == "link":
            self.links.append(attr_map)
        elif tag == "a" and "href" in attr_map:
            self.anchors.append(attr_map["href"])
        elif tag == "img" and "src" in attr_map:
            self.imgs.append(attr_map["src"])
        elif tag == "script":
            self._in_script = True
            self._script_attrs = attr_map
            self._script_buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "h1" and self._in_h1:
            self._in_h1 = False
            self.h1s.append("".join(self._h1_buf).strip())
        elif tag == "script" and self._in_script:
            self._in_script = False
            self.scripts.append((self._script_attrs, "".join(self._script_buf)))

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        if self._in_h1:
            self._h1_buf.append(data)
        if self._in_script:
            self._script_buf.append(data)


def resolve_dist_target(url_path: str) -> pathlib.Path | None:
    parsed = urlparse(url_path)
    if parsed.scheme in {"http", "https", "mailto", "tel", "blob", "data"}:
        return None
    clean = parsed.path
    if not clean or not clean.startswith("/"):
        return None
    rel = clean.lstrip("/")
    candidate = DIST / rel
    if candidate.is_file():
        return candidate
    if (candidate / "index.html").is_file():
        return candidate / "index.html"
    return candidate


def test_build_script_runs_and_emits_required_files() -> None:
    proc = subprocess.run([sys.executable, str(ROOT / "scripts/build.py")], capture_output=True, text=True, check=False)
    assert proc.returncode == 0, f"build.py failed:\n{proc.stdout}\n{proc.stderr}"

    required = [
        rel_file_for(route_for(loc, slug))
        for loc in LOCALES
        for slug in SLUGS
    ] + [
        "404.html",
        "sitemap.xml",
        "robots.txt",
        "llms.txt",
        "manifest.webmanifest",
        "CNAME",
        ".nojekyll",
        "css/style.css",
        "js/app.js",
        "js/layout.js",
        "js/pdf-exporter.js",
        "js/pdf-reader.js",
        "js/preview.js",
        "js/exif.js",
        "js/sample.js",
        "assets/favicon.svg",
        "assets/og-image.png",
        "assets/icon-192.png",
        "assets/icon-512.png",
        "vendor/pdf-lib/pdf-lib.esm.min.js",
        "vendor/pdfjs/pdf.min.mjs",
        "vendor/pdfjs/pdf.worker.min.mjs",
    ]
    for rel in required:
        assert (DIST / rel).exists(), f"Missing built artifact: dist/{rel}"

    assert (DIST / "CNAME").read_text(encoding="utf-8") == "widepostermaker.com\n"


def test_all_30_pages_seo_hreflang_csp_and_links() -> None:
    titles: set[str] = set()
    descriptions: set[str] = set()

    entries = [
        (loc, slug, rel_file_for(route_for(loc, slug)), f"{DOMAIN}{route_for(loc, slug)}")
        for loc in LOCALES
        for slug in SLUGS
    ]

    for loc, slug, rel, expected_canonical in entries + [("en", "", "404.html", f"{DOMAIN}/")]:
        html_text = (DIST / rel).read_text(encoding="utf-8")
        assert "{{" not in html_text and "}}" not in html_text, f"Unreplaced template token in {rel}"

        parser = PageInspector()
        parser.feed(html_text)
        assert parser.html_lang == loc, f"Wrong html lang in {rel}: {parser.html_lang}"

        # CSP & Security hygiene
        csp_values = [m.get("content") for m in parser.meta if m.get("http-equiv", "").lower() == "content-security-policy"]
        assert csp_values == [EXPECTED_CSP], f"Unexpected CSP in {rel}: {csp_values}"
        assert not parser.inline_style_attrs, f"Disallowed inline style attrs in {rel}: {parser.inline_style_attrs}"
        assert not parser.event_handler_attrs, f"Disallowed inline on* attrs in {rel}: {parser.event_handler_attrs}"

        for attrs, body in parser.scripts:
            stype = attrs.get("type", "")
            if "src" in attrs:
                src = attrs["src"]
                assert not src.startswith(("http://", "https://")), f"External script banned in {rel}: {src}"
                target = resolve_dist_target(src)
                assert target is not None and target.is_file(), f"Broken script src in {rel}: {src}"
            else:
                assert stype in {"application/ld+json", "application/json"}, f"Inline JS script banned in {rel}"
                parsed_json = json.loads(body)
                if stype == "application/ld+json":
                    assert parsed_json.get("@context") == "https://schema.org"
                    assert parsed_json.get("@type")
                    if parsed_json.get("@type") in {"WebApplication", "HowTo", "FAQPage"}:
                        assert parsed_json.get("inLanguage") == loc

        for link in parser.links:
            href = link.get("href", "")
            if link.get("rel") == "stylesheet":
                assert not href.startswith(("http://", "https://")), f"External CSS banned in {rel}: {href}"
            if href.startswith("/"):
                target = resolve_dist_target(href)
                assert target is not None and target.is_file(), f"Broken <link> in {rel}: {href}"

        for href in parser.anchors:
            if href.startswith("/"):
                target = resolve_dist_target(href)
                assert target is not None and target.is_file(), f"Broken <a href> in {rel}: {href}"

        for src in parser.imgs:
            assert not src.startswith(("http://", "https://")), f"External <img> banned in {rel}: {src}"
            if src.startswith("/"):
                target = resolve_dist_target(src)
                assert target is not None and target.is_file(), f"Broken <img src> in {rel}: {src}"

        if rel != "404.html":
            title = parser.title.strip()
            assert 15 <= len(title) <= 65, f"Title length out of range ({len(title)}) in {rel}: {title}"
            assert title not in titles, f"Duplicate title: {title}"
            titles.add(title)

            descs = [m["content"].strip() for m in parser.meta if m.get("name", "").lower() == "description"]
            assert len(descs) == 1
            desc = descs[0]
            assert 70 <= len(desc) <= 165, f"Description length out of range ({len(desc)}) in {rel}: {desc}"
            assert desc not in descriptions, f"Duplicate description: {desc}"
            descriptions.add(desc)

            assert len(parser.h1s) == 1 and parser.h1s[0], f"Must have exactly 1 non-empty <h1> in {rel}"

            canonicals = [l["href"] for l in parser.links if l.get("rel") == "canonical"]
            assert canonicals == [expected_canonical], f"Wrong canonical in {rel}: {canonicals}"

            # Bidirectional hreflang checks
            alt_map = {
                l["hreflang"]: l["href"]
                for l in parser.links
                if l.get("rel") == "alternate" and "hreflang" in l
            }
            expected_alts = {l: f"{DOMAIN}{route_for(l, slug)}" for l in LOCALES}
            expected_alts["x-default"] = f"{DOMAIN}{route_for('en', slug)}"
            assert alt_map == expected_alts, f"Hreflang mismatch in {rel}: {alt_map}"


def test_sitemap_30_urls_and_og_image() -> None:
    tree = ET.parse(DIST / "sitemap.xml")
    root = tree.getroot()
    ns = {
        "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
        "xhtml": "http://www.w3.org/1999/xhtml",
    }
    url_nodes = root.findall("sm:url", ns)
    assert len(url_nodes) == len(LOCALES) * len(SLUGS)

    expected_locs = {f"{DOMAIN}{route_for(loc, slug)}" for loc in LOCALES for slug in SLUGS}
    found_locs = set()
    for node in url_nodes:
        loc_text = node.findtext("sm:loc", default="", namespaces=ns)
        found_locs.add(loc_text)
        links = node.findall("xhtml:link", ns)
        assert len(links) == len(LOCALES) + 1
    assert found_locs == expected_locs

    robots = (DIST / "robots.txt").read_text(encoding="utf-8")
    assert f"Sitemap: {DOMAIN}/sitemap.xml" in robots

    with Image.open(DIST / "assets/og-image.png") as im:
        assert im.size == (1200, 630)
        stat = ImageStat.Stat(im.convert("RGB"))
        assert sum(stat.stddev) > 30, "og-image.png looks blank or uniform"
