// world.mjs — pixel-art tiles, collectibles, enemies and the goal portal.
//
// Tiles and the portal are drawn in NEUTRAL GREYS (4-tone ramp + dither) and tinted at
// runtime with k.color(theme.x) by src/levels/build.js — the multiplicative tint keeps the
// baked shading, so one atlas serves all four themes (same contract as before).
//
// New in the pixel pass: ground-top/fill VARIANTS (so long runs don't repeat visibly),
// L/R EDGE CAPS (so terrace ends read as carved, not sliced), and a separate GRASS CAP
// frame (transparent overlay with blades, tinted theme.solidTop) that replaces the old
// flat 7px lip rect while keeping the bright two-tone surface look.
//
// Native sizes (×4 at export): tiles 16×16, collectibles 12×12 (→48), crab 16×10 (→64×40),
// flyer 12×8 (→48×32), portal 24×40 (→96×160) — all matching the old runtime dimensions.

import {
  newImg, pset, fillRect, fillDisc, fillTrap, blit,
  darken, lighten, ramp, speckle, ditherRect, outline,
} from "./px.mjs";

const T = 16; // native tile size
const OUT = [38, 30, 42];

// Neutral grey ramp (tinted theme.solid / theme.hazard / theme.goal at runtime).
const G = ramp([196, 196, 196]);
// Grass-cap greys are near-white so the theme.solidTop tint comes through at full strength.
const GRASS_HI = [242, 242, 242];
const GRASS = [212, 212, 212];

// --- ground tiles --------------------------------------------------------------

function dirtBase(seed) {
  const img = newImg(T, T);
  fillRect(img, 0, 0, T, T, G.lo);
  speckle(img, 0, 0, T, T, G.lo2, 0.12, seed);
  speckle(img, 0, 0, T, T, G.base, 0.05, seed * 3 + 1);
  return img;
}

function tileGroundTop(seed, stone = false) {
  const img = dirtBase(seed);
  fillRect(img, 0, 0, T, 1, G.base); // light seam where the grass cap meets the dirt
  if (stone) {
    fillRect(img, 9, 9, 12, 11, G.base); // a small buried stone
    fillRect(img, 9, 11, 12, 12, G.lo2);
  }
  return img;
}

function tileGroundEdge(side, seed) {
  const img = tileGroundTop(seed);
  const x = side === "l" ? 0 : T - 1;
  fillRect(img, x, 0, x + 1, T, G.lo2); // carved dark edge on the exposed side
  return img;
}

function tileGroundFill(seed, stone = false) {
  const img = newImg(T, T);
  fillRect(img, 0, 0, T, T, G.lo);
  speckle(img, 0, 0, T, T, G.lo2, 0.16, seed);
  speckle(img, 0, 0, T, T, G.base, 0.04, seed * 5 + 3);
  fillRect(img, 3, 6, 7, 7, G.lo2); // short strata dashes for a hand-set look
  fillRect(img, 10, 12, 14, 13, G.lo2);
  if (stone) {
    fillRect(img, 5, 9, 9, 12, G.base);
    fillRect(img, 5, 11, 9, 12, G.lo2);
    pset(img, 5, 9, G.hi);
  }
  return img;
}

// Floating slab: top surface at y0 (so the standing line matches the collider top), body
// with a shaded underside, transparent lower half. Spans full width so 2-cell platforms
// join seamlessly; the grass cap overlays y0 like on ground tops.
function tilePlatform() {
  const img = newImg(T, T);
  fillRect(img, 0, 0, T, 1, G.hi);
  fillRect(img, 0, 1, T, 7, G.lo);
  speckle(img, 0, 2, T, 7, G.lo2, 0.1, 5);
  fillRect(img, 0, 7, T, 9, G.lo2); // shaded underside
  pset(img, 0, 8, [0, 0, 0], 0); // nicked bottom corners so the slab reads rounded
  pset(img, T - 1, 8, [0, 0, 0], 0);
  return img;
}

// --- hazards ---------------------------------------------------------------------

