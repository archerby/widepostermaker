#!/usr/bin/env python3
"""Static site generator for WidePosterMaker (i18n-ready, Python stdlib only)."""

from __future__ import annotations

import datetime
import html
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
DIST = ROOT / "dist"


def esc(val: object) -> str:
    return html.escape(str(val), quote=True)


def safe_json_for_script(obj: object) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2).replace("</", "<\\/")


def render_sections(sections: list[dict]) -> str:
    blocks: list[str] = []
    for sec in sections:
        parts = ['<section class="content-section">', f"  <h2>{esc(sec['heading'])}</h2>"]
        for p in sec.get("paragraphs", []):
            parts.append(f"  <p>{esc(p)}</p>")

        if sec.get("list"):
            if sec.get("listHeading"):
                parts.append(f"  <h3>{esc(sec['listHeading'])}</h3>")
            tag = "ol" if sec.get("listType") == "ol" else "ul"
            parts.append(f"  <{tag}>")
            for item in sec["list"]:
                parts.append(f"    <li>{esc(item)}</li>")
            parts.append(f"  </{tag}>")

        table = sec.get("table")
        if table:
            parts.append('  <div class="table-wrap"><table>')
            parts.append("    <thead><tr>" + "".join(f"<th>{esc(h)}</th>" for h in table["headers"]) + "</tr></thead>")
            parts.append("    <tbody>")
            for row in table["rows"]:
                parts.append("      <tr>" + "".join(f"<td>{esc(cell)}</td>" for cell in row) + "</tr>")
            parts.append("    </tbody>")
            parts.append("  </table></div>")

        parts.append("</section>")
        blocks.append("\n".join(parts))
    return "\n\n".join(blocks)


def render_faqs(faqs: list[dict]) -> str:
    items: list[str] = []
    for faq in faqs:
        items.append(
            "\n".join(
                [
                    '    <details class="faq-item">',
                    f"      <summary>{esc(faq['q'])}</summary>",
                    f"      <p>{esc(faq['a'])}</p>",
                    "    </details>",
                ]
            )
        )
    return "\n".join(items)


def render_trust_cards(trust: list[dict]) -> str:
    cards: list[str] = []
    for item in trust:
        cards.append(
            "\n".join(
                [
                    '  <div class="trust-item">',
                    f"    <h2>{esc(item['title'])}</h2>",
                    f"    <p>{esc(item['body'])}</p>",
                    "  </div>",
                ]
            )
        )
    return "\n".join(cards)


def build_json_ld(page: dict, i18n: dict) -> str:
    domain = i18n["domain"].rstrip("/")
    canonical = f"{domain}{page['route']}"
    schemas: list[dict] = []

    if page["template"] == "tool":
        schemas.append(
            {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": page["h1"],
                "url": canonical,
                "description": page["description"],
                "applicationCategory": "UtilitiesApplication",
                "operatingSystem": "Any (Web Browser)",
                "browserRequirements": "Requires JavaScript",
                "isAccessibleForFree": True,
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD",
                },
            }
        )
    else:
        schemas.append(
            {
                "@context": "https://schema.org",
                "@type": "HowTo",
                "name": page["h1"],
                "description": page["description"],
                "step": [
                    {
                        "@type": "HowToStep",
                        "name": sec["heading"],
                        "text": " ".join(sec.get("paragraphs", [])),
                    }
                    for sec in page.get("sections", [])
                ],
            }
        )

    if page.get("faqs"):
        schemas.append(
            {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": f["q"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": f["a"],
                        },
                    }
                    for f in page["faqs"]
                ],
            }
        )

    if page["route"] != "/":
        schemas.append(
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": i18n["siteName"],
                        "item": f"{domain}/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": page["breadcrumbTitle"],
                        "item": canonical,
                    },
                ],
            }
        )

    return "\n".join(
        f'  <script type="application/ld+json">\n{safe_json_for_script(schema)}\n  </script>'
        for schema in schemas
    )


