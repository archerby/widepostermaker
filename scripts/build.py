#!/usr/bin/env python3
"""Multilingual static site generator for WidePosterMaker (Python stdlib only)."""

from __future__ import annotations

import datetime
import html
import json
import os
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
DIST = ROOT / "dist"

LOCALES = ["en", "ru", "de", "es", "pl"]
SLUG_RE = re.compile(r"^[a-z0-9-]*$")
TOKEN_RE = re.compile(r"\{\{([A-Z0-9_]+)\}\}")
BEACON_TOKEN_RE = re.compile(r"^[0-9a-f]{32}$")
CF_SCRIPT_ORIGIN = "https://static.cloudflareinsights.com"
CF_CONNECT_ORIGIN = "https://cloudflareinsights.com"


def esc(val: object) -> str:
    return html.escape(str(val), quote=True)


def safe_json_for_script(obj: object) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2).replace("<", "\\u003c")


def validate_href(href: str) -> str:
    if not isinstance(href, str) or not (href.startswith("/") or href.startswith("https://")):
        raise ValueError(f"Disallowed href scheme or relative path: {href!r}")
    return href


def route_for(locale: str, slug: str) -> str:
    if not isinstance(slug, str) or not SLUG_RE.fullmatch(slug):
        raise ValueError(f"Invalid slug {slug!r}: must match {SLUG_RE.pattern}")
    if locale == "en":
        return "/" if not slug else f"/{slug}/"
    return f"/{locale}/" if not slug else f"/{locale}/{slug}/"


