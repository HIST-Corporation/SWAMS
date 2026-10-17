/**
 * One-shot PWA icon generator (PWA slice). Deterministic, dependency-free:
 * writes the manifest icons as real PNGs so every browser accepts them
 * (SVG manifest icons are Chromium-only). Run: `pnpm --filter @swams/web gen:icons`.
 *
 * The glyphs are PLACEHOLDERS built from the prototype's brand chip
 * (indigo #3F5BE0 + accent #F2A93B, matching packages/design-tokens): a
 * bitmap "S" and an accent dot. Open Decision 11 (illustration style) will
 * replace them — regenerate with the same command, no code changes.
 */
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/** Brand colours (light theme tokens). */
const PRIMARY = [0x3f, 0x5b, 0xe0, 255];
const ACCENT = [0xf2, 0xa9, 0x3b, 255];
const CLEAR = [0, 0, 0, 0];

/** 5×7 bitmap "S" — the placeholder mark. */
const S_GLYPH = ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'];

/** One PNG chunk: length + type + data + CRC32. */
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

/** Encode RGBA pixels (filter: none per scanline) as a PNG buffer. */
function encodePng(width, height, pixelAt) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelAt(x, y);
      const offset = y * stride + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** True when (x, y) sits inside a rounded square of radius r. */
function inRoundedSquare(x, y, size, radius) {
  const minX = radius;
  const maxX = size - radius;
  const minY = radius;
  const maxY = size - radius;
  if (x >= minX && x <= maxX) return true;
  if (y >= minY && y <= maxY) return true;
  const cx = x < minX ? minX : maxX;
  const cy = y < minY ? minY : maxY;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

/**
 * Render the icon. `rounded` draws a rounded square (any-purpose icon);
 * otherwise the background is full-bleed (maskable / apple-touch).
 */
function renderIcon(size, { rounded, glyphScale }) {
  const radius = rounded ? Math.round(size * 0.1875) : 0;
  // Glyph box: 5×7 cells scaled to glyphScale of the canvas, centred.
  const cell = Math.floor((size * glyphScale) / 7);
  const glyphW = cell * 5;
  const glyphH = cell * 7;
  const originX = Math.floor((size - glyphW) / 2);
  const originY = Math.floor((size - glyphH) / 2);
  // Accent dot: bottom-right of the glyph box.
  const dotR = Math.max(2, Math.round(cell * 0.6));
  const dotX = originX + glyphW + Math.round(cell * 0.9);
  const dotY = originY + glyphH - Math.round(cell * 0.4);

  return encodePng(size, size, (x, y) => {
    if (rounded && !inRoundedSquare(x, y, size, radius)) return CLEAR;

    // Accent dot wins over the glyph where they overlap.
    if ((x - dotX) ** 2 + (y - dotY) ** 2 <= dotR ** 2) return ACCENT;

    const gx = Math.floor((x - originX) / cell);
    const gy = Math.floor((y - originY) / cell);
    if (x >= originX && y >= originX * 0 && gx >= 0 && gx < 5 && gy >= 0 && gy < 7) {
      if (S_GLYPH[gy][gx] === '#') return [255, 255, 255, 255];
    }
    return PRIMARY;
  });
}

mkdirSync(OUT_DIR, { recursive: true });
const files = [
  ['icon-192.png', renderIcon(192, { rounded: true, glyphScale: 0.44 })],
  ['icon-512.png', renderIcon(512, { rounded: true, glyphScale: 0.44 })],
  // Maskable: full bleed, glyph inside the ~60% safe zone the OS mask allows.
  ['icon-maskable-512.png', renderIcon(512, { rounded: false, glyphScale: 0.36 })],
  // iOS masks this itself; it wants a real PNG, not an SVG.
  ['apple-touch-icon.png', renderIcon(180, { rounded: false, glyphScale: 0.4 })],
];
for (const [name, bytes] of files) {
  writeFileSync(join(OUT_DIR, name), bytes);
  console.log(`wrote public/icons/${name} (${bytes.length} bytes)`);
}
