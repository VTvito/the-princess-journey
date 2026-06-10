// characters.mjs — pixel-art heroines + clothing skins, authored at 16×24 native
// (×4 → the 64×96 canvas the runtime expects, see src/entities/player.js).
//
// The painter is POSE-PARAMETERIZED: every drawing decision that animation will move
// (head bob, torso lean, leg split, arm swing, hair sway, skirt flare) reads from a pose
// record. Phase 1 emits only the neutral standing pose; Phase 2 will emit multi-frame
// sheets by calling the same painters with a pose per frame — body and skins consume the
// SAME record for the same frame index, so the overlay layers can never drift from the
// body animation.
//
// Anatomy (native y, neutral pose) — the shared contract between body and skin painters:
//   y0-1  crown zone (empty on the body; the crown skin draws here)
//   y2-8  hair + head (eyes y6, blush y7, mouth y8)
//   y9    neck (necklace skin)
//   y10-15 torso (bodice skin covers y10-13)
//   y14-19 skirt zone (skirt skin)
//   y16-20 legs   y21-22 shoes   y23 left for the bottom outline

import { newImg, pset, fillRect, fillTrap, outline } from "./px.mjs";

export const BODY_W = 16;
export const BODY_H = 24;
const CX = 8; // body is symmetric around columns 7-8

const SKIN = [243, 207, 178];
const SKIN_SHADE = [216, 176, 148];
const EYE = [44, 36, 50];
const BLUSH = [233, 150, 160];
const MOUTH = [176, 88, 92];
const OUT = [38, 30, 42]; // shared dark contour so layered art reads as one figure

// The neutral standing pose — the single source every Phase-1 frame uses. Phase 2 varies
// these fields per frame (run cycle, jump tuck, …) without touching the painters.
export const NEUTRAL_POSE = {
  headBob: 0, // +down (px): breathing / run bounce
  lean: 0, // torso lean, +right (px)
  legSplit: 0, // run stride: legs apart by this many px (0 = standing)
  armSwing: 0, // arm offset, +forward (px)
  hairSway: 0, // lock sway, +right (px)
  skirtFlare: 0, // extra skirt hem half-width (px)
};

/**
 * Paint one heroine body on a transparent 16×24 canvas.
 * @param {{hair:number[], top:number[], legs:number[], shoes:number[], hairLen:number,
 *          quilt?:boolean}} look  per-character colors; quilt = puffer-jacket seams (Anna)
 * @param {typeof NEUTRAL_POSE} pose
 */
export function paintHeroine(look, pose = NEUTRAL_POSE) {
  const img = newImg(BODY_W, BODY_H);
  const hb = pose.headBob;
  const lean = pose.lean;
  const hairDark = look.hair.map((v) => Math.round(v * 0.74));
  const topDark = look.top.map((v) => Math.round(v * 0.78));

  // Back hair: side locks falling from the head down to hairLen (style cue per character).
  const lockBot = Math.min(22, look.hairLen);
  fillRect(img, 3 + pose.hairSway, 6 + hb, 5 + pose.hairSway, lockBot, look.hair);
  fillRect(img, 11 + pose.hairSway, 6 + hb, 13 + pose.hairSway, lockBot, look.hair);
  // Shade the inner edge of the locks so they read as behind the body.
  fillRect(img, 4 + pose.hairSway, 10 + hb, 5 + pose.hairSway, lockBot, hairDark);
  fillRect(img, 11 + pose.hairSway, 10 + hb, 12 + pose.hairSway, lockBot, hairDark);

  // Torso (jacket / dress top), y10-15, leaning with the pose.
  fillRect(img, 5 + lean, 10, 11 + lean, 16, look.top);
  if (look.quilt) {
    // Puffer-jacket quilting: darker seam rows — Anna's "piumino carta da zucchero".
    fillRect(img, 5 + lean, 11, 11 + lean, 12, topDark);
    fillRect(img, 5 + lean, 13, 11 + lean, 14, topDark);
  } else {
    fillRect(img, 5 + lean, 14, 11 + lean, 16, topDark); // simple waist shading
  }
  // Arms: sleeves at the torso sides, hands in skin tone.
  const swing = pose.armSwing;
  fillRect(img, 4 + lean - swing, 10, 5 + lean - swing, 14, look.top);
  fillRect(img, 11 + lean + swing, 10, 12 + lean + swing, 14, look.top);
  pset(img, 4 + lean - swing, 14, SKIN);
  pset(img, 11 + lean + swing, 14, SKIN);

  // Legs y16-20 (split by the pose for run frames), shoes y21-22.
  const split = pose.legSplit;
  fillRect(img, 5 - split, 16, 7 - split, 21, look.legs);
  fillRect(img, 9 + split, 16, 11 + split, 21, look.legs);
  fillRect(img, 4 - split, 21, 7 - split, 23, look.shoes);
  fillRect(img, 9 + split, 21, 12 + split, 23, look.shoes);

  // Neck + head (skin), then the hair cap + fringe over it.
  fillRect(img, 7, 9 + hb, 9, 10 + hb, SKIN_SHADE); // neck, slightly shaded
  fillRect(img, 5, 4 + hb, 11, 9 + hb, SKIN); // face block
  fillRect(img, 6, 2 + hb, 10, 4 + hb, look.hair); // hair top
  fillRect(img, 4, 3 + hb, 6, 9 + hb, look.hair); // left frame
  fillRect(img, 10, 3 + hb, 12, 9 + hb, look.hair); // right frame
  fillRect(img, 6, 4 + hb, 10, 5 + hb, look.hair); // fringe over the forehead

  // Face: eyes, blush, a small smile.
  pset(img, 6, 6 + hb, EYE);
  pset(img, 9, 6 + hb, EYE);
  pset(img, 5, 7 + hb, BLUSH);
  pset(img, 10, 7 + hb, BLUSH);
  pset(img, 7, 8 + hb, MOUTH);
  pset(img, 8, 8 + hb, MOUTH);

  outline(img, OUT);
  return img;
}