def apply_tokens(template: str, mapping: dict[str, str]) -> str:
    out = template
    for key, val in mapping.items():
        out = out.replace(f"{{{{{key}}}}}", val)
    return out


def render_nav(nav_items: list[dict], active_route: str) -> str:
    links: list[str] = []
    for item in nav_items:
        current = ' aria-current="page"' if item["href"] == active_route else ""
        links.append(f'        <a href="{esc(item["href"])}"{current}>{esc(item["label"])}</a>')
    return "\n".join(links)


def render_footer_links(items: list[dict]) -> str:
    rows: list[str] = []
    for item in items:
        href = item["href"]
        attrs = ' target="_blank" rel="noopener noreferrer"' if href.startswith("https://") else ""
        rows.append(f'            <li><a href="{esc(href)}"{attrs}>{esc(item["label"])}</a></li>')
    return "\n".join(rows)


def build_404_page(base_tpl: str, i18n: dict) -> str:
    domain = i18n["domain"].rstrip("/")
    main_html = (
        '<section class="hero">\n'
        '  <div class="eyebrow">404</div>\n'
        "  <h1>Page Not Found</h1>\n"
        '  <p class="hero-lead">The page you requested does not exist on WidePosterMaker.</p>\n'
        "</section>\n"
        '<section class="content-section">\n'
        "  <p>Jump back to the interactive poster tiler or pick one of the preset tools below.</p>\n"
        '  <p><a class="btn btn-primary" href="/">Open WidePosterMaker</a></p>\n'
        "</section>\n"
    )
    tool_links = [n for n in i18n["nav"] if n["href"] != "/how-to-glue-a-tiled-poster/"]
    return apply_tokens(
        base_tpl,
        {
            "LANG": esc(i18n["lang"]),
            "TITLE": "Page Not Found — WidePosterMaker",
            "DESCRIPTION": "Return to WidePosterMaker to split images and PDFs into printable A4 and US Letter posters.",
            "CANONICAL": f"{domain}/",
            "SITE_NAME": esc(i18n["siteName"]),
            "DOMAIN": esc(domain),
            "JSON_LD_BLOCKS": "",
            "PRESET_PAPER": "auto",
            "PRESET_UNITS": "auto",
            "PRESET_MODE": "sheets-width",
            "PRESET_VALUE": "3",
            "PRESET_MAP": "true",
            "NAV_LINKS": render_nav(i18n["nav"], ""),
            "MAIN_CONTENT": main_html,
            "FOOTER_ABOUT_TITLE": esc(i18n["footer"]["aboutTitle"]),
            "FOOTER_ABOUT_TEXT": esc(i18n["footer"]["aboutText"]),
            "FOOTER_TOOLS_TITLE": esc(i18n["footer"]["toolsTitle"]),
            "FOOTER_TOOL_LINKS": render_footer_links(tool_links),
            "FOOTER_RESOURCES_TITLE": esc(i18n["footer"]["resourcesTitle"]),
            "FOOTER_RESOURCE_LINKS": render_footer_links(i18n["footer"]["resourcesLinks"]),
            "FOOTER_COPYRIGHT": esc(i18n["footer"]["copyright"]),
            "EXTRA_SCRIPTS": "",
        },
    )


