// level5.js — "Giardino del Crepuscolo" (commercial upgrade, Livello 5).
// Pure DATA: a tile map + a colour theme; the generic builder (build.js) renders it.
// Level identity: BREEZE columns of drifting petals that carry her across gaps too wide
// to jump (long assisted glides), dusk MOTHS (swoopers) in the hedges, and a one-way
// pergola balcony strung with roses. Legend: see build.js.
//
// Arc: intro (hedge terraces + thorns) → develop (the first breeze crossing) → twist
// (the moth alley, with the pergola balcony riding above it) → climax (a second, wider
// breeze crossing, then the terraced ascent to the moonlit gate).

import { composeMap, arcCollectibles, laneFor, airFor } from "./mapkit.js";

// Taller map (vertical camera follow): 14 rows — extra sky for the pergola + glides.
const H = 14;
const LANE = laneFor(H);
const AIR = airFor(H);

export const LEVEL_5 = {
  id: 5,
  name: "Giardino del Crepuscolo",
  tileSize: 64,

  // Giardino al crepuscolo: cielo viola/rosa, siepi scure, petali alla deriva.
  theme: {
    decor: "garden", // background style (see game.js drawBackground)
    collectibleIcon: "🌹", // HUD icon for the roses (older emoji; renders on Win10)
    collectibleSprite: "rose", // world sprite for the pickup (src/levels/build.js)
    hudText: [255, 238, 248], // HUD/banner text (rosy cream over the dusk sky)
    bg: [44, 24, 58], // violet dusk sky
    bgBand: [120, 60, 100], // pink afterglow near the hedges
    decoFar: [58, 38, 78], // distant garden silhouettes
    decoNear: [44, 30, 62],
    parallaxFar: [70, 48, 92], // distant hedges + cypress (parallax far)
    parallaxNear: [54, 76, 70], // nearer hedge line (parallax near)
    mote: [240, 150, 180], // drifting rose petals (ambient particles)
    solid: [70, 96, 66], // clipped hedge / mossy stone
    solidTop: [150, 190, 110], // lit hedge top
    hazard: [120, 44, 70], // rose-thorn tangle
    hazardTip: [190, 90, 130],
    collectible: [222, 84, 120], // rose bloom
    collectibleAccent: [255, 200, 215],
    collectibleGlow: [255, 170, 200], // rosy aura (also tints the breeze petals)
    enemy: [206, 70, 60], // garden beetle (crab build)
    enemyAccent: [232, 120, 104],
    goal: [230, 150, 200], // moonlit rose-light beam
    // Decor props menu (collider-free scenery; weights drive the procedural mix — build.js).
    props: [
      { key: "deco_rosebush", weight: 3, fg: true },
      { key: "deco_ivyarch", weight: 1 },
      { key: "deco_fountain", weight: 2 },
    ],
  },

  // Authored decor: a fountain greeting the spawn, ivy arches framing two checkpoints,
  // a rose bush by the gate.
  decor: [
    { x: 6, y: LANE, key: "deco_fountain" },
    { x: 34, y: LANE, key: "deco_ivyarch" },
    { x: 84, y: LANE, key: "deco_ivyarch" },
    { x: 122, y: 9, key: "deco_rosebush" },
  ],

  map: composeMap({
    width: 124,
    height: H,
    ravines: [
      { x: 18, w: 2 }, // intro: a plain jumpable gap
      { x: 40, w: 4 }, // develop: too wide to jump — the breeze carries her
      { x: 68, w: 2 }, // twist: gap in the moth alley
      { x: 88, w: 5 }, // climax: the great glide
    ],
    // Hedge terraces: one in the intro, then the two-step ascent to the gate.
    terraces: [
      { x: 24, w: 6, h: 1 },
      { x: 102, w: 5, h: 1 },
      { x: 107, w: 17, h: 2 },
    ],
    // The pergola step: bot-invisible (3 cells up — out of its step probe), human-jumpable
    // via a double hop. Leads onto the one-way balcony above the moth alley.
    platforms: [{ x: 59, y: 9, w: 1 }],
    semisolids: [{ x: 61, y: 7, w: 10 }],
    items: [
      { x: 2, y: LANE, ch: "@" },
      { x: 120, y: 9, ch: ">" }, // goal on the upper garden terrace
      // Breeze columns filling the two wide crossings (rows above the gaps).
      ...[40, 41, 42, 43].flatMap((x) => [8, 9, 10, 11].map((y) => ({ x, y, ch: "B" }))),
      ...[88, 89, 90, 91, 92].flatMap((x) => [7, 8, 9, 10, 11].map((y) => ({ x, y, ch: "B" }))),
      // Checkpoints: clean run-up ahead of each (no hazard within ~4 cells, no springs).
      // Thinned out (a death now costs more progress): the pre-climb x100 flag is gone, so
      // the climax glide is banked only at x84.
      { x: 34, y: LANE, ch: "F" },
      { x: 56, y: LANE, ch: "F" },
      { x: 84, y: LANE, ch: "F" },
      // Rose-thorn tangles: intro, terrace edges (room to accelerate), pre-climb.
      { x: 12, y: LANE, ch: "^" },
      { x: 29, y: 10, ch: "^" }, // far edge of the intro hedge
      { x: 98, y: LANE, ch: "^" }, // clear of the glide's landing zone (x93-95)
      { x: 106, y: 10, ch: "^" }, // far edge of the first garden step
      // Dusk moths haunting the twist alley (they dive when she comes close); the second is
      // an ARMORED moth (2 hp) — a tougher guard over the pergola bonus below.
      { x: 62, y: 8, ch: "g" },
      { x: 74, y: 8, ch: "S" },
      // Garden beetles patrolling the open stretches.
      { x: 50, y: LANE, ch: "c" },
      { x: 80, y: LANE, ch: "c" },
      { x: 114, y: 9, ch: "c" }, // on the upper terrace, guarding the gate
      // Star power-up before the moth alley.
      { x: 58, y: LANE, ch: "*" },
      ...arcCollectibles([6, 15, 22, 32, 46, 52, 64, 72, 78, 86, 95], [AIR, LANE - 1]),
      // Roses floating inside the breeze currents — grabbed mid-glide.
      { x: 41, y: 9, ch: "o" },
      { x: 43, y: 8, ch: "o" },
      { x: 89, y: 9, ch: "o" },
      { x: 90, y: 7, ch: "o" },
      { x: 91, y: 8, ch: "o" },
      // The pergola balcony's rose trail (a one-way bonus route, bot-invisible).
      { x: 62, y: 6, ch: "o" },
      { x: 65, y: 6, ch: "o" },
      { x: 68, y: 6, ch: "o" },
      // REMIX (Fase 2): a feather on the balcony, then a rose stash three cells higher —
      // out of a normal jump's reach, so only the feather's high-jump claims it (all while
      // the armored moth haunts the alley below). Off the critical path → bot unaffected.
      { x: 66, y: 6, ch: "+" },
      { x: 64, y: 3, ch: "o" },
      { x: 67, y: 3, ch: "o" },
      // The terraced ascent pays out too.
      { x: 104, y: 9, ch: "o" },
      { x: 109, y: 8, ch: "o" },
      { x: 113, y: 8, ch: "o" },
      { x: 117, y: 8, ch: "o" },
    ],
  }),
};
