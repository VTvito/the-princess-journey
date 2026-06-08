// gen-placeholders.mjs
// Generates swap-ready placeholder assets for "The Princess Journey" using only
// Node built-ins (no npm dependencies). Run once: `node tools/gen-placeholders.mjs`.
//
// Sprites: 64x64 RGBA PNGs (transparent background, solid color disc) — same size and
// transparency the future skin-layering system expects (see spec §3). Replace the files
// in assets/sprites with real art later; keep the same filenames (or update ASSETS in
// src/config.js).
//
// Audio: a short, gentle WAV tone for the menu music placeholder, plus tiny synthesized
// gameplay SFX (jump / collect / coin / oops / goal / win / select). Replace the files in
// assets/audio later with real sound, keeping the filenames (or update ASSETS.sounds in
// src/config.js if an extension changes).

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SPRITES_DIR = join(ROOT, "assets", "sprites");
const AUDIO_DIR = join(ROOT, "assets", "audio");
const TILES_DIR = join(ROOT, "assets", "tilesets");
const BG_DIR = join(ROOT, "assets", "backgrounds");

// ---------------------------------------------------------------------------
// PNG encoding (RGBA, 8-bit) — minimal, spec-compliant encoder.
// ---------------------------------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// pixels: Uint8Array of length w*h*4 (RGBA)
function encodePNG(width, height, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data with a filter byte (0 = none) prepended to each scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.subarray(y * stride, y * stride + stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v;
    });
  }

  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Sprite drawing — a tiny raster toolkit on a width×height RGBA buffer, used to
// compose simple-but-readable heroines (head, hair, dress, limbs) instead of flat
// discs. Heroines and their clothing skins share ONE canvas size so the skin layers
// (added as child sprites in src/entities/player.js) line up at any scale.
// ---------------------------------------------------------------------------
const SPRITE_W = 64;
const SPRITE_H = 96; // taller than wide so the heroine reads as a character, not a ball

function blank(w, h) {
  return new Uint8Array(w * h * 4); // all zero = transparent
}
function pset(buf, w, x, y, color, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  if (i < 0 || i + 3 >= buf.length) return;
  buf[i] = color[0];
  buf[i + 1] = color[1];
  buf[i + 2] = color[2];
  buf[i + 3] = a;
}
function fillRect(buf, w, x0, y0, x1, y1, color, a = 255) {
  for (let y = Math.round(y0); y < Math.round(y1); y++)
    for (let x = Math.round(x0); x < Math.round(x1); x++) pset(buf, w, x, y, color, a);
}
function fillDisc(buf, w, cx, cy, r, color, a = 255) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) pset(buf, w, x, y, color, a);
    }
}
// Vertical trapezoid centred on cx: half-width eases halfTop→halfBot over yTop→yBot.
function fillTrap(buf, w, yTop, yBot, cx, halfTop, halfBot, color, a = 255) {
  for (let y = Math.round(yTop); y < Math.round(yBot); y++) {
    const f = (y - yTop) / Math.max(1, yBot - yTop);
    const half = halfTop + (halfBot - halfTop) * f;
    fillRect(buf, w, cx - half, y, cx + half + 1, y + 1, color, a);
  }
}
const darken = (c, f = 0.82) => c.map((v) => Math.round(v * f));

const SKIN = [243, 207, 178]; // shared incarnato
const SHOE = [70, 54, 70];
const EYE = [44, 36, 50];

