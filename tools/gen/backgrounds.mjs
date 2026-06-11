// backgrounds.mjs — pixel-art parallax backdrops, one set per theme.
//
// Authored at quarter resolution and upscaled ×4 to the exact sizes game.js expects:
// sky 320×180 → 1280×720 (screen-fixed), mid 480×120 → 1920×480 (camera ×0.5),
// near 480×90 → 1920×360 (camera ×0.8). Mid/near images are created with wrapX so every
// shape drawn off one edge re-enters on the other — game.js tiles them modulo 1920, so
// seamless wrapping is a hard requirement, not a nicety.
//
// The 16-bit look comes from: gradients quantized into dithered bands (skies), flat
// silhouette tones with sparse interior detail (layers), and theme-specific set dressing
// (pines / kelp + coral fans / pagoda skyline with lit windows / snow peaks).

import { newImg, pset, fillRect, fillDisc, fillTrap, lighten, darken, rng, bayer, ditherRect } from "./px.mjs";

const SKY_W = 320;
const SKY_H = 180;
const LAYER_W = 480;

// Palettes mirror the theme colors in src/levels/level*.js (bg → sky top, parallaxFar/Near
// → the two silhouette layers), so world tiles keep sitting naturally on the backdrop.
export const BG_THEMES = {
  forest: { sky: [20, 44, 38], skyBot: [38, 74, 60], far: [34, 66, 54], near: [50, 90, 66] },
  coral: { sky: [10, 34, 70], skyBot: [24, 60, 104], far: [78, 70, 120], near: [42, 86, 118] },
  rooftops: { sky: [58, 28, 64], skyBot: [168, 84, 92], far: [86, 50, 90], near: [120, 58, 76] },
  snow: { sky: [150, 180, 216], skyBot: [226, 238, 250], far: [150, 172, 206], near: [124, 150, 190] },
  garden: { sky: [36, 22, 58], skyBot: [150, 84, 122], far: [70, 48, 92], near: [54, 76, 70] },
  castle: { sky: [34, 18, 30], skyBot: [88, 46, 44], far: [78, 50, 62], near: [104, 66, 70] },
};

// --- skies ---------------------------------------------------------------------

// Vertical gradient quantized into N flat bands, with Bayer dithering across each band
// boundary — the classic 16-bit sky.
function bandedSky(top, bot, bands = 9) {
  const img = newImg(SKY_W, SKY_H);
  for (let y = 0; y < SKY_H; y++) {
    for (let x = 0; x < SKY_W; x++) {
      const t = (y / SKY_H) * bands + (bayer(x, y) / 4 - 0.5) * 0.9;
      const i = Math.max(0, Math.min(bands - 1, Math.floor(t)));
      const f = i / (bands - 1);
      pset(img, x, y, [0, 1, 2].map((c) => Math.round(top[c] + (bot[c] - top[c]) * f)));
    }
  }
  return img;
}

function sprinkleStars(img, count, seed, color = [232, 238, 230]) {
  const rnd = rng(seed);
  for (let i = 0; i < count; i++) {
    pset(img, Math.floor(rnd() * img.w), Math.floor(rnd() * img.h * 0.55), color, 200);
  }
}

