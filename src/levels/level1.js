// level1.js — "Foresta Incantata" (spec §4, Livello 1 — the tutorial).
// Pure DATA: a tile map + a colour theme. The generic builder in build.js turns this
// into game objects. Legend: see build.js.
//
// Arc (intro → develop → twist → climax):
//   • intro (x0–25): flat run, first thorn, first ravine — the basics;
//   • develop (x26–50): the SPRING is introduced under a visible bonus perch, then a
//     bridged ravine and the star; a checkpoint banks the progress;
//   • twist (x51–63): a spring launches the heroine onto a one-way high route that
//     carries her over a double ravine (the critical path itself goes airborne);
//   • climax (x86–119): a terraced climb (1 then 2 cells) to a goal with a view.
// Checkpoints at x49 and x88 keep retries kind — deaths still cost 500 Coccoline.

import { composeMap, arcCollectibles, LANE } from "./mapkit.js";

export const LEVEL_1 = {
  id: 1,
  name: "Foresta Incantata",
  tileSize: 64,

  // Bosco magico: verde scuro, alberi alti (spec §4).
  theme: {
    decor: "forest", // background style (see game.js drawBackground)
    collectibleIcon: "🍎", // HUD icon for the golden apples
    collectibleSprite: "apple", // world sprite for the pickup (src/levels/build.js)
    bg: [20, 44, 38], // deep forest backdrop
    bgBand: [30, 62, 52], // lighter haze near the ground
    decoFar: [27, 56, 47], // distant tree silhouettes
    decoNear: [22, 49, 41], // nearer tree silhouettes
    parallaxFar: [34, 66, 54], // distant misty hills (parallax far layer)
    parallaxNear: [50, 90, 66], // nearer rolling hills (parallax near layer)
    mote: [206, 230, 150], // floating fireflies / pollen (enchanted-forest ambience)
    solid: [74, 104, 60], // mossy earth/platform fill
    solidTop: [122, 178, 94], // bright grassy top accent
    hazard: [122, 38, 58], // bramble body
    hazardTip: [170, 62, 84], // bramble spikes
    collectible: [212, 175, 55], // golden apple
    collectibleAccent: [255, 240, 200], // apple highlight
    collectibleGlow: [255, 236, 170], // warm aura behind the apple (juiciness)
    leaf: [126, 178, 96], // apple leaf (forest only)
  },

  map: composeMap({
    width: 120,
    ravines: [
      { x: 22, w: 2 }, // intro: one clean, jumpable gap
      { x: 46, w: 2 }, // develop: bridged at the lane (landing practice)
      { x: 58, w: 2 }, // twist: double gap crossed on the high route
      { x: 62, w: 2 },
    ],
    // Climax: the ground itself rises — a one-cell step, then a two-cell summit.
    terraces: [
      { x: 94, w: 8, h: 1 },
      { x: 102, w: 18, h: 2 },
    ],
    platforms: [
      { x: 46, y: LANE, w: 2 }, // stepping-bridge over the develop ravine
      { x: 27, y: 4, w: 3 }, // bonus perch above the first spring
    ],
    // One-way high route: launched onto by the spring at x52, carries over both twist
    // ravines, drops back to the lane safely past them (landing ≈ x64, solid ground).
    semisolids: [{ x: 52, y: 4, w: 10 }],
    items: [
      { x: 2, y: LANE, ch: "@" }, // spawn
      { x: 117, y: 6, ch: ">" }, // goal on the summit terrace (walk row 6)
      // Springs: the bonus one (perch above), then the critical-path launcher.
      { x: 29, y: LANE, ch: "M" },
      { x: 52, y: LANE, ch: "M" },
      // Checkpoints: before the twist, before the climb.
      { x: 49, y: LANE, ch: "F" },
      { x: 88, y: LANE, ch: "F" },
      // Thorns: one per stretch, clear of ravine edges and spring landings.
      { x: 12, y: LANE, ch: "^" },
      { x: 36, y: LANE, ch: "^" },
      { x: 76, y: LANE, ch: "^" },
      { x: 82, y: LANE, ch: "^" },
      { x: 98, y: 7, ch: "^" }, // on the first terrace's surface
      // Star power-up on the lane: a taste of invincibility before the twist.
      { x: 40, y: LANE, ch: "*" },
      // Apples along the run (rows 6–7, grabbed mid-jump).
      ...arcCollectibles([8, 16, 23, 32, 44, 68, 72, 80, 86]),
      // Bonus apples: the spring perch, the high route, and the climb.
      { x: 27, y: 3, ch: "o" },
      { x: 28, y: 3, ch: "o" },
      { x: 29, y: 3, ch: "o" },
      { x: 55, y: 3, ch: "o" },
      { x: 57, y: 3, ch: "o" },
      { x: 59, y: 3, ch: "o" },
      { x: 97, y: 6, ch: "o" },
      { x: 100, y: 6, ch: "o" },
      { x: 106, y: 5, ch: "o" },
      { x: 110, y: 5, ch: "o" },
      { x: 114, y: 5, ch: "o" },
    ],
  }),
};
