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

console.log("\nDone. Placeholder assets generated.");