const SKY_DECO = {
  forest(img) {
    // A pale moon high in the enchanted night + sparse stars.
    sprinkleStars(img, 40, 101);
    fillDisc(img, 252, 38, 14, [214, 226, 206]);
    fillDisc(img, 247, 34, 11, [232, 240, 222]);
    fillDisc(img, 256, 42, 4, [202, 214, 192]); // a crater shadow
  },
  coral(img) {
    // Slanted light shafts sinking from the surface + a few rising bubbles.
    for (const x0 of [50, 130, 230, 300]) {
      for (let y = 0; y < SKY_H * 0.7; y++) {
        const x = Math.round(x0 + y * 0.35);
        if ((x + y) % 2 === 0) {
          pset(img, x, y, [70, 110, 160], 110);
          pset(img, x + 1, y, [70, 110, 160], 70);
        }
      }
    }
    const rnd = rng(77);
    for (let i = 0; i < 26; i++) {
      pset(img, Math.floor(rnd() * SKY_W), Math.floor(rnd() * SKY_H), [150, 195, 230], 130);
    }
  },
  rooftops(img) {
    // A big dusk sun low on the horizon, thin cloud bands, first stars above.
    sprinkleStars(img, 22, 55, [240, 220, 200]);
    fillDisc(img, 240, 132, 22, [244, 158, 96]);
    fillDisc(img, 236, 128, 17, [252, 192, 120]);
    for (const [y, x0, x1] of [[120, 180, 320], [136, 200, 300], [108, 215, 270]]) {
      fillRect(img, x0, y, x1, y + 2, [120, 62, 88]);
      ditherRect(img, x0 - 8, y, x0, y + 2, [120, 62, 88]);
      ditherRect(img, x1, y, x1 + 8, y + 2, [120, 62, 88], 255, 1);
    }
  },
  snow(img) {
    // A small bright winter sun + soft dithered cloud bands.
    fillDisc(img, 60, 36, 9, [248, 250, 240]);
    for (const [y, x0, x1] of [[60, 100, 250], [78, 30, 160], [92, 190, 320]]) {
      fillRect(img, x0, y, x1, y + 3, [238, 244, 252]);
      ditherRect(img, x0 - 10, y, x0, y + 3, [238, 244, 252]);
      ditherRect(img, x1, y, x1 + 10, y + 3, [238, 244, 252], 255, 1);
    }
  },
  garden(img) {
    // First evening stars, a rising full moon tinted rose by the dusk.
    sprinkleStars(img, 34, 211, [240, 222, 236]);
    fillDisc(img, 64, 44, 13, [228, 196, 206]);
    fillDisc(img, 60, 40, 10, [244, 220, 226]);
    fillDisc(img, 68, 48, 3.5, [212, 180, 194]); // crater shadow
    // Thin violet cloud bands across the afterglow.
    for (const [y, x0, x1] of [[110, 140, 300], [126, 60, 220], [98, 200, 310]]) {
      fillRect(img, x0, y, x1, y + 2, [96, 56, 110]);
      ditherRect(img, x0 - 8, y, x0, y + 2, [96, 56, 110]);
      ditherRect(img, x1, y, x1 + 8, y + 2, [96, 56, 110], 255, 1);
    }
  },
  castle(img) {
    // Interior: tall arched windows letting the night in (the warm floor glow comes from
    // the theme's bgBand + the near layer's torches — no painted pools, they band badly).
    const night = [60, 50, 110];
    for (const x0 of [40, 130, 220, 290]) {
      fillRect(img, x0, 24, x0 + 16, 78, night); // window body
      fillTrap(img, 16, 24, x0 + 8, 1.5, 8.5, night); // arched top
      pset(img, x0 + 4, 40, [222, 226, 244]); // moonlit pane glints
      pset(img, x0 + 11, 52, [222, 226, 244]);
      fillRect(img, x0 + 7, 24, x0 + 9, 78, [34, 18, 30]); // mullion
    }
  },
};

export function buildSky(themeName) {
  const t = BG_THEMES[themeName];
  const img = bandedSky(t.sky, t.skyBot);
  SKY_DECO[themeName](img);
  return img;
}

// --- silhouette layers ------------------------------------------------------------

// Each painter fills a wrapX canvas bottom-up with theme shapes. `hMin/hMax` are shape
// heights in native px; mid layers get shorter/denser shapes, near layers taller/sparser.

function pine(img, x, baseY, h, color) {
  const dark = darken(color, 0.85);
  const half = Math.max(3, Math.round(h * 0.32));
  fillTrap(img, baseY - h, baseY - h * 0.55, x, 0.5, half * 0.55, color);
  fillTrap(img, baseY - h * 0.72, baseY - h * 0.3, x, 1, half * 0.8, color);
  fillTrap(img, baseY - h * 0.48, baseY, x, 1.5, half, color);
  ditherRect(img, x - half, baseY - h * 0.25, x + half + 1, baseY, dark, 255, x % 2);
  fillRect(img, x, baseY, x + 1, baseY + 3, dark); // stub of trunk into the ground band
}

function forestLayer(img, color, hMin, hMax, seed) {
  const rnd = rng(seed);
  const baseY = img.h - 5;
  for (let x = 4; x < img.w + 20; x += 16 + Math.floor(rnd() * 14)) {
    pine(img, x, baseY, hMin + rnd() * (hMax - hMin), color);
  }
  fillRect(img, 0, baseY, img.w, img.h, color); // solid ground band
}

