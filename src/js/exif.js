/**
 * Bounds-checked JPEG EXIF orientation reader (returns 1..8, defaults to 1).
 */

export function readJpegExifOrientation(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 12) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // JPEG SOI marker: 0xFFD8
  if (view.getUint16(0, false) !== 0xffd8) return 1;

  let offset = 2;
  const len = view.byteLength;

  while (offset + 4 <= len) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    if (marker === 0xffd9 || marker === 0xffda) break; // EOI or SOS
    if ((marker & 0xff00) !== 0xff00) break;

    // Standalone markers without length
    if (marker === 0xff01 || (marker >= 0xffd0 && marker <= 0xffd7)) continue;

    if (offset + 2 > len) break;
    const segSize = view.getUint16(offset, false);
    if (segSize < 2 || offset + segSize > len) break;

    if (marker === 0xffe1 && segSize >= 16) {
      // Check 'Exif\0\0'
      const h0 = view.getUint32(offset + 2, false);
      const h1 = view.getUint16(offset + 6, false);
      if (h0 === 0x45786966 && h1 === 0x0000) {
        const tiffStart = offset + 8;
        const segEnd = offset + segSize;
        if (tiffStart + 8 > segEnd) return 1;

        const endianTag = view.getUint16(tiffStart, false);
        const little = endianTag === 0x4949; // 'II'
        if (!little && endianTag !== 0x4d4d) return 1; // 'MM'
        if (view.getUint16(tiffStart + 2, little) !== 0x002a) return 1;

        const ifdOffset = view.getUint32(tiffStart + 4, little);
        const ifdStart = tiffStart + ifdOffset;
        if (ifdStart + 2 > segEnd) return 1;

        const entries = view.getUint16(ifdStart, little);
        for (let i = 0; i < entries; i++) {
          const entryPos = ifdStart + 2 + i * 12;
          if (entryPos + 12 > segEnd) break;
          const tag = view.getUint16(entryPos, little);
          if (tag === 0x0112) {
            const val = view.getUint16(entryPos + 8, little);
            return val >= 1 && val <= 8 ? val : 1;
          }
        }
        return 1;
      }
    }

    offset += segSize;
  }

  return 1;
}
