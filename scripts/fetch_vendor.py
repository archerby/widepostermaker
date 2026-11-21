#!/usr/bin/env python3
"""Fetch and pin self-hosted vendor libraries from npm tarballs."""

from __future__ import annotations

import hashlib
import io
import pathlib
import re
import tarfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent

PACKAGES = [
    {
        "name": "pdf-lib",
        "version": "1.17.1",
        "license": "MIT",
        "url": "https://registry.npmjs.org/pdf-lib/-/pdf-lib-1.17.1.tgz",
        "files": {
            "package/dist/pdf-lib.esm.min.js": ROOT / "src/vendor/pdf-lib/pdf-lib.esm.min.js",
            "package/LICENSE.md": ROOT / "src/vendor/pdf-lib/LICENSE.md",
        },
    },
    {
        "name": "pdfjs-dist",
        "version": "4.10.38",
        "license": "Apache-2.0",
        "url": "https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-4.10.38.tgz",
        "files": {
            "package/legacy/build/pdf.min.mjs": ROOT / "src/vendor/pdfjs/pdf.min.mjs",
            "package/legacy/build/pdf.worker.min.mjs": ROOT / "src/vendor/pdfjs/pdf.worker.min.mjs",
            "package/LICENSE": ROOT / "src/vendor/pdfjs/LICENSE",
        },
    },
]

SOURCEMAP_RE = re.compile(r"\r?\n?//# sourceMappingURL=[^\r\n]+\s*$")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    manifest_rows: list[tuple[str, str, str, str, str, int, str]] = []

    for pkg in PACKAGES:
        print(f"Fetching {pkg['name']}@{pkg['version']} ...")
        with urllib.request.urlopen(pkg["url"], timeout=60) as resp:
            tgz_bytes = resp.read()

        with tarfile.open(fileobj=io.BytesIO(tgz_bytes), mode="r:gz") as tf:
            for member_name, out_path in pkg["files"].items():
                extracted = tf.extractfile(member_name)
                if extracted is None:
                    raise FileNotFoundError(f"Missing {member_name} in {pkg['url']}")
                raw = extracted.read()
                if out_path.suffix in {".js", ".mjs"}:
                    text = raw.decode("utf-8")
                    text = SOURCEMAP_RE.sub("\n", text)
                    raw = text.encode("utf-8")

                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(raw)
                rel = out_path.relative_to(ROOT).as_posix()
                digest = sha256_bytes(raw)
                manifest_rows.append(
                    (
                        pkg["name"],
                        pkg["version"],
                        pkg["license"],
                        pkg["url"],
                        rel,
                        len(raw),
                        digest,
                    )
                )
                print(f"  wrote {rel} ({len(raw):,} bytes)")

    lines = [
        "# Vendored Third-Party Libraries",
        "",
        "All browser dependencies are self-hosted inside the repository with no runtime CDN requests.",
        "Re-generate and verify checksums with `python scripts/fetch_vendor.py`.",
        "",
        "| Package | Version | License | File | Size (bytes) | SHA-256 |",
        "| --- | --- | --- | --- | ---: | --- |",
    ]
    for name, version, lic, _url, rel, size, digest in manifest_rows:
        lines.append(f"| `{name}` | `{version}` | {lic} | `{rel}` | {size:,} | `{digest}` |")

    lines.extend(["", "## Source Tarballs", ""])
    for pkg in PACKAGES:
        lines.append(f"- `{pkg['name']}@{pkg['version']}`: {pkg['url']}")
    lines.append("")

    vendor_md = ROOT / "VENDOR.md"
    vendor_md.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {vendor_md.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