// Compose one heroine on a transparent SPRITE_W×SPRITE_H canvas. `hair`/`dress` are RGB;
// `hairLen` sets how far the locks fall (style cue per character).
function makeHeroine({ hair, dress, hairLen = 52, skin = SKIN }) {
  const w = SPRITE_W;
  const h = SPRITE_H;
  const cx = w / 2;
  const buf = blank(w, h);
  const dress2 = darken(dress);
  // Hair behind the head + locks falling past the shoulders.
  fillDisc(buf, w, cx, 23, 20, hair);
  fillRect(buf, w, cx - 17, 23, cx + 17, hairLen, hair);
  // Dress (chest → hem) with a darker hem band.
  fillTrap(buf, w, 47, 86, cx, 10, 22, dress);
  fillTrap(buf, w, 80, 86, cx, 22, 22, dress2);
  // Sleeves + hands.
  fillRect(buf, w, cx - 22, 50, cx - 13, 70, dress);
  fillRect(buf, w, cx + 13, 50, cx + 22, 70, dress);
  fillDisc(buf, w, cx - 18, 71, 4, skin);
  fillDisc(buf, w, cx + 18, 71, 4, skin);
  // Legs + shoes.
  fillRect(buf, w, cx - 7, 84, cx - 1, 92, skin);
  fillRect(buf, w, cx + 1, 84, cx + 7, 92, skin);
  fillRect(buf, w, cx - 8, 91, cx - 0.5, 96, SHOE);
  fillRect(buf, w, cx + 0.5, 91, cx + 8, 96, SHOE);
  // Neck + face.
  fillRect(buf, w, cx - 4, 38, cx + 4, 46, skin);
  fillDisc(buf, w, cx, 28, 15, skin);
  // Hair fringe over the forehead + side framing of the face.
  fillTrap(buf, w, 13, 24, cx, 16, 13, hair);
  fillRect(buf, w, cx - 16, 22, cx - 11, 40, hair);
  fillRect(buf, w, cx + 11, 22, cx + 16, 40, hair);
  // Eyes, blush, a small smile.
  fillDisc(buf, w, cx - 6, 29, 2.6, EYE);
  fillDisc(buf, w, cx + 6, 29, 2.6, EYE);
  fillDisc(buf, w, cx - 9, 34, 2.3, [233, 150, 160], 150);
  fillDisc(buf, w, cx + 9, 34, 2.3, [233, 150, 160], 150);
  fillRect(buf, w, cx - 2, 35, cx + 3, 36, [176, 88, 92]);
  return buf;
}

// Clothing skins (spec §3) — each on the same canvas, positioned to overlay the base body.
function makeSkin(kind, color) {
  const w = SPRITE_W;
  const cx = w / 2;
  const buf = blank(w, SPRITE_H);
  if (kind === "skirt") {
    fillTrap(buf, w, 63, 90, cx, 11, 27, color);
    fillTrap(buf, w, 85, 90, cx, 27, 27, darken(color, 0.85));
  } else if (kind === "bodice") {
    fillTrap(buf, w, 47, 67, cx, 10, 14, color);
  } else if (kind === "necklace") {
    fillRect(buf, w, cx - 7, 44, cx + 7, 47, color);
    fillDisc(buf, w, cx, 49, 2.6, color);
  } else if (kind === "crown") {
    fillRect(buf, w, cx - 12, 8, cx + 12, 13, color);
    for (const off of [-11, -3.5, 4]) fillTrap(buf, w, 1, 8, cx + off + 3.5, 0.5, 3.5, color);
  }
  return buf;
}

// Title mark: a small gold crown emblem (ASSETS.sprites.logo).
function makeLogo() {
  const w = SPRITE_W;
  const cx = w / 2;
  const gold = [212, 175, 55];
  const gem = [235, 220, 150];
  const buf = blank(w, SPRITE_H);
  fillRect(buf, w, cx - 20, 52, cx + 20, 64, gold);
  for (const off of [-18, -6, 6]) fillTrap(buf, w, 30, 52, cx + off + 6, 1, 6, gold);
  fillDisc(buf, w, cx - 12, 30, 3, gem);
  fillDisc(buf, w, cx, 26, 3, gem);
  fillDisc(buf, w, cx + 12, 30, 3, gem);
  return buf;
}

// ---------------------------------------------------------------------------
// World art (spec §2): a tintable 64px tile atlas + collectible/enemy/goal sprites +
// parallax backgrounds. Tiles and the goal are drawn in NEUTRAL LIGHT greys with baked
// bevel + dither so the game's multiplicative k.color(theme.x) tint keeps contrast (the
// faithful two-tone look is preserved by build.js: a body sprite tinted theme.solid plus
// the existing thin theme.solidTop accent). Collectibles/enemies are drawn in their natural
// colours (they're per-level, so no runtime tint is needed). Reuses the raster toolkit
// (blank/pset/fillRect/fillDisc/fillTrap/darken) — no new dependencies.
// ---------------------------------------------------------------------------
const TILE = 64;
const lighten = (c, f = 1.15) => c.map((v) => Math.min(255, Math.round(v * f)));