// Three chunky spikes on a low base; content sits in the lower 3/4 of the cell so the
// bottom-anchored child sprite in build.js keeps the old visual extent.
function tileHazardSpike() {
  const img = newImg(T, T);
  fillRect(img, 1, 13, T - 1, T, G.lo);
  speckle(img, 1, 13, T - 1, T, G.lo2, 0.2, 9);
  for (const cx of [3, 8, 13]) {
    fillTrap(img, 5, 13, cx, 0.5, 2.5, G.base);
    pset(img, cx, 5, G.hi); // bright tip
    pset(img, cx, 6, G.hi);
  }
  outline(img, G.lo2);
  return img;
}

function tileHazardIcicle() {
  const img = newImg(T, T);
  fillRect(img, 1, 0, T - 1, 2, G.lo); // ceiling attachment
  fillTrap(img, 2, 15, 8, 5.5, 0.5, G.base);
  fillTrap(img, 2, 9, 6, 1.5, 0.5, G.hi); // glossy streak
  outline(img, G.lo2);
  return img;
}

// --- grass caps --------------------------------------------------------------------

// Transparent overlay tinted theme.solidTop: blades on the very top, a lit band, then a
// dithered fade into the dirt below. Two variants so long surfaces don't repeat.
function tileGrassCap(bladeXs, phase) {
  const img = newImg(T, T);
  for (const x of bladeXs) pset(img, x, 0, GRASS);
  fillRect(img, 0, 1, T, 2, GRASS_HI);
  fillRect(img, 0, 2, T, 3, GRASS);
  ditherRect(img, 0, 3, T, 4, GRASS, 255, phase);
  return img;
}

// --- tile atlas ---------------------------------------------------------------------

// Order defines the x-offsets in assets/tilesets/tileset.png — keep in sync with
// ASSETS.tiles.frames in src/config.js.
export const TILE_FRAMES = [
  "ground_top", "ground_top_2", "ground_top_l", "ground_top_r",
  "ground_fill", "ground_fill_2", "platform",
  "hazard_spike", "hazard_icicle",
  "grass_cap", "grass_cap_2",
];

export function buildTileAtlas() {
  const frames = {
    ground_top: tileGroundTop(7),
    ground_top_2: tileGroundTop(31, true),
    ground_top_l: tileGroundEdge("l", 13),
    ground_top_r: tileGroundEdge("r", 17),
    ground_fill: tileGroundFill(11),
    ground_fill_2: tileGroundFill(29, true),
    platform: tilePlatform(),
    hazard_spike: tileHazardSpike(),
    hazard_icicle: tileHazardIcicle(),
    grass_cap: tileGrassCap([1, 4, 7, 10, 13], 0),
    grass_cap_2: tileGrassCap([2, 6, 9, 12, 14], 1),
  };
  const atlas = newImg(T * TILE_FRAMES.length, T);
  TILE_FRAMES.forEach((name, i) => blit(atlas, frames[name], i * T, 0));
  return atlas;
}

// --- collectibles (12×12 native, natural colors + dark contour) ----------------------

const C = 12;

export function paintApple() {
  const img = newImg(C, C);
  const red = [210, 64, 60];
  fillDisc(img, 5.5, 7, 3.4, red);
  fillDisc(img, 7.5, 7, 3, darken(red, 0.84)); // second lobe, shaded
  pset(img, 4, 5, lighten(red, 1.45)); // sheen
  pset(img, 5, 5, lighten(red, 1.45));
  fillRect(img, 6, 2, 7, 4, [96, 64, 42]); // stem
  fillRect(img, 7, 2, 9, 3, [120, 178, 96]); // leaf
  outline(img, OUT);
  return img;
}

export function paintPearl() {
  const img = newImg(C, C);
  const cream = [236, 240, 250];
  fillDisc(img, 6, 6, 3.6, cream);
  fillDisc(img, 7, 7, 2.6, [202, 206, 228]); // cool shadow
  fillDisc(img, 6, 6, 2.4, cream);
  pset(img, 4, 4, [255, 255, 255]); // bright highlight
  pset(img, 5, 4, [255, 255, 255]);
  outline(img, OUT);
  return img;
}

