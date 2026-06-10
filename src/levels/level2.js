// level2.js — "Abissi di Corallo" (spec §4, Livello 2).
// Pure DATA: a tile map + a colour theme; the generic builder (build.js) renders it.
// Level identity: MOVING jellyfish platforms over wide gaps + an UPDRAFT shaft, with
// patrolling crabs between them. Legend: see build.js.
//
// Arc: intro (basics + a spring-served bonus reef) → develop (the first moving platform
// — wait for it, ride it) → twist (a second, faster mover + crab pressure) → climax
// (a current of rising water carries her up and over the last chasm).

import { composeMap, arcCollectibles, LANE } from "./mapkit.js";

export const LEVEL_2 = {
  id: 2,
  name: "Abissi di Corallo",
  tileSize: 64,

  // Sottomarino: bolle, blu e corallo (spec §4).
  theme: {
    decor: "coral", // background style (see game.js drawBackground)
    collectibleIcon: "🐚", // HUD icon for the pearls (older emoji; 🫧 is tofu on Win10)
    collectibleSprite: "pearl", // world sprite for the pickup (src/levels/build.js)
    bg: [10, 34, 70], // deep water
    bgBand: [20, 52, 96], // lighter water near the seabed
    decoFar: [190, 100, 110], // distant coral silhouettes
    decoNear: [150, 78, 92], // nearer coral silhouettes
    parallaxFar: [78, 70, 120], // distant reef ridge (indigo, parallax far)
    parallaxNear: [42, 86, 118], // nearer reef mound (teal, parallax near)
    solid: [54, 92, 116], // coral rock platform fill
    solidTop: [98, 150, 168], // lighter rocky rim
    hazard: [80, 40, 110], // sea urchin body
    hazardTip: [150, 90, 190], // urchin spikes
    collectible: [235, 240, 250], // pearl
    collectibleAccent: [255, 255, 255], // pearl highlight
    collectibleGlow: [130, 225, 235], // aqua shimmer behind the pearl (juiciness)
    enemy: [206, 70, 60], // crab shell
    enemyAccent: [232, 120, 104], // crab claws
    goal: [120, 220, 230], // aqua light beam
  },

  // Jellyfish platforms gliding over the two wide chasms. Ranges are tuned so the right
  // extreme lands flush on the far edge (ride on, walk off — no leap of faith).
  movers: [
    { x: 39, y: LANE, w: 2, dx: 2, period: 4 },
    { x: 71, y: LANE, w: 2, dx: 2, period: 3.6, phase: 2 },
  ],

  map: composeMap({
    width: 120,
    ravines: [
      { x: 20, w: 2 }, // intro: a plain jumpable gap
      { x: 40, w: 3 }, // develop: too wide to jump — ride the jellyfish
      { x: 72, w: 3 }, // twist: the second, off-phase jellyfish
      { x: 88, w: 3 }, // climax: the updraft shaft (the current carries her over)
    ],
    // Spring-served bonus reef: launch at x26, pearls on a one-way ledge above.
    semisolids: [{ x: 24, y: 5, w: 5 }],
    items: [
      { x: 2, y: LANE, ch: "@" },
      { x: 116, y: LANE, ch: ">" },
      // The updraft: a column of rising water filling the climax shaft.
      ...[88, 89, 90].flatMap((x) => [5, 6, 7, 8, 9].map((y) => ({ x, y, ch: "w" }))),
      { x: 26, y: LANE, ch: "M" }, // spring up to the bonus reef
      // Checkpoints: after the first ride, before the shaft.
      { x: 46, y: LANE, ch: "F" },
      { x: 84, y: LANE, ch: "F" },
      // Urchins on the lane, clear of gap edges and crab patrols.
      { x: 14, y: LANE, ch: "^" },
      { x: 34, y: LANE, ch: "^" },
      { x: 60, y: LANE, ch: "^" },
      { x: 104, y: LANE, ch: "^" },
      // Crabs patrolling the stretches between set-pieces.
      { x: 30, y: LANE, ch: "c" },
      { x: 52, y: LANE, ch: "c" },
      { x: 76, y: LANE, ch: "c" },
      { x: 100, y: LANE, ch: "c" },
      // Star power-up mid-level — plough through the twist's crab pressure.
      { x: 64, y: LANE, ch: "*" },
      ...arcCollectibles([8, 16, 21, 32, 44, 50, 58, 66, 78, 86, 96, 102, 110]),
      // Bonus pearls: the spring reef, over each jellyfish ride, inside the updraft.
      { x: 25, y: 4, ch: "o" },
      { x: 26, y: 4, ch: "o" },
      { x: 27, y: 4, ch: "o" },
      { x: 41, y: 5, ch: "o" },
      { x: 73, y: 5, ch: "o" },
      { x: 89, y: 6, ch: "o" },
      { x: 89, y: 4, ch: "o" },
    ],
  }),
};
