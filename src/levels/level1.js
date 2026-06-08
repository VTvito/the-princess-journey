// level1.js — "Foresta Incantata" (spec §4, Livello 1).
// Pure DATA: a tile map + a colour theme. The generic builder in build.js turns this
// into game objects, so adding levels 2–4 later means adding sibling files like this one
// — no new rendering/collision code.
//
// Tile legend (one char per 64px cell):
//   "="  solid platform / ground (static collider)
//   "^"  rovi spinosi (thorns) — hazard; touching it respawns the player
//   "o"  Mela d'oro (golden apple) — collectible
//   "@"  player spawn point
//   ">"  level goal (end-of-level marker)
//   " "  empty air  (a "burrone"/ravine is just a gap in the ground rows)
//
// The map is 40 cells wide (≈2 screens) and 11 tall (≈one screen high). The heroine is
// ~1.5 cells tall, so her running lane (rows 8–9) is kept clear of overhead solids — the
// only platforms are the ground. Collectibles float at rows 6–7 and are grabbed mid-jump.
// Hazards sit one-per-segment, well clear of the ravine edges so a hazard-hop never
// overshoots into a gap (tuned for the snappy arc in config.PHYSICS).

export const LEVEL_1 = {
  id: 1,
  name: "Foresta Incantata",
  tileSize: 64,

  // Bosco magico: verde scuro, alberi alti (spec §4).
  theme: {
    decor: "forest", // background style (see game.js drawBackground)
    collectibleIcon: "🍎", // HUD icon for the golden apples
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

  map: [
    "", // 0
    "", // 1
    "", // 2
    "", // 3
    "", // 4
    "", // 5
    "      o           o             o", // 6  apples (grabbed mid-jump)
    "          o             o          o", // 7  apples along the lane
    "  @   ^           ^             ^    >", // 8  spawn, thorns, goal
    "============  ============  ============", // 9  ground (gaps = ravines)
    "============  ============  ============", // 10 ground
  ],
};