export function paintLantern() {
  const img = newImg(C, C);
  const warm = [255, 196, 84];
  const frame = [120, 40, 40];
  pset(img, 5, 0, frame); // hook
  pset(img, 6, 0, frame);
  fillRect(img, 4, 1, 8, 2, frame); // top cap
  fillTrap(img, 2, 9, 5.5, 2, 3, warm); // glowing body
  fillRect(img, 5, 4, 7, 6, lighten(warm, 1.3)); // inner glow
  fillRect(img, 3, 9, 9, 10, frame); // bottom cap
  outline(img, OUT);
  return img;
}

export function paintCrystal() {
  const img = newImg(C, C);
  const cyan = [96, 214, 226];
  fillTrap(img, 1, 5, 5.5, 1, 3.5, cyan);
  fillTrap(img, 5, 11, 5.5, 3.5, 0.5, darken(cyan, 0.82));
  fillTrap(img, 2, 5, 4, 0.5, 1.5, lighten(cyan, 1.35)); // lit facet
  pset(img, 5, 6, lighten(cyan, 1.2)); // center sparkle
  outline(img, OUT);
  return img;
}

// --- enemies (natural colors + contour) -----------------------------------------------

export function paintCrab() {
  const img = newImg(16, 10);
  const body = [206, 70, 60];
  const claw = [232, 120, 104];
  fillDisc(img, 8, 5, 4.4, body); // shell
  fillRect(img, 4, 4, 12, 8, body);
  fillRect(img, 4, 7, 12, 8, darken(body, 0.78)); // shaded underside
  fillRect(img, 1, 3, 3, 5, claw); // claws
  fillRect(img, 13, 3, 15, 5, claw);
  for (const lx of [4, 6, 9, 11]) pset(img, lx, 8, darken(body, 0.7)); // legs
  pset(img, 6, 2, [255, 255, 255]); // eyes
  pset(img, 10, 2, [255, 255, 255]);
  pset(img, 6, 3, [20, 20, 20]);
  pset(img, 10, 3, [20, 20, 20]);
  outline(img, OUT);
  return img;
}

export function paintFlyer() {
  const img = newImg(12, 8);
  const body = [44, 40, 60];
  const wing = [26, 24, 40];
  fillDisc(img, 6, 4, 2.4, body);
  fillRect(img, 0, 2, 4, 4, wing); // spread wings, tips raised
  fillRect(img, 8, 2, 12, 4, wing);
  pset(img, 1, 1, wing);
  pset(img, 10, 1, wing);
  pset(img, 7, 3, [255, 255, 255]); // eye
  outline(img, [120, 116, 140]); // light contour — the body is already near-black
  return img;
}

// --- goal portal (24×40 native, neutral grey, tinted theme.goal) ------------------------

export function paintPortal() {
  const img = newImg(24, 40);
  // Pillars with brick seams + a lit inner edge.
  for (const [x0, x1] of [[1, 6], [18, 23]]) {
    fillRect(img, x0, 6, x1, 40, G.lo);
    for (let y = 10; y < 40; y += 5) fillRect(img, x0, y, x1, y + 1, G.lo2);
    fillRect(img, x0 === 1 ? 5 : 18, 6, x0 === 1 ? 6 : 19, 40, G.base);
  }
  // Arched crown.
  fillTrap(img, 0, 6, 11.5, 4.5, 11, G.lo);
  fillTrap(img, 0, 2, 11.5, 4.5, 6.5, G.hi);
  // Inner gateway glow: bright dither fading with depth (tinted, it shimmers in theme.goal).
  ditherRect(img, 6, 6, 18, 16, G.hi, 255, 0);
  ditherRect(img, 6, 16, 18, 28, G.base, 255, 1);
  ditherRect(img, 7, 28, 17, 38, G.lo, 255, 0);
  outline(img, G.lo2);
  return img;
}