// Copy a source RGBA buffer into a destination at (dx,dy), skipping transparent pixels.
function blit(dst, dw, dh, src, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = (y * sw + x) * 4;
      const a = src[si + 3];
      if (a === 0) continue;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dw || ty >= dh) continue;
      pset(dst, dw, tx, ty, [src[si], src[si + 1], src[si + 2]], a);
    }
  }
}

// Deterministic speckle for a hand-textured feel (seeded LCG so output is reproducible).
function speckle(buf, w, x0, y0, x1, y1, color, density, seed) {
  let s = (seed >>> 0) || 1;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) if (rnd() < density) pset(buf, w, x, y, color);
}

// --- Tileset frames (64×64, neutral grey, tinted at runtime) -----------------
const GREY = [196, 196, 196];
const GREY_HI = lighten(GREY, 1.18); // top-lit edge
const GREY_LO = darken(GREY, 0.78); // shaded body
const GREY_LO2 = darken(GREY, 0.62); // deepest shade / outline

function tileGroundFill() {
  const buf = blank(TILE, TILE);
  fillRect(buf, TILE, 0, 0, TILE, TILE, GREY_LO);
  speckle(buf, TILE, 0, 0, TILE, TILE, GREY_LO2, 0.14, 7); // earthy grain
  speckle(buf, TILE, 0, 0, TILE, TILE, GREY, 0.06, 23); // lighter flecks
  fillRect(buf, TILE, 0, 0, TILE, 2, GREY); // subtle seam at the very top
  return buf;
}
function tileGroundTop() {
  const buf = blank(TILE, TILE);
  fillRect(buf, TILE, 0, 0, TILE, TILE, GREY_LO); // dirt body
  speckle(buf, TILE, 0, 16, TILE, TILE, GREY_LO2, 0.14, 11);
  // Grassy crown: a lighter band + a few blades poking up so the lit edge reads.
  fillRect(buf, TILE, 0, 0, TILE, 16, GREY_HI);
  for (let x = 2; x < TILE; x += 6) {
    const h = 3 + ((x * 7) % 5);
    fillTrap(buf, TILE, 16 - h, 16, x + 1, 0.5, 1.5, GREY_HI);
  }
  fillRect(buf, TILE, 0, 15, TILE, 18, GREY); // soil line under the grass
  return buf;
}
function tilePlatform() {
  const buf = blank(TILE, TILE);
  // A rounded floating slab centred in the cell (transparent margins).
  fillRect(buf, TILE, 2, 8, TILE - 2, TILE - 12, GREY_LO);
  fillRect(buf, TILE, 2, 8, TILE - 2, 14, GREY_HI); // lit top
  fillRect(buf, TILE, 2, TILE - 16, TILE - 2, TILE - 12, GREY_LO2); // shaded underside
  speckle(buf, TILE, 2, 14, TILE - 2, TILE - 16, GREY_LO2, 0.1, 5);
  return buf;
}
function tileHazardSpike() {
  const buf = blank(TILE, TILE);
  // A row of upward triangular spikes on a low base (drawn neutral, tinted theme.hazard).
  fillRect(buf, TILE, 0, TILE - 14, TILE, TILE, GREY_LO);
  for (let i = 0; i < 4; i++) {
    const cx = 8 + i * 16;
    fillTrap(buf, TILE, 16, TILE - 12, cx, 0.5, 8, GREY); // spike body
    fillTrap(buf, TILE, 16, 30, cx, 0.5, 3, GREY_HI); // bright tip
  }
  return buf;
}
function tileHazardIcicle() {
  const buf = blank(TILE, TILE);
  // A downward icicle filling most of the cell (tinted theme.hazard at runtime).
  fillTrap(buf, TILE, 0, TILE * 0.95, TILE / 2, TILE / 2, 1, GREY);
  fillTrap(buf, TILE, 0, TILE * 0.6, TILE / 2 - 6, 6, 1, GREY_HI); // glossy highlight streak
  fillRect(buf, TILE, 0, 0, TILE, 4, GREY_LO); // ceiling attachment
  return buf;
}

