# Vendored Third-Party Libraries

All browser dependencies are self-hosted inside the repository with no runtime CDN requests.
Re-generate and verify tarball + extracted checksums with `python scripts/fetch_vendor.py`.

| Package | Version | License | File | Size (bytes) | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| `pdf-lib` | `1.17.1` | MIT | `src/vendor/pdf-lib/pdf-lib.esm.min.js` | 523,373 | `a4eb247afbb2d445e4b0e2ed1e4bee9dd8c7f3a26f5965b9e11afb615d4c53f5` |
| `pdf-lib` | `1.17.1` | MIT | `src/vendor/pdf-lib/LICENSE.md` | 1,070 | `f2c9fc00fdb66eb99ac156ba52d734af66d8d309f65753ae809ad34ee2883bcb` |
| `pdfjs-dist` | `6.5.438` | Apache-2.0 | `src/vendor/pdfjs/pdf.min.mjs` | 537,769 | `522ad2c83bc8a0010e7f0cc60d0892b77c8d2bf2c9702dc12288311d94270f42` |
| `pdfjs-dist` | `6.5.438` | Apache-2.0 | `src/vendor/pdfjs/pdf.worker.min.mjs` | 1,327,591 | `b4c8353ded0d88d2e2009574a29eb4e0c3ff7e942ecdf51ef5f71566a9667f31` |
| `pdfjs-dist` | `6.5.438` | Apache-2.0 | `src/vendor/pdfjs/LICENSE` | 10,174 | `0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594` |

## Source Tarballs

- `pdf-lib@1.17.1`: https://registry.npmjs.org/pdf-lib/-/pdf-lib-1.17.1.tgz (`sha256:a7cc1eaf12e41e612a7be581162a63b18118aefc01e90f6a1f35347b1f324a1c`)
- `pdfjs-dist@6.5.438`: https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.5.438.tgz (`sha256:7461aefcd27c4ef0dd76f9ca5760f09466eb6b3f934432670c12132e7b3d6faa`)
