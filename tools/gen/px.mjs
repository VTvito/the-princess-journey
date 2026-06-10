// px.mjs — low-res raster toolkit for the pixel-art asset generator.
//
// All art is authored on small RGBA buffers ("native" resolution: 1 art pixel = 1 buffer
// pixel) and integer-upscaled (×SCALE, nearest-neighbour) before encoding, so every emitted
// PNG keeps the exact runtime dimensions the game already uses (64px tiles, 64×96 heroines,
// 1280×720 skies, …) while the art itself is chunky 16-bit pixel work. Uses only Node
// built-ins — no npm dependencies.
//
// Conventions:
//   • an "img" is { w, h, buf } with buf = Uint8Array RGBA, plus an optional wrapX flag
//     (set on parallax layers so shapes drawn off one edge re-enter on the other and the
//     layer tiles seamlessly — game.js wraps mid/near layers horizontally).
//   • colors are [r, g, b] arrays; alpha is a separate 0-255 argument.
//   • rect/trap bounds are [start, end) like the old generator's helpers.

import { deflateSync } from "node:zlib";

export const SCALE = 4; // native art pixel → runtime canvas pixels

// --- images ----------------------------------------------------------------

export function newImg(w, h, wrapX = false) {
  return { w, h, buf: new Uint8Array(w * h * 4), wrapX };
}

export function pset(img, x, y, color, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (img.wrapX) x = ((x % img.w) + img.w) % img.w;
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const i = (y * img.w + x) * 4;
  img.buf[i] = color[0];
  img.buf[i + 1] = color[1];
  img.buf[i + 2] = color[2];
  img.buf[i + 3] = a;
}

export function alphaAt(img, x, y) {
  if (img.wrapX) x = ((x % img.w) + img.w) % img.w;
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return 0;
  return img.buf[(y * img.w + x) * 4 + 3];
}

export function fillRect(img, x0, y0, x1, y1, color, a = 255) {
  for (let y = Math.round(y0); y < Math.round(y1); y++)
    for (let x = Math.round(x0); x < Math.round(x1); x++) pset(img, x, y, color, a);
}

export function fillDisc(img, cx, cy, r, color, a = 255) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) pset(img, x, y, color, a);
    }
}

// Vertical trapezoid centred on cx: half-width eases halfTop→halfBot over yTop→yBot.
// halfTop 0.5 + halfBot N gives a clean upward triangle (and vice versa for icicles).
export function fillTrap(img, yTop, yBot, cx, halfTop, halfBot, color, a = 255) {
  for (let y = Math.round(yTop); y < Math.round(yBot); y++) {
    const f = (y - yTop) / Math.max(1, yBot - yTop);
    const half = halfTop + (halfBot - halfTop) * f;
    fillRect(img, cx - half, y, cx + half + 1, y + 1, color, a);
  }
}

// Copy src into dst at (dx,dy), skipping transparent pixels.
export function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const si = (y * src.w + x) * 4;
      const a = src.buf[si + 3];
      if (a === 0) continue;
      pset(dst, dx + x, dy + y, [src.buf[si], src.buf[si + 1], src.buf[si + 2]], a);
    }
}

// --- color helpers -----------------------------------------------------------

export const darken = (c, f = 0.82) => c.map((v) => Math.round(v * f));
export const lighten = (c, f = 1.15) => c.map((v) => Math.min(255, Math.round(v * f)));

// Classic 4-tone pixel-art ramp around a base color: lit edge / body / shade / outline-depth.
export const ramp = (base) => ({
  hi: lighten(base, 1.22),
  base,
  lo: darken(base, 0.76),
  lo2: darken(base, 0.55),
});

// --- texture helpers ----------------------------------------------------------

// Deterministic LCG so every run is pixel-identical.
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

export function speckle(img, x0, y0, x1, y1, color, density, seed) {
  const rnd = rng(seed);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) if (rnd() < density) pset(img, x, y, color);
}

// 2×2 Bayer threshold (0..3) — the classic 16-bit dither pattern.
export const bayer = (x, y) => [0, 2, 3, 1][(y % 2) * 2 + (x % 2)];

// 50% checkerboard fill — used for soft transitions between two flat tones.
export function ditherRect(img, x0, y0, x1, y1, color, a = 255, phase = 0) {
  for (let y = Math.round(y0); y < Math.round(y1); y++)
    for (let x = Math.round(x0); x < Math.round(x1); x++)
      if ((x + y + phase) % 2 === 0) pset(img, x, y, color, a);
}

// --- pixel-art finishing -------------------------------------------------------

// 1px dark contour around every opaque region (drawn on the transparent side). This is the
// single biggest "pixel art" tell — sprites pop from any background. Art must leave a 1px
// margin where the contour should appear; pixels outside the canvas are simply skipped.
export function outline(img, color = [38, 30, 42]) {
  const src = img.buf.slice(); // read from a copy so the contour doesn't self-propagate
  const at = (x, y) => {
    if (img.wrapX) x = ((x % img.w) + img.w) % img.w;
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) return 0;
    return src[(y * img.w + x) * 4 + 3];
  };
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (at(x, y) !== 0) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) pset(img, x, y, color);
    }
}

// Integer nearest-neighbour upscale — the step that turns native art into chunky pixels.
export function upscale(img, f = SCALE) {
  const out = newImg(img.w * f, img.h * f);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const si = (y * img.w + x) * 4;
      const px = [img.buf[si], img.buf[si + 1], img.buf[si + 2]];
      const a = img.buf[si + 3];
      if (a === 0) continue;
      fillRect(out, x * f, y * f, (x + 1) * f, (y + 1) * f, px, a);
    }
  return out;
}

// --- PNG encoding (RGBA, 8-bit) — minimal, spec-compliant encoder -----------------

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function encodePNG(img) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = img.w * 4;
  const raw = Buffer.alloc((stride + 1) * img.h);
  for (let y = 0; y < img.h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(img.buf.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// Convenience: author small → upscale → encode in one go.
export const encodeScaled = (img, f = SCALE) => encodePNG(upscale(img, f));