// Compose the atlas as a horizontal strip: [ground_top|ground_fill|platform|spike|icicle].
const ATLAS_FRAMES = ["ground_top", "ground_fill", "platform", "hazard_spike", "hazard_icicle"];
function makeTileAtlas() {
  const frames = [
    tileGroundTop(),
    tileGroundFill(),
    tilePlatform(),
    tileHazardSpike(),
    tileHazardIcicle(),
  ];
  const aw = TILE * frames.length;
  const ah = TILE;
  const atlas = blank(aw, ah);
  frames.forEach((f, i) => blit(atlas, aw, ah, f, TILE, TILE, i * TILE, 0));
  return { buf: atlas, w: aw, h: ah };
}

// --- Collectible sprites (48×48, natural colour) -----------------------------
const CW = 48;
function gemBase(buf, cx, cy, r, col) {
  fillDisc(buf, CW, cx, cy, r, darken(col, 0.85));
  fillDisc(buf, CW, cx, cy, r - 2, col);
  fillDisc(buf, CW, cx - r * 0.32, cy - r * 0.32, r * 0.28, lighten(col, 1.4)); // sheen
}
function makeApple() {
  const buf = blank(CW, CW);
  const red = [210, 64, 60];
  gemBase(buf, 24, 28, 16, red);
  fillDisc(buf, CW, 31, 28, 14, darken(red, 0.9)); // two lobes
  fillRect(buf, CW, 23, 8, 26, 16, [96, 64, 42]); // stem
  fillTrap(buf, CW, 6, 14, 32, 1, 6, [120, 178, 96]); // leaf
  return buf;
}
function makePearl() {
  const buf = blank(CW, CW);
  const cream = [236, 240, 250];
  gemBase(buf, 24, 26, 16, cream);
  fillDisc(buf, CW, 19, 21, 4, [255, 255, 255]); // bright highlight
  return buf;
}
function makeLantern() {
  const buf = blank(CW, CW);
  const warm = [255, 196, 84];
  fillRect(buf, CW, 16, 12, 32, 16, [120, 40, 40]); // top cap
  fillTrap(buf, CW, 16, 38, 24, 9, 12, warm); // glowing body
  fillTrap(buf, CW, 16, 38, 24, 9, 12, lighten(warm, 1.2), 90); // inner glow
  fillRect(buf, CW, 14, 36, 34, 40, [120, 40, 40]); // bottom cap
  fillRect(buf, CW, 23, 8, 26, 12, [80, 30, 30]); // hook
  return buf;
}
function makeCrystal() {
  const buf = blank(CW, CW);
  const cyan = [96, 214, 226];
  // A faceted gem: upper trapezoid + lower point, with a lit left facet.
  fillTrap(buf, CW, 10, 22, 24, 6, 15, cyan);
  fillTrap(buf, CW, 22, 42, 24, 15, 1, darken(cyan, 0.9));
  fillTrap(buf, CW, 10, 22, 20, 3, 7, lighten(cyan, 1.35)); // sheen facet
  return buf;
}