def out_path_for(route: str) -> pathlib.Path:
    rel = route.strip("/")
    target = DIST / "index.html" if not rel else DIST / rel / "index.html"
    dist_root = DIST.resolve()
    resolved = target.resolve()
    if not resolved.is_relative_to(dist_root):
        raise ValueError(f"Path traversal blocked for route {route!r}")
    return target


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
    lang = i18n["lang"]
    schemas: list[dict] = []

    if page["template"] == "tool":
        schemas.append(
            {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": page["h1"],
                "url": canonical,
                "inLanguage": lang,
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
                "inLanguage": lang,
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
                "inLanguage": lang,
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

    home_route = i18n["homeHref"]
    if page["route"] != home_route:
        schemas.append(
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": i18n["siteName"],
                        "item": f"{domain}{home_route}",
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
    return TOKEN_RE.sub(lambda m: mapping.get(m.group(1), m.group(0)), template)


def render_nav(nav_items: list[dict], active_route: str) -> str:
    links: list[str] = []
    for item in nav_items:
        href = validate_href(item["href"])
        current = ' aria-current="page"' if href == active_route else ""
        links.append(f'        <a href="{esc(href)}"{current}>{esc(item["label"])}</a>')
    return "\n".join(links)


def render_lang_links(i18n_map: dict[str, dict], current_locale: str, slug: str) -> str:
    links: list[str] = []
    for loc in LOCALES:
        href = route_for(loc, slug)
        label = i18n_map[loc]["codeLabel"]
        current = ' aria-current="page"' if loc == current_locale else ""
        links.append(f'        <a href="{esc(href)}" hreflang="{esc(loc)}" lang="{esc(loc)}"{current}>{esc(label)}</a>')
    return "\n".join(links)


def render_mobile_nav(nav_items: list[dict], active_route: str) -> str:
    links: list[str] = []
    for item in nav_items:
        href = validate_href(item["href"])
        current = ' aria-current="page"' if href == active_route else ""
        links.append(f'          <a href="{esc(href)}"{current}>{esc(item["label"])}</a>')
    return "\n".join(links)


def render_mobile_lang(i18n_map: dict[str, dict], current_locale: str, slug: str) -> str:
    links: list[str] = []
    for loc in LOCALES:
        href = route_for(loc, slug)
        current = ' aria-current="page"' if loc == current_locale else ""
        links.append(
            f'          <a href="{esc(href)}" hreflang="{esc(loc)}" lang="{esc(loc)}"{current}>'
            f'{esc(i18n_map[loc]["codeLabel"])}</a>'
        )
    return "\n".join(links)


def _check_beacon_token(token: str) -> str:
    if token and not BEACON_TOKEN_RE.match(token):
        raise ValueError("content/site.json: cfBeaconToken must be 32 lowercase hex characters")
    return token


def build_csp(token: str = "") -> str:
    """Strict CSP; a Cloudflare Web Analytics token adds exactly its two origins."""
    _check_beacon_token(token)
    script_src = "'self'" + (f" {CF_SCRIPT_ORIGIN}" if token else "")
    connect_src = "'self' blob:" + (f" {CF_CONNECT_ORIGIN}" if token else "")
    return (
        f"default-src 'self'; script-src {script_src}; style-src 'self'; "
        "img-src 'self' blob: data:; worker-src 'self' blob:; "
        f"connect-src {connect_src}; font-src 'self'; object-src 'none'; "
        "base-uri 'self'; form-action 'none'"
    )


def analytics_snippet(token: str = "") -> str:
    """Cookieless Cloudflare Web Analytics beacon, or nothing when no token is configured."""
    if not _check_beacon_token(token):
        return ""
    return (
        f'  <script defer src="{CF_SCRIPT_ORIGIN}/beacon.min.js" '
        f"data-cf-beacon='{{\"token\": \"{token}\"}}'></script>"
    )


def load_site_config() -> dict:
    path = CONTENT / "site.json"
    site = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    token = site.get("cfBeaconToken", "") or ""
    return {"csp": build_csp(token), "analytics": analytics_snippet(token)}


def common_header_tokens(i18n: dict, i18n_map: dict[str, dict], loc: str, slug: str, route: str, site: dict) -> dict[str, str]:
    return {
        "CSP": site["csp"],
        "ANALYTICS": site["analytics"],
        "MENU_LABEL": esc(i18n["menuLabel"]),
        "CURRENT_LANG_LABEL": esc(i18n["codeLabel"]),
        "MOBILE_NAV_LINKS": render_mobile_nav(i18n["nav"], route),
        "MOBILE_LANG_LINKS": render_mobile_lang(i18n_map, loc, slug),
    }


def render_hreflang_links(domain: str, slug: str) -> str:
    lines: list[str] = []
    for loc in LOCALES:
        href = f"{domain}{route_for(loc, slug)}"
        lines.append(f'  <link rel="alternate" hreflang="{esc(loc)}" href="{esc(href)}">')
    xdef = f"{domain}{route_for('en', slug)}"
    lines.append(f'  <link rel="alternate" hreflang="x-default" href="{esc(xdef)}">')
    return "\n".join(lines)


def render_og_alternates(i18n_map: dict[str, dict], current_locale: str) -> str:
    lines: list[str] = []
    for loc in LOCALES:
        if loc != current_locale:
            lines.append(f'  <meta property="og:locale:alternate" content="{esc(i18n_map[loc]["ogLocale"])}">')
    return "\n".join(lines)


def render_footer_links(items: list[dict]) -> str:
    rows: list[str] = []
    for item in items:
        href = validate_href(item["href"])
        attrs = ' target="_blank" rel="noopener noreferrer"' if href.startswith("https://") else ""
        rows.append(f'            <li><a href="{esc(href)}"{attrs}>{esc(item["label"])}</a></li>')
    return "\n".join(rows)


def build_404_page(base_tpl: str, i18n_map: dict[str, dict], site: dict) -> str:
    i18n = i18n_map["en"]
    domain = i18n["domain"].rstrip("/")
    main_html = (
        '<section class="hero">\n'
        '  <div class="eyebrow">404</div>\n'
        "  <h1>Page Not Found</h1>\n"
        '  <p class="hero-lead">The page you requested does not exist on WidePosterMaker.</p>\n'
        "</section>\n"
        '<section class="content-section">\n'
        "  <p>Jump back to the interactive poster tiler or switch language from the header.</p>\n"
        '  <p><a class="btn btn-primary" href="/">Open WidePosterMaker</a></p>\n'
        "</section>\n"
    )
    tool_links = [n for n in i18n["nav"] if n.get("slug") != "how-to-glue-a-tiled-poster"]
    return apply_tokens(
        base_tpl,
        {
            "LANG": "en",
            "OG_LOCALE": esc(i18n["ogLocale"]),
            "OG_LOCALE_ALTERNATES": render_og_alternates(i18n_map, "en"),
            "TITLE": "Page Not Found — WidePosterMaker",
            "DESCRIPTION": "Return to WidePosterMaker to split images and PDFs into printable A4 and US Letter posters.",
            "CANONICAL": f"{domain}/",
            "HREFLANG_LINKS": "",
            "SITE_NAME": esc(i18n["siteName"]),
            "DOMAIN": esc(domain),
            "JSON_LD_BLOCKS": "",
            "PRESET_PAPER": "auto",
            "PRESET_UNITS": "auto",
            "PRESET_MODE": "sheets-width",
            "PRESET_VALUE": "3",
            "PRESET_MAP": "true",
            "HOME_HREF": "/",
            "NAV_LABEL": esc(i18n["navLabel"]),
            "LANG_SWITCH_LABEL": esc(i18n["langSwitchLabel"]),
            "NAV_LINKS": render_nav(i18n["nav"], ""),
            "LANG_LINKS": render_lang_links(i18n_map, "en", ""),
            "MAIN_CONTENT": main_html,
            "FOOTER_ABOUT_TITLE": esc(i18n["footer"]["aboutTitle"]),
            "FOOTER_ABOUT_TEXT": esc(i18n["footer"]["aboutText"]),
            "FOOTER_TOOLS_TITLE": esc(i18n["footer"]["toolsTitle"]),
            "FOOTER_TOOL_LINKS": render_footer_links(tool_links),
            "FOOTER_RESOURCES_TITLE": esc(i18n["footer"]["resourcesTitle"]),
            "FOOTER_RESOURCE_LINKS": render_footer_links(i18n["footer"]["resourcesLinks"]),
            "FOOTER_COPYRIGHT": esc(i18n["footer"]["copyright"]),
            "FOOTER_TAGLINE": esc(i18n["footer"]["tagline"]),
            "EXTRA_SCRIPTS": "",
            **common_header_tokens(i18n, i18n_map, "en", "", "", site),
        },
    )


def main() -> None:
    i18n_map = {
        loc: json.loads((CONTENT / "i18n" / f"{loc}.json").read_text(encoding="utf-8"))
        for loc in LOCALES
    }
    site = load_site_config()
    base_tpl = (TEMPLATES / "base.html").read_text(encoding="utf-8")
    tool_tpl = (TEMPLATES / "tool.html").read_text(encoding="utf-8")
    guide_tpl = (TEMPLATES / "guide.html").read_text(encoding="utf-8")

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    for folder in ("css", "js", "assets", "vendor"):
        shutil.copytree(SRC / folder, DIST / folder)

    shutil.copyfile(ROOT / "CNAME", DIST / "CNAME")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")

    all_pages: list[tuple[str, dict]] = []
    for loc in LOCALES:
        for pfile in sorted((CONTENT / "pages" / loc).glob("*.json")):
            page = json.loads(pfile.read_text(encoding="utf-8"))
            expected_route = route_for(loc, page["slug"])
            if page["route"] != expected_route:
                raise ValueError(f"Route mismatch in {pfile}: {page['route']} != {expected_route}")
            all_pages.append((loc, page))

    all_pages.sort(key=lambda item: (LOCALES.index(item[0]), 0 if item[1]["slug"] == "" else 1, item[1]["slug"]))

    for loc, page in all_pages:
        i18n = i18n_map[loc]
        ui = i18n["ui"]
        guide = i18n["guide"]
        domain = i18n["domain"].rstrip("/")
        tpl = tool_tpl if page["template"] == "tool" else guide_tpl
        presets = page["presets"]
        tool_footer_links = [n for n in i18n["nav"] if n.get("slug") != "how-to-glue-a-tiled-poster"]

        main_html = apply_tokens(
            tpl,
            {
                "HOME_HREF": esc(i18n["homeHref"]),
                "EYEBROW": esc(ui["eyebrow"]),
                "BREADCRUMB_TITLE": esc(page["breadcrumbTitle"]),
                "H1": esc(page["h1"]),
                "LEAD": esc(page["lead"]),
                "UI_WORKSPACE_ARIA": esc(ui["workspaceAria"]),
                "UI_TRUST_ARIA": esc(ui["trustAria"]),
                "UI_DROP_TITLE": esc(ui["dropTitle"]),
                "UI_DROP_SUB": esc(ui["dropSub"]),
                "UI_DROP_TITLE_TOUCH": esc(ui["dropTitleTouch"]),
                "UI_ADVANCED_LABEL": esc(ui["advancedLabel"]),
                "UI_STEP_DEC": esc(ui["stepDec"]),
                "UI_STEP_INC": esc(ui["stepInc"]),
                "UI_CHOOSE_FILE": esc(ui["chooseFile"]),
                "UI_TRY_SAMPLE": esc(ui["trySample"]),
                "UI_CHANGE_FILE": esc(ui["changeFile"]),
                "UI_PREV_PAGE": esc(ui["prevPage"]),
                "UI_NEXT_PAGE": esc(ui["nextPage"]),
                "UI_PAGE_INIT": esc(ui["pageInit"]),
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
                "UI_UNIT_CM": esc(ui["unitCm"]),
                "UI_UNIT_MM": esc(ui["unitMm"]),
                "UI_UNIT_IN": esc(ui["unitIn"]),
                "UI_DEFAULT_UNIT_TAG": esc(ui["defaultUnitTag"]),
                "UI_VALUE_LABEL": esc(ui["valueLabel"]),
                "UI_MARGIN_LABEL": esc(ui["marginLabel"]),
                "UI_OVERLAP_LABEL": esc(ui["overlapLabel"]),
                "UI_OPT_CROP": esc(ui["optCropMarks"]),
                "UI_OPT_LABELS": esc(ui["optTileLabels"]),
                "UI_OPT_MAP": esc(ui["optAssemblyMap"]),
                "UI_SUMMARY_SHEETS": esc(ui["summarySheets"]),
                "UI_SUMMARY_SIZE": esc(ui["summarySize"]),
                "UI_SUMMARY_QUALITY": esc(ui["summaryQuality"]),
                "UI_EXCLUDED_NOTICE": esc(ui["excludedNotice"]),
                "UI_RESTORE_BTN": esc(ui["restoreBtn"]),
                "UI_DOWNLOAD_PDF": esc(ui["downloadPdf"]),
                "UI_PRINT_DIRECT": esc(ui["printDirect"]),
                "TRUST_CARDS": render_trust_cards(ui["trust"]),
                "BODY_SECTIONS": render_sections(page.get("sections", [])),
                "UI_FAQ_HEADING": esc(ui["faqHeading"]),
                "FAQ_ITEMS": render_faqs(page.get("faqs", [])),
                "GUIDE_VISUAL_HEADING": esc(guide["visualHeading"]),
                "GUIDE_SVG1_ARIA": esc(guide["svg1Aria"]),
                "GUIDE_SVG2_ARIA": esc(guide["svg2Aria"]),
                "GUIDE_SVG3_ARIA": esc(guide["svg3Aria"]),
                "GUIDE_CAP_1": esc(guide["cap1"]),
                "GUIDE_CAP_2": esc(guide["cap2"]),
                "GUIDE_CAP_3": esc(guide["cap3"]),
                "GUIDE_OPEN_TOOL": esc(guide["openTool"]),
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
                "OG_LOCALE": esc(i18n["ogLocale"]),
                "OG_LOCALE_ALTERNATES": render_og_alternates(i18n_map, loc),
                "TITLE": esc(page["title"]),
                "DESCRIPTION": esc(page["description"]),
                "CANONICAL": esc(canonical),
                "HREFLANG_LINKS": render_hreflang_links(domain, page["slug"]),
                "SITE_NAME": esc(i18n["siteName"]),
                "DOMAIN": esc(domain),
                "JSON_LD_BLOCKS": build_json_ld(page, i18n),
                "PRESET_PAPER": esc(presets["paper"]),
                "PRESET_UNITS": esc(presets["units"]),
                "PRESET_MODE": esc(presets["mode"]),
                "PRESET_VALUE": esc(presets["value"]),
                "PRESET_MAP": "true" if presets["map"] else "false",
                "HOME_HREF": esc(i18n["homeHref"]),
                "NAV_LABEL": esc(i18n["navLabel"]),
                "LANG_SWITCH_LABEL": esc(i18n["langSwitchLabel"]),
                "NAV_LINKS": render_nav(i18n["nav"], page["route"]),
                "LANG_LINKS": render_lang_links(i18n_map, loc, page["slug"]),
                "MAIN_CONTENT": main_html,
                "FOOTER_ABOUT_TITLE": esc(i18n["footer"]["aboutTitle"]),
                "FOOTER_ABOUT_TEXT": esc(i18n["footer"]["aboutText"]),
                "FOOTER_TOOLS_TITLE": esc(i18n["footer"]["toolsTitle"]),
                "FOOTER_TOOL_LINKS": render_footer_links(tool_footer_links),
                "FOOTER_RESOURCES_TITLE": esc(i18n["footer"]["resourcesTitle"]),
                "FOOTER_RESOURCE_LINKS": render_footer_links(i18n["footer"]["resourcesLinks"]),
                "FOOTER_COPYRIGHT": esc(i18n["footer"]["copyright"]),
                "FOOTER_TAGLINE": esc(i18n["footer"]["tagline"]),
                "EXTRA_SCRIPTS": extra_scripts,
                **common_header_tokens(i18n, i18n_map, loc, page["slug"], page["route"], site),
            },
        )

        out_path = out_path_for(page["route"])
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(full_html, encoding="utf-8")

    # 404.html
    (DIST / "404.html").write_text(build_404_page(base_tpl, i18n_map, site), encoding="utf-8")

    # Multilingual sitemap.xml with xhtml:link hreflang alternates
    domain = i18n_map["en"]["domain"].rstrip("/")
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if epoch and epoch.isdigit():
        today = datetime.datetime.fromtimestamp(int(epoch), tz=datetime.timezone.utc).date().isoformat()
    else:
        today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    sitemap_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for _loc, page in all_pages:
        loc_url = f"{domain}{page['route']}"
        priority = "1.0" if page["slug"] == "" and page["route"] == "/" else ("0.9" if page["slug"] == "" else "0.8")
        sitemap_lines.extend(
            [
                "  <url>",
                f"    <loc>{esc(loc_url)}</loc>",
                f"    <lastmod>{today}</lastmod>",
                f"    <priority>{priority}</priority>",
            ]
        )
        for alt_loc in LOCALES:
            alt_url = f"{domain}{route_for(alt_loc, page['slug'])}"
            sitemap_lines.append(f'    <xhtml:link rel="alternate" hreflang="{esc(alt_loc)}" href="{esc(alt_url)}"/>')
        xdef_url = f"{domain}{route_for('en', page['slug'])}"
        sitemap_lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{esc(xdef_url)}"/>')
        sitemap_lines.append("  </url>")
    sitemap_lines.append("</urlset>")
    (DIST / "sitemap.xml").write_text("\n".join(sitemap_lines) + "\n", encoding="utf-8")

    # robots.txt
    (DIST / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {domain}/sitemap.xml\n",
        encoding="utf-8",
    )

    # .well-known/security.txt (RFC 9116)
    well_known = DIST / ".well-known"
    well_known.mkdir(parents=True, exist_ok=True)
    (well_known / "security.txt").write_text(
        "\n".join(
            [
                "Contact: mailto:security@novikau.me",
                f"Canonical: {domain}/.well-known/security.txt",
                "Preferred-Languages: en, ru, de, es, pl",
                "Expires: 2027-11-21T00:00:00.000Z",
                "",
            ]
        ),
        encoding="utf-8",
    )

    # llms.txt
    llms_lines = [
        "# WidePosterMaker",
        "",
        "> Free, open-source, 100% client-side web utility to split images (PNG, JPEG, WebP, SVG, GIF) and vector PDFs into printable multi-page A4, US Letter, A3, and Legal PDFs with crop marks, alignment crosshairs, glue overlap tabs, and a calibration assembly map.",
        "",
        "## Languages",
    ]
    for loc in LOCALES:
        home_page = next(p for l, p in all_pages if l == loc and p["slug"] == "")
        llms_lines.append(f"- {loc.upper()}: [{home_page['h1']}]({domain}{home_page['route']}) — {home_page['description']}")
    llms_lines.extend(["", "## English Tools & Guides"])
    for loc, page in all_pages:
        if loc == "en":
            llms_lines.append(f"- [{page['h1']}]({domain}{page['route']}): {page['description']}")
    llms_lines.extend(["", f"Source code: {i18n_map['en']['repoUrl']}"])
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
    print(f"Build complete -> {DIST.relative_to(ROOT)} ({len(all_pages)} pages across {len(LOCALES)} locales)")


if __name__ == "__main__":
    main()