/**
 * Paint one clothing skin on the same 16×24 canvas, against the same pose, so the child
 * sprite overlays the body exactly (anatomy contract above).
 */
export function paintSkin(kind, color, pose = NEUTRAL_POSE) {
  const img = newImg(BODY_W, BODY_H);
  const dark = color.map((v) => Math.round(v * 0.78));
  const hb = pose.headBob;
  const lean = pose.lean;
  if (kind === "skirt") {
    // Royal skirt: hips → flared hem with a darker band and simple pleats.
    const flare = 5 + pose.skirtFlare;
    fillTrap(img, 15, 20, CX + lean, 2.5, flare, color);
    fillRect(img, CX - flare + lean, 18, CX + flare + 1 + lean, 20, dark); // hem band
    for (let x = CX - flare + 2; x <= CX + flare - 1; x += 3) pset(img, x + lean, 19, color); // pleats
    outline(img, OUT);
  } else if (kind === "bodice") {
    // Elegant bodice over the chest, with a lighter center lacing line.
    fillRect(img, 5 + lean, 10, 11 + lean, 14, color);
    fillRect(img, 5 + lean, 13, 11 + lean, 14, dark);
    pset(img, 7 + lean, 11, dark);
    pset(img, 8 + lean, 12, dark);
    outline(img, OUT);
  } else if (kind === "necklace") {
    // Jewel necklace: a thin band at the neck + a pendant. No outline — at 1px tall a
    // contour would swallow it; the darker pendant pixel gives it depth instead.
    fillRect(img, 6, 9 + hb, 10, 10 + hb, color);
    pset(img, 7, 10 + hb, dark);
    pset(img, 8, 10 + hb, color);
  } else if (kind === "crown") {
    // Royal crown in the reserved y0-2 zone, riding the head bob.
    fillRect(img, 5, 1 + hb, 11, 3 + hb, color);
    pset(img, 5, 0 + hb, color); // three points
    pset(img, 8, 0 + hb, color);
    pset(img, 10, 0 + hb, color);
    pset(img, 7, 1 + hb, [235, 220, 150]); // gem
    outline(img, OUT);
  }
  return img;
}

// Title mark: a bigger gold crown emblem on the same 16×24 canvas (ASSETS.sprites.logo).
export function paintLogo() {
  const img = newImg(BODY_W, BODY_H);
  const gold = [212, 175, 55];
  const goldDark = [168, 134, 36];
  const gem = [235, 220, 150];
  fillRect(img, 3, 14, 13, 18, gold); // band
  fillRect(img, 3, 17, 13, 18, goldDark);
  for (const cx of [4, 8, 12]) fillTrap(img, 9, 14, cx, 0.5, 1.5, gold); // points
  pset(img, 4, 9, gem);
  pset(img, 8, 8, gem);
  pset(img, 12, 9, gem);
  pset(img, 6, 15, gem); // band jewels
  pset(img, 10, 15, gem);
  outline(img, OUT);
  return img;
}

// Per-character looks (mirrors CHARACTERS in src/config.js — Anna keeps the brown wavy
// hair + sky-blue puffer; the others keep their signature palettes and hair lengths).
export const HEROINES = [
  {
    file: "anna.png",
    look: { hair: [92, 60, 40], top: [167, 199, 231], legs: [52, 62, 92], shoes: [235, 238, 242], hairLen: 13, quilt: true },
  },
  {
    file: "sognatrice.png",
    look: { hair: [168, 96, 52], top: [240, 198, 116], legs: [196, 162, 96], shoes: [150, 96, 60], hairLen: 17 },
  },
  {
    file: "avventuriera.png",
    look: { hair: [46, 36, 38], top: [196, 122, 88], legs: [94, 74, 58], shoes: [120, 82, 60], hairLen: 11 },
  },
];

// Skin layer colors (mirrors SKINS order in src/config.js: skirt → bodice → necklace → crown).
export const SKIN_LAYERS = [
  { file: "skirt.png", kind: "skirt", color: [212, 175, 55] },
  { file: "bodice.png", kind: "bodice", color: [231, 150, 173] },
  { file: "necklace.png", kind: "necklace", color: [255, 236, 170] },
  { file: "crown.png", kind: "crown", color: [212, 175, 55] },
];
