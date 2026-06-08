// level2.js — "Abissi di Corallo" (spec §4, Livello 2).
// Same data-driven shape as level1.js; the generic builder (build.js) renders it.
// New tile this level: "c" = a crab enemy that patrols horizontally.
//
// Tile legend:  "=" coral rock   "^" riccio di mare (urchin, hazard)   "o" perla
//               "c" granchio (crab enemy)   "@" spawn   ">" goal   " " water/ravine

export const LEVEL_2 = {
  id: 2,
  name: "Abissi di Corallo",
  tileSize: 64,

  // Sottomarino: bolle, blu e corallo (spec §4).
  theme: {
    decor: "coral", // background style (see game.js drawBackground)
    collectibleIcon: "🐚", // HUD icon for the pearls (older emoji; 🫧 is tofu on Win10)
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

  map: [
    "", // 0
    "", // 1
    "", // 2
    "", // 3
    "", // 4
    "", // 5
    "      o             o           o", // 6  pearls (grabbed mid-jump)
    "          o             o         o", // 7  pearls along the lane
    "  @   ^            c           ^     >", // 8  spawn, urchin, crab, urchin, goal
    "============  ============  ============", // 9  coral floor (gaps = ravines)
    "============  ============  ============", // 10 coral floor
  ],
};