def main() -> None:
    i18n = json.loads((CONTENT / "i18n/en.json").read_text(encoding="utf-8"))
    base_tpl = (TEMPLATES / "base.html").read_text(encoding="utf-8")
    tool_tpl = (TEMPLATES / "tool.html").read_text(encoding="utf-8")
    guide_tpl = (TEMPLATES / "guide.html").read_text(encoding="utf-8")

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    # Copy runtime static directories
    for folder in ("css", "js", "assets", "vendor"):
        shutil.copytree(SRC / folder, DIST / folder)

    # Copy CNAME & create .nojekyll
    shutil.copyfile(ROOT / "CNAME", DIST / "CNAME")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")

    ui = i18n["ui"]
    domain = i18n["domain"].rstrip("/")
    tool_footer_links = [n for n in i18n["nav"] if n["href"] != "/how-to-glue-a-tiled-poster/"]

    pages: list[dict] = []
    for pfile in sorted((CONTENT / "pages").glob("*.json")):
        pages.append(json.loads(pfile.read_text(encoding="utf-8")))

    # Sort pages with homepage first for deterministic sitemap ordering
    pages.sort(key=lambda p: (0 if p["route"] == "/" else 1, p["route"]))

    for page in pages:
        tpl = tool_tpl if page["template"] == "tool" else guide_tpl
        presets = page["presets"]
        main_html = apply_tokens(
            tpl,
            {
                "EYEBROW": esc(ui["eyebrow"]),
                "BREADCRUMB_TITLE": esc(page["breadcrumbTitle"]),
                "H1": esc(page["h1"]),
                "LEAD": esc(page["lead"]),
                "UI_DROP_TITLE": esc(ui["dropTitle"]),
                "UI_DROP_SUB": esc(ui["dropSub"]),
                "UI_CHOOSE_FILE": esc(ui["chooseFile"]),
                "UI_TRY_SAMPLE": esc(ui["trySample"]),
                "UI_CHANGE_FILE": esc(ui["changeFile"]),
                "UI_PREV_PAGE": esc(ui["prevPage"]),
                "UI_NEXT_PAGE": esc(ui["nextPage"]),
                "UI_PAPER_LABEL": esc(ui["paperLabel"]),
                "UI_ORI_LABEL": esc(ui["oriLabel"]),
                "UI_ORI_AUTO": esc(ui["oriAuto"]),
                "UI_ORI_PORTRAIT": esc(ui["oriPortrait"]),
                "UI_ORI_LANDSCAPE": esc(ui["oriLandscape"]),
                "UI_MODE_LABEL": esc(ui["modeLabel"]),
                "UI_MODE_SHEETS_W": esc(ui["modeSheetsW"]),
                "UI_MODE_SHEETS_H": esc(ui["modeSheetsH"]),
                "UI_MODE_SIZE_W": esc(ui["modeSizeW"]),
                "UI_MODE_SIZE_H": esc(ui["modeSizeH"]),
                "UI_MODE_SCALE": esc(ui["modeScale"]),
                "UI_UNITS_LABEL": esc(ui["unitsLabel"]),
                "UI_VALUE_LABEL": esc(ui["valueLabel"]),
                "UI_MARGIN_LABEL": esc(ui["marginLabel"]),
                "UI_OVERLAP_LABEL": esc(ui["overlapLabel"]),
                "UI_OPT_CROP": esc(ui["optCropMarks"]),
                "UI_OPT_LABELS": esc(ui["optTileLabels"]),
                "UI_OPT_MAP": esc(ui["optAssemblyMap"]),
                "UI_SUMMARY_SHEETS": esc(ui["summarySheets"]),
                "UI_SUMMARY_SIZE": esc(ui["summarySize"]),
                "UI_SUMMARY_QUALITY": esc(ui["summaryQuality"]),
                "UI_DOWNLOAD_PDF": esc(ui["downloadPdf"]),
                "UI_PRINT_DIRECT": esc(ui["printDirect"]),
                "TRUST_CARDS": render_trust_cards(ui["trust"]),
                "BODY_SECTIONS": render_sections(page.get("sections", [])),
                "UI_FAQ_HEADING": esc(ui["faqHeading"]),
                "FAQ_ITEMS": render_faqs(page.get("faqs", [])),
            },
        )

        extra_scripts = ""
        if page["template"] == "tool":
            extra_scripts = (
                f'  <script id="i18n-data" type="application/json">\n{safe_json_for_script(i18n["js"])}\n  </script>\n'
                '  <script type="module" src="/js/app.js"></script>'
            )

        canonical = f"{domain}{page['route']}"
        full_html = apply_tokens(
            base_tpl,
            {
                "LANG": esc(i18n["lang"]),
                "TITLE": esc(page["title"]),
                "DESCRIPTION": esc(page["description"]),
                "CANONICAL": esc(canonical),
                "SITE_NAME": esc(i18n["siteName"]),
                "DOMAIN": esc(domain),
                "JSON_LD_BLOCKS": build_json_ld(page, i18n),
                "PRESET_PAPER": esc(presets["paper"]),
                "PRESET_UNITS": esc(presets["units"]),
                "PRESET_MODE": esc(presets["mode"]),
                "PRESET_VALUE": esc(presets["value"]),
                "PRESET_MAP": "true" if presets["map"] else "false",
                "NAV_LINKS": render_nav(i18n["nav"], page["route"]),
                "MAIN_CONTENT": main_html,
                "FOOTER_ABOUT_TITLE": esc(i18n["footer"]["aboutTitle"]),
                "FOOTER_ABOUT_TEXT": esc(i18n["footer"]["aboutText"]),
                "FOOTER_TOOLS_TITLE": esc(i18n["footer"]["toolsTitle"]),
                "FOOTER_TOOL_LINKS": render_footer_links(tool_footer_links),
                "FOOTER_RESOURCES_TITLE": esc(i18n["footer"]["resourcesTitle"]),
                "FOOTER_RESOURCE_LINKS": render_footer_links(i18n["footer"]["resourcesLinks"]),
                "FOOTER_COPYRIGHT": esc(i18n["footer"]["copyright"]),
                "EXTRA_SCRIPTS": extra_scripts,
            },
        )

        out_path = DIST / "index.html" if page["route"] == "/" else DIST / page["slug"] / "index.html"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(full_html, encoding="utf-8")
        print(f"Built {out_path.relative_to(ROOT)}")

    # 404.html
    (DIST / "404.html").write_text(build_404_page(base_tpl, i18n), encoding="utf-8")

    # sitemap.xml
    today = datetime.date.today().isoformat()
    sitemap_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for page in pages:
        loc = f"{domain}{page['route']}"
        priority = "1.0" if page["route"] == "/" else "0.8"
        sitemap_lines.extend(
            [
                "  <url>",
                f"    <loc>{esc(loc)}</loc>",
                f"    <lastmod>{today}</lastmod>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )
    sitemap_lines.append("</urlset>")
    (DIST / "sitemap.xml").write_text("\n".join(sitemap_lines) + "\n", encoding="utf-8")

    # robots.txt
    (DIST / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {domain}/sitemap.xml\n",
        encoding="utf-8",
    )

    # llms.txt
    llms_lines = [
        "# WidePosterMaker",
        "",
        "> Free, open-source, 100% client-side web utility to split images (PNG, JPEG, WebP, SVG, GIF) and vector PDFs into printable multi-page A4, US Letter, A3, and Legal PDFs with crop marks, alignment crosshairs, glue overlap tabs, and a calibration assembly map.",
        "",
        "## Key Pages",
    ]
    for page in pages:
        llms_lines.append(f"- [{page['h1']}]({domain}{page['route']}): {page['description']}")
    llms_lines.extend(["", f"Source code: {i18n['repoUrl']}"])
    (DIST / "llms.txt").write_text("\n".join(llms_lines) + "\n", encoding="utf-8")

    # manifest.webmanifest
    manifest = {
        "name": "WidePosterMaker",
        "short_name": "PosterMaker",
        "description": "Split large images and PDFs into multi-page A4 or US Letter PDFs locally in your browser.",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#f6f5f0",
        "theme_color": "#1d4ed8",
        "icons": [
            {"src": "/assets/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png"},
        ],
    }
    (DIST / "manifest.webmanifest").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Build complete -> {DIST.relative_to(ROOT)} ({len(pages)} pages + SEO metadata)")


if __name__ == "__main__":
    main()
