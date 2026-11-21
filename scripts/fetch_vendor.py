#!/usr/bin/env python3
"""Fetch and pin self-hosted vendor libraries from npm tarballs with SHA-256 verification."""

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
        "tarball_sha256": "a7cc1eaf12e41e612a7be581162a63b18118aefc01e90f6a1f35347b1f324a1c",
        "files": {
            "package/dist/pdf-lib.esm.min.js": ROOT / "src/vendor/pdf-lib/pdf-lib.esm.min.js",
            "package/LICENSE.md": ROOT / "src/vendor/pdf-lib/LICENSE.md",
        },
    },
    {
        "name": "pdfjs-dist",
        "version": "6.5.438",
        "license": "Apache-2.0",
        "url": "https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.5.438.tgz",
        "tarball_sha256": "7461aefcd27c4ef0dd76f9ca5760f09466eb6b3f934432670c12132e7b3d6faa",
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

        actual_tgz_sha = sha256_bytes(tgz_bytes)
        if actual_tgz_sha != pkg["tarball_sha256"]:
            raise ValueError(
                f"Tarball SHA-256 mismatch for {pkg['name']}@{pkg['version']}: "
                f"expected {pkg['tarball_sha256']}, got {actual_tgz_sha}"
            )

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
        "Re-generate and verify tarball + extracted checksums with `python scripts/fetch_vendor.py`.",
        "",
        "| Package | Version | License | File | Size (bytes) | SHA-256 |",
        "| --- | --- | --- | --- | ---: | --- |",
    ]
    for name, version, lic, _url, rel, size, digest in manifest_rows:
        lines.append(f"| `{name}` | `{version}` | {lic} | `{rel}` | {size:,} | `{digest}` |")

    lines.extend(["", "## Source Tarballs", ""])
    for pkg in PACKAGES:
        lines.append(f"- `{pkg['name']}@{pkg['version']}`: {pkg['url']} (`sha256:{pkg['tarball_sha256']}`)")
    lines.append("")

    vendor_md = ROOT / "VENDOR.md"
    vendor_md.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {vendor_md.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