function coralLayer(img, color, hMin, hMax, seed) {
  const rnd = rng(seed);
  const baseY = img.h - 5;
  const dark = darken(color, 0.85);
  // Rounded reef mounds…
  for (let x = 0; x < img.w + 40; x += 34 + Math.floor(rnd() * 26)) {
    const r = (hMin + rnd() * (hMax - hMin)) * 0.45;
    fillDisc(img, x, baseY, r, color);
    ditherRect(img, x - r, baseY - r * 0.4, x + r + 1, baseY, dark, 255, x % 2);
  }
  // …kelp stalks swaying between them…
  for (let x = 10; x < img.w + 20; x += 22 + Math.floor(rnd() * 18)) {
    const h = hMin + rnd() * (hMax - hMin);
    for (let y = 0; y < h; y++) {
      const sway = Math.round(Math.sin(y * 0.28 + x) * 2);
      pset(img, x + sway, baseY - y, color);
      if (y % 4 === 2) pset(img, x + sway + (y % 8 < 4 ? 1 : -1), baseY - y, color); // leaf
    }
  }
  // …and a few fan corals.
  for (let x = 22; x < img.w + 20; x += 56 + Math.floor(rnd() * 30)) {
    const r = 4 + rnd() * 5;
    fillDisc(img, x, baseY - 1, r, dark);
    fillRect(img, x - r, baseY - 1, x + r + 1, baseY, color);
  }
  fillRect(img, 0, baseY, img.w, img.h, color);
}

function rooftopsLayer(img, color, hMin, hMax, seed) {
  const rnd = rng(seed);
  const baseY = img.h - 4;
  const window = [255, 190, 120];
  for (let x = 16; x < img.w + 40; x += 38 + Math.floor(rnd() * 26)) {
    const h = hMin + rnd() * (hMax - hMin);
    const wallHalf = 8 + Math.floor(rnd() * 5);
    // Wall, winged pagoda roof (wider than the wall, upturned tips), finial.
    fillRect(img, x - wallHalf, baseY - h, x + wallHalf, baseY, color);
    fillTrap(img, baseY - h - 7, baseY - h, x, 2, wallHalf + 4, color);
    pset(img, x - wallHalf - 4, baseY - h - 1, color); // upturned tips
    pset(img, x + wallHalf + 4, baseY - h - 1, color);
    fillRect(img, x, baseY - h - 10, x + 1, baseY - h - 7, color); // finial
    // A second, lower tier on the taller pagodas.
    if (h > (hMin + hMax) / 2) {
      fillTrap(img, baseY - h * 0.55 - 5, baseY - h * 0.55, x, wallHalf + 1, wallHalf + 5, color);
    }
    // Lit windows: tiny warm pixels — someone is home at dusk.
    for (let i = 0; i < 3; i++) {
      if (rnd() < 0.7) {
        pset(img, x - wallHalf + 2 + Math.floor(rnd() * (wallHalf * 2 - 4)), baseY - 4 - Math.floor(rnd() * (h - 10)), window);
      }
    }
  }
  fillRect(img, 0, baseY, img.w, img.h, color);
}

function snowLayer(img, color, hMin, hMax, seed) {
  const rnd = rng(seed);
  const baseY = img.h - 4;
  const snowCap = [238, 244, 252];
  const dark = darken(color, 0.88);
  for (let x = 0; x < img.w + 60; x += 54 + Math.floor(rnd() * 40)) {
    const h = hMin + rnd() * (hMax - hMin);
    const half = h * (0.55 + rnd() * 0.2);
    fillTrap(img, baseY - h, baseY, x, 0.5, half, color);
    fillTrap(img, baseY - h, baseY - h + Math.max(4, h * 0.22), x, 0.5, half * 0.22, snowCap); // cap
    // Dithered shading on the right face for volume.
    for (let y = Math.round(baseY - h * 0.7); y < baseY; y++) {
      const f = (y - (baseY - h)) / h;
      const edge = x + half * f;
      ditherRect(img, edge - half * f * 0.45, y, edge, y + 1, dark, 255, y % 2);
    }
  }
  fillRect(img, 0, baseY, img.w, img.h, color);
}