// --- Enemy + goal sprites ----------------------------------------------------
function makeCrab() {
  const w = 64;
  const h = 40;
  const buf = blank(w, h);
  const body = [206, 70, 60];
  const claw = [232, 120, 104];
  fillDisc(buf, w, 32, 24, 18, body); // shell
  fillRect(buf, w, 14, 22, 50, 32, body);
  fillDisc(buf, w, 12, 22, 6, claw); // claws
  fillDisc(buf, w, 52, 22, 6, claw);
  for (const lx of [20, 28, 36, 44]) fillRect(buf, w, lx, 30, lx + 2, 38, darken(body, 0.8)); // legs
  fillDisc(buf, w, 26, 16, 4, [255, 255, 255]); // eyes
  fillDisc(buf, w, 38, 16, 4, [255, 255, 255]);
  fillDisc(buf, w, 26, 16, 2, [20, 20, 20]);
  fillDisc(buf, w, 38, 16, 2, [20, 20, 20]);
  return buf;
}
function makeFlyer() {
  const w = 48;
  const h = 32;
  const buf = blank(w, h);
  const body = [44, 40, 60];
  const wing = [26, 24, 40];
  fillDisc(buf, w, 24, 18, 9, body); // body
  fillTrap(buf, w, 6, 18, 10, 1, 8, wing); // left wing (as a sideways triangle-ish)
  fillTrap(buf, w, 6, 18, 38, 1, 8, wing); // right wing
  fillRect(buf, w, 2, 12, 14, 16, wing);
  fillRect(buf, w, 34, 12, 46, 16, wing);
  fillDisc(buf, w, 27, 15, 2.5, [255, 255, 255]); // eye
  return buf;
}
function makePortal() {
  const w = 96;
  const h = 160;
  const buf = blank(w, h);
  const stone = GREY_LO;
  // Two pillars + an arched top, neutral grey (tinted theme.goal at runtime).
  fillRect(buf, w, 8, 30, 26, h, stone);
  fillRect(buf, w, w - 26, 30, w - 8, h, stone);
  fillTrap(buf, w, 0, 34, w / 2, 8, 40, stone); // arch crown
  // Inner glow (lighter towards the centre) so the gateway reads as magical.
  for (let y = 34; y < h; y++) {
    const t = (y - 34) / (h - 34);
    fillRect(buf, w, 26, y, w - 26, y + 1, GREY_HI, Math.round(120 * (1 - t) + 40));
  }
  // Bevel highlights on the inner edges.
  fillRect(buf, w, 24, 34, 28, h, GREY_HI);
  fillRect(buf, w, w - 28, 34, w - 24, h, GREY_HI);
  return buf;
}

// --- Parallax backgrounds ----------------------------------------------------
// One palette per theme — mirrors the level themes in src/levels/level*.js (bg/bgBand for
// the sky gradient, parallaxFar/parallaxNear for the two silhouette layers).
const BG_THEMES = {
  forest: { sky: [20, 44, 38], skyBot: [38, 74, 60], far: [34, 66, 54], near: [50, 90, 66], shape: "hills" },
  coral: { sky: [10, 34, 70], skyBot: [24, 60, 104], far: [78, 70, 120], near: [42, 86, 118], shape: "mounds" },
  rooftops: { sky: [58, 28, 64], skyBot: [168, 84, 92], far: [86, 50, 90], near: [120, 58, 76], shape: "roofs" },
  snow: { sky: [150, 180, 216], skyBot: [226, 238, 250], far: [150, 172, 206], near: [124, 150, 190], shape: "peaks" },
};

function makeSky(top, bot) {
  const w = 1280;
  const h = 720;
  const buf = blank(w, h);
  for (let y = 0; y < h; y++) {
    const f = y / (h - 1);
    const c = [0, 1, 2].map((i) => Math.round(top[i] + (bot[i] - top[i]) * f));
    fillRect(buf, w, 0, y, w, y + 1, c);
  }
  return buf;
}

// A silhouette layer (transparent) of the given shape across `w`, sitting on the bottom.
function makeSilhouette(w, h, color, shape, scale, seed) {
  const buf = blank(w, h);
  let s = (seed >>> 0) || 1;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const baseY = h - 4;
  if (shape === "hills" || shape === "mounds") {
    const r = 120 * scale;
    for (let x = -40; x < w + 80; x += r * 0.9) {
      const rr = r * (0.7 + rnd() * 0.6);
      fillDisc(buf, w, x, baseY, rr, color);
    }
  } else if (shape === "peaks") {
    const pw = 360 * scale;
    for (let x = -60; x < w + 120; x += pw * 0.8) {
      const ph = (220 + rnd() * 160) * scale;
      fillTrap(buf, w, baseY - ph, baseY, x, 0.5, pw / 2, color);
      fillTrap(buf, w, baseY - ph, baseY - ph + 40 * scale, x, 0.5, 28 * scale, [240, 248, 255]); // snow cap
    }
  } else if (shape === "roofs") {
    const rw = 300 * scale;
    for (let x = -40; x < w + 80; x += rw * 0.9) {
      const rh = (140 + rnd() * 90) * scale;
      fillRect(buf, w, x - rw / 2 + 40, baseY - rh, x + rw / 2 - 40, baseY, color); // wall
      fillTrap(buf, w, baseY - rh - 70 * scale, baseY - rh, x, 8, rw / 2, color); // upturned roof
      fillRect(buf, w, x - 4, baseY - rh - 70 * scale - 24, x + 4, baseY - rh - 70 * scale, color); // finial
    }
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Music — gentle, looping background tracks composed from the same tone() synth as the
// SFX (see buildMenuMusic / buildGameMusic below the SFX section). The notes are drawn from
// a pentatonic scale so they stay consonant, with soft envelopes and low volume so the loop
// is pleasant rather than a droning tone. Encoded to WAV via encodeWav(). (This replaces the
// old single-sine "menu-bgm" placeholder, which was the source of the grating menu drone.)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sound effects — tiny synthesized WAVs (mirrors tools/gen_placeholders.py). Simple
// oscillators with a short anti-click fade in/out and an optional exponential decay.
// ---------------------------------------------------------------------------
const SFX_RATE = 22050;

function osc(phase, wave) {
  if (wave === "tri") return (2 / Math.PI) * Math.asin(Math.sin(phase));
  if (wave === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  if (wave === "saw") {
    const x = phase / (2 * Math.PI);
    return 2 * (x - Math.floor(x + 0.5));
  }
  return Math.sin(phase);
}

function tone(freq, dur, { vol = 0.5, wave = "sine", decay = 0, fEnd = null, sr = SFX_RATE } = {}) {
  const n = Math.max(1, Math.floor(dur * sr));
  const atk = Math.max(1, Math.floor(0.004 * sr));
  const rel = Math.max(1, Math.floor(0.006 * sr));
  const out = new Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const f = fEnd === null ? freq : freq + (fEnd - freq) * (i / Math.max(1, n - 1));
    phase += (2 * Math.PI * f) / sr;
    let s = osc(phase, wave) * vol;
    if (decay > 0) s *= Math.exp(-decay * (i / sr));
    s *= Math.min(1, i / atk); // fade in
    s *= Math.min(1, (n - i) / rel); // fade out
    out[i] = s;
  }
  return out;
}

const seq = (...parts) => parts.flat();

function mix(...parts) {
  const n = Math.max(...parts.map((p) => p.length));
  const out = new Array(n).fill(0);
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i];
  return out;
}

function normalize(samples, peak = 0.85) {
  let m = 0;
  for (const s of samples) m = Math.max(m, Math.abs(s));
  if (m <= 1e-9) return samples;
  const g = peak / m;
  return samples.map((s) => s * g);
}

function buildSfx() {
  return {
    jump: tone(420, 0.13, { vol: 0.5, wave: "tri", fEnd: 780, decay: 6 }),
    collect: seq(tone(1175, 0.05, { vol: 0.45 }), tone(1568, 0.11, { vol: 0.5, decay: 8 })),
    coin: seq(
      tone(988, 0.07, { vol: 0.45, wave: "tri" }),
      tone(1319, 0.42, { vol: 0.45, wave: "tri", decay: 6 }),
    ),
    oops: tone(659, 0.32, { vol: 0.5, fEnd: 415, decay: 3 }),
    goal: seq(
      tone(523, 0.08, { vol: 0.4, wave: "tri" }),
      tone(659, 0.08, { vol: 0.4, wave: "tri" }),
      tone(784, 0.08, { vol: 0.4, wave: "tri" }),
      tone(1047, 0.3, { vol: 0.5, wave: "tri", decay: 4 }),
    ),
    win: seq(
      tone(523, 0.1, { vol: 0.4, wave: "tri" }),
      tone(659, 0.1, { vol: 0.4, wave: "tri" }),
      tone(784, 0.1, { vol: 0.4, wave: "tri" }),
      mix(
        tone(523, 0.7, { vol: 0.22, decay: 2.2 }),
        tone(659, 0.7, { vol: 0.22, decay: 2.2 }),
        tone(784, 0.7, { vol: 0.22, decay: 2.2 }),
        tone(1047, 0.7, { vol: 0.22, decay: 2.2 }),
      ),
    ),
    select: seq(tone(784, 0.04, { vol: 0.32 }), tone(1175, 0.07, { vol: 0.32, decay: 12 })),
  };
}

// --- Background music (pentatonic → always consonant; soft + low for a gentle loop) -------
const NOTE = {
  C3: 130.81, E3: 164.81, G3: 196.0, A3: 220.0,
  E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25,
};

// Menu: a light music-box waltz over a soft low bass (~13s loop).
function buildMenuMusic() {
  const b = 0.4; // seconds per beat
  const N = NOTE;
  const m = (f, beats = 1) => tone(f, b * beats, { vol: 0.5, wave: "sine", decay: 2.6 });
  const bass = (f, beats) => tone(f, b * beats, { vol: 0.3, wave: "tri", decay: 0.8 });
  const melody = seq(
    m(N.G4), m(N.C5), m(N.E5), m(N.D5),
    m(N.C5), m(N.E5), m(N.G4), m(N.A4),
    m(N.G4), m(N.A4), m(N.C5), m(N.D5),
    m(N.E5, 2), m(N.D5, 2),
    m(N.C5), m(N.A4), m(N.G4), m(N.E4),
    m(N.G4), m(N.C5), m(N.A4), m(N.G4),
    m(N.E4), m(N.G4), m(N.A4), m(N.C5),
    m(N.G4, 2), m(0, 2),
  );
  const bassline = seq(
    bass(N.C3, 4), bass(N.A3, 4), bass(N.G3, 4), bass(N.E3, 4),
    bass(N.C3, 4), bass(N.G3, 4), bass(N.A3, 4), bass(N.G3, 4),
  );
  return normalize(mix(melody, bassline), 0.62);
}

// Gameplay: a slower, sparser, airier loop that stays out of the way (~26s loop).
function buildGameMusic() {
  const b = 0.8;
  const N = NOTE;
  const lead = (f, beats = 2) => tone(f, b * beats, { vol: 0.4, wave: "sine", decay: 1.1 });
  const pad = (f, beats) => tone(f, b * beats, { vol: 0.2, wave: "tri", decay: 0.5 });
  const melody = seq(
    lead(N.C5), lead(N.G4), lead(N.A4), lead(N.E5),
    lead(N.D5), lead(N.C5), lead(N.G4), lead(N.A4),
    lead(N.E4), lead(N.G4), lead(N.C5), lead(N.D5),
    lead(N.E5), lead(N.D5), lead(N.C5, 4),
  );
  const padline = seq(pad(N.C3, 8), pad(N.A3, 8), pad(N.E3, 8), pad(N.G3, 8));
  return normalize(mix(melody, padline), 0.5);
}

function encodeWav(samples, sampleRate = SFX_RATE) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 0x7fff, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// ---------------------------------------------------------------------------
// Generate everything.
// ---------------------------------------------------------------------------
mkdirSync(SPRITES_DIR, { recursive: true });
mkdirSync(AUDIO_DIR, { recursive: true });
mkdirSync(TILES_DIR, { recursive: true });
mkdirSync(BG_DIR, { recursive: true });

// Heroines (spec §3). `dress` is the signature colour from each character's palette;
// `hair`/`hairLen` give each a distinct silhouette.
const HEROINES = [
  { name: "anna.png", hair: [92, 60, 40], dress: [167, 199, 231], hairLen: 54 }, // castani mossi, piumino carta da zucchero
  { name: "sognatrice.png", hair: [168, 96, 52], dress: [240, 198, 116], hairLen: 68 }, // rame/oro lunghi (Belle/Ariel)
  { name: "avventuriera.png", hair: [46, 36, 38], dress: [196, 122, 88], hairLen: 46 }, // scuri, nomade terracotta
];

for (const c of HEROINES) {
  writeFileSync(join(SPRITES_DIR, c.name), encodePNG(SPRITE_W, SPRITE_H, makeHeroine(c)));
  console.log("sprite ->", join("assets", "sprites", c.name));
}
writeFileSync(join(SPRITES_DIR, "logo.png"), encodePNG(SPRITE_W, SPRITE_H, makeLogo()));
console.log("sprite ->", join("assets", "sprites", "logo.png"));

// Skin layers (spec §3): one transparent overlay per layer, positioned over the body.
const SKINS = [
  { name: "skirt.png", kind: "skirt", color: [212, 175, 55] },
  { name: "bodice.png", kind: "bodice", color: [231, 150, 173] },
  { name: "necklace.png", kind: "necklace", color: [255, 236, 170] },
  { name: "crown.png", kind: "crown", color: [212, 175, 55] },
];

for (const s of SKINS) {
  writeFileSync(join(SPRITES_DIR, s.name), encodePNG(SPRITE_W, SPRITE_H, makeSkin(s.kind, s.color)));
  console.log("skin   ->", join("assets", "sprites", s.name));
}

writeFileSync(join(AUDIO_DIR, "menu-bgm.wav"), encodeWav(buildMenuMusic()));
console.log("audio  ->", join("assets", "audio", "menu-bgm.wav"));
writeFileSync(join(AUDIO_DIR, "game-bgm.wav"), encodeWav(buildGameMusic()));
console.log("audio  ->", join("assets", "audio", "game-bgm.wav"));

for (const [name, samples] of Object.entries(buildSfx())) {
  writeFileSync(join(AUDIO_DIR, `${name}.wav`), encodeWav(normalize(samples)));
  console.log("sfx    ->", join("assets", "audio", `${name}.wav`));
}

// World tile atlas (spec §2) — one strip the four themes tint at runtime.
const atlas = makeTileAtlas();
writeFileSync(join(TILES_DIR, "tileset.png"), encodePNG(atlas.w, atlas.h, atlas.buf));
console.log("tiles  ->", join("assets", "tilesets", "tileset.png"), `(frames: ${ATLAS_FRAMES.join(", ")})`);

// Collectible / enemy / goal sprites (natural colour where per-level, neutral where tinted).
const WORLD_SPRITES = [
  { name: "apple.png", w: CW, h: CW, buf: makeApple() },
  { name: "pearl.png", w: CW, h: CW, buf: makePearl() },
  { name: "lantern.png", w: CW, h: CW, buf: makeLantern() },
  { name: "crystal.png", w: CW, h: CW, buf: makeCrystal() },
  { name: "crab.png", w: 64, h: 40, buf: makeCrab() },
  { name: "flyer.png", w: 48, h: 32, buf: makeFlyer() },
  { name: "portal.png", w: 96, h: 160, buf: makePortal() },
];
for (const s of WORLD_SPRITES) {
  writeFileSync(join(SPRITES_DIR, s.name), encodePNG(s.w, s.h, s.buf));
  console.log("sprite ->", join("assets", "sprites", s.name));
}

// Parallax backgrounds (spec §2): per theme, sky (1280×720) + mid (1920×480) + near (1920×360).
for (const [name, t] of Object.entries(BG_THEMES)) {
  writeFileSync(join(BG_DIR, `${name}_sky.png`), encodePNG(1280, 720, makeSky(t.sky, t.skyBot)));
  const mid = makeSilhouette(1920, 480, t.far, t.shape, 1.0, 0x51 + name.length);
  writeFileSync(join(BG_DIR, `${name}_mid.png`), encodePNG(1920, 480, mid));
  const near = makeSilhouette(1920, 360, t.near, t.shape, 1.3, 0x91 + name.length);
  writeFileSync(join(BG_DIR, `${name}_near.png`), encodePNG(1920, 360, near));
  console.log("bg     ->", join("assets", "backgrounds", `${name}_{sky,mid,near}.png`));
}

console.log("\nDone. Placeholder assets generated.");