function gardenLayer(img, color, hMin, hMax, seed) {
  const rnd = rng(seed);
  const baseY = img.h - 5;
  const dark = darken(color, 0.85);
  const bloom = [196, 110, 140];
  // Clipped hedge runs with rounded tops…
  for (let x = 0; x < img.w + 40; x += 44 + Math.floor(rnd() * 30)) {
    const h = (hMin + rnd() * (hMax - hMin)) * 0.45;
    const w = 16 + Math.floor(rnd() * 14);
    fillRect(img, x, baseY - h, x + w, baseY, color);
    fillDisc(img, x, baseY - h, 4, color); // rounded shoulders
    fillDisc(img, x + w, baseY - h, 4, color);
    ditherRect(img, x, baseY - h * 0.4, x + w, baseY, dark, 255, x % 2);
    if (rnd() < 0.8) pset(img, x + 3 + Math.floor(rnd() * (w - 6)), baseY - h - 1, bloom); // a rose peeking over
  }
  // …slender cypress spires between them…
  for (let x = 20; x < img.w + 20; x += 52 + Math.floor(rnd() * 36)) {
    const h = hMin + rnd() * (hMax - hMin);
    fillTrap(img, baseY - h, baseY, x, 1, 3.5, color);
    fillTrap(img, baseY - h, baseY - h * 0.5, x, 0.5, 2, dark);
  }
  // …and the odd rose arch silhouette.
  for (let x = 40; x < img.w + 20; x += 120 + Math.floor(rnd() * 60)) {
    const h = (hMin + hMax) * 0.32;
    fillRect(img, x - 7, baseY - h, x - 5, baseY, color);
    fillRect(img, x + 5, baseY - h, x + 7, baseY, color);
    fillTrap(img, baseY - h - 4, baseY - h, x, 4, 8, color);
    pset(img, x, baseY - h - 5, bloom);
  }
  fillRect(img, 0, baseY, img.w, img.h, color);
}

function castleLayer(img, color, hMin, hMax, seed) {
  const rnd = rng(seed);
  const baseY = img.h - 4;
  const dark = darken(color, 0.82);
  const gold = [210, 170, 90];
  // Great-hall columns with capitals, joined by arches…
  const step = 56 + Math.floor(rnd() * 10);
  for (let x = 14; x < img.w + step; x += step) {
    const h = hMax;
    fillRect(img, x - 4, baseY - h, x + 4, baseY, color); // shaft
    fillRect(img, x + 2, baseY - h, x + 4, baseY, dark); // shaded side
    fillRect(img, x - 6, baseY - h, x + 6, baseY - h + 3, color); // capital
    fillRect(img, x - 6, baseY - 3, x + 6, baseY, color); // plinth
    // Arch springing to the next column (drawn as a shallow trapezoid bridge).
    fillTrap(img, baseY - h - 6, baseY - h, x + step / 2, step / 2 - 8, step / 2 + 2, color);
  }
  // …with hung banners and torch glints between the columns.
  for (let x = 14 + step / 2; x < img.w + 20; x += step) {
    if (rnd() < 0.75) {
      const bw = 5;
      fillRect(img, x - bw, baseY - hMax + 4, x + bw, baseY - hMax * 0.45, dark);
      fillTrap(img, baseY - hMax * 0.45, baseY - hMax * 0.38, x, bw, 0.5, dark);
      pset(img, x, baseY - hMax + 8, gold); // emblem glint
    }
    if (rnd() < 0.5) pset(img, x, baseY - Math.floor(hMin * 0.5), [255, 196, 90]); // torch
  }
  fillRect(img, 0, baseY, img.w, img.h, color);
}

const LAYER_PAINTERS = {
  forest: forestLayer, coral: coralLayer, rooftops: rooftopsLayer, snow: snowLayer,
  garden: gardenLayer, castle: castleLayer,
};

export function buildMid(themeName) {
  const t = BG_THEMES[themeName];
  const img = newImg(LAYER_W, 120, true); // wrapX: must tile seamlessly at 1920px
  LAYER_PAINTERS[themeName](img, t.far, 38, 78, 0x51 + themeName.length);
  return img;
}

export function buildNear(themeName) {
  const t = BG_THEMES[themeName];
  const img = newImg(LAYER_W, 90, true);
  LAYER_PAINTERS[themeName](img, t.near, 42, 72, 0x91 + themeName.length);
  return img;
}
