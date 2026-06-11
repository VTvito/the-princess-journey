// decor.mjs — collider-free scenery props, three per level theme.
//
// Unlike tiles (neutral grey, tinted at runtime), props are painted in NATURAL theme
// colors like the collectibles/enemies — scenery reads richer with real hues than with a
// single multiplicative tint. Each prop is a single transparent PNG, bottom of the image
// = the prop's base (build.js places them with k.anchor("bot") on ground-top cells).
//
// Native sizes (×4 at export): kept within 1-2 tiles (16-32px native) so props dress the
// world without hiding gameplay. All painting is deterministic — same input, same bytes.

import {
  newImg, pset, fillRect, fillDisc, fillTrap,
  darken, lighten, speckle, ditherRect, outline,
} from "./px.mjs";

const OUT = [38, 30, 42];

// --- forest -----------------------------------------------------------------------

// A broad-leaf tree: 2 tiles tall, lobed canopy with a lit crown over a flared trunk.
function paintTree() {
  const img = newImg(24, 30);
  const trunk = [110, 78, 48];
  const leaf = [58, 112, 62];
  fillRect(img, 10, 15, 14, 29, trunk);
  fillRect(img, 13, 15, 14, 29, darken(trunk, 0.78)); // shaded side
  fillRect(img, 8, 27, 10, 29, darken(trunk, 0.85)); // root flare
  fillRect(img, 14, 27, 16, 29, darken(trunk, 0.85));
  fillDisc(img, 6.5, 12, 5, darken(leaf, 0.88)); // side lobes first (canopy overlaps them)
  fillDisc(img, 17.5, 12, 5, darken(leaf, 0.88));
  fillDisc(img, 12, 12.5, 6, leaf);
  fillDisc(img, 12, 8, 7, leaf);
  fillDisc(img, 10, 6, 3.4, lighten(leaf, 1.25)); // lit crown
  speckle(img, 5, 5, 19, 15, darken(leaf, 0.8), 0.08, 41); // leafy texture
  outline(img, OUT);
  return img;
}

// A storybook toadstool — red cap, white dots.
function paintMushroom() {
  const img = newImg(10, 9);
  const cap = [196, 70, 64];
  const stem = [238, 226, 205];
  fillRect(img, 4, 4, 7, 8, stem);
  fillRect(img, 6, 4, 7, 8, darken(stem, 0.85));
  fillTrap(img, 1, 5, 5, 2, 4.5, cap);
  pset(img, 3, 2, [255, 235, 235]); // dots
  pset(img, 6, 3, [255, 235, 235]);
  outline(img, OUT);
  return img;
}

// A small fern: three upright blades, the centre one taller and lit at the tip.
function paintFern() {
  const img = newImg(12, 9);
  const green = [96, 158, 86];
  fillTrap(img, 3, 9, 2.5, 0.5, 1.2, darken(green, 0.85));
  fillTrap(img, 3, 9, 9.5, 0.5, 1.2, darken(green, 0.85));
  fillTrap(img, 1, 9, 6, 0.5, 1.4, green);
  pset(img, 6, 1, lighten(green, 1.3));
  outline(img, OUT);
  return img;
}

// --- coral -----------------------------------------------------------------------

// A fan coral: pink blade opening upward, dark ribs, rooted on a holdfast.
function paintCoralFan() {
  const img = newImg(14, 12);
  const pink = [226, 110, 130];
  fillTrap(img, 1, 10, 7, 6, 1.5, pink);
  for (const rx of [4, 7, 10]) fillRect(img, rx, 2, rx + 1, 6, darken(pink, 0.8)); // ribs
  fillRect(img, 5, 10, 9, 12, darken(pink, 0.7)); // holdfast
  pset(img, 3, 1, lighten(pink, 1.25));
  outline(img, OUT);
  return img;
}

// A kelp strand: a sinuous stalk with a few lit leaves (sways at runtime — build.js).
function paintKelp() {
  const img = newImg(8, 18);
  const green = [62, 132, 96];
  for (let y = 1; y < 18; y++) {
    const x = 3 + Math.sin(y * 0.7) * 1.5;
    fillRect(img, x, y, x + 2, y + 1, green);
  }
  for (const [lx, ly] of [[1, 4], [5, 8], [1, 12]]) {
    fillRect(img, lx, ly, lx + 2, ly + 1, lighten(green, 1.2)); // leaves
  }
  outline(img, OUT);
  return img;
}

// A scallop shell resting on the seabed, ridges fanning from the hinge.
function paintShell() {
  const img = newImg(10, 7);
  const cream = [240, 222, 200];
  fillTrap(img, 1, 6, 5, 4, 1, cream);
  for (const rx of [3, 5, 7]) pset(img, rx, 2, darken(cream, 0.82)); // ridges
  fillRect(img, 4, 5, 7, 7, darken(cream, 0.75)); // hinge
  pset(img, 3, 1, [255, 248, 240]);
  outline(img, OUT);
  return img;
}

// --- rooftops ----------------------------------------------------------------------

// A street lantern: dark wooden post with a warm paper lantern hanging from the arm.
function paintLanternPost() {
  const img = newImg(10, 22);
  const wood = [70, 48, 52];
  const warm = [255, 196, 84];
  fillRect(img, 2, 2, 4, 21, wood); // post
  fillRect(img, 2, 2, 8, 3, wood); // arm
  fillRect(img, 6, 4, 8, 5, darken(warm, 0.5)); // lantern cap
  fillTrap(img, 5, 10, 7, 1.5, 2, warm); // glowing body
  fillRect(img, 6, 6, 7, 8, lighten(warm, 1.3)); // inner glow
  fillRect(img, 5, 10, 9, 11, darken(warm, 0.5)); // bottom cap
  fillRect(img, 1, 20, 5, 21, darken(wood, 0.8)); // base
  outline(img, OUT);
  return img;
}

// A swallow-tailed festival banner on a crossbar, gold emblem at the heart.
function paintBanner() {
  const img = newImg(12, 18);
  const pole = [88, 60, 56];
  const cloth = [170, 50, 60];
  fillRect(img, 1, 1, 11, 2, pole); // crossbar
  fillRect(img, 3, 2, 9, 13, cloth);
  fillRect(img, 8, 2, 9, 13, darken(cloth, 0.8)); // shaded edge
  fillRect(img, 3, 13, 5, 16, cloth); // swallow tails
  fillRect(img, 7, 13, 9, 16, cloth);
  fillDisc(img, 5.5, 6, 1.6, [212, 175, 55]); // gold emblem
  outline(img, OUT);
  return img;
}

// A brick chimney with a rim and a wisp of smoke.
function paintChimney() {
  const img = newImg(10, 12);
  const brick = [140, 80, 64];
  fillRect(img, 2, 3, 8, 12, brick);
  fillRect(img, 1, 1, 9, 3, darken(brick, 0.8)); // rim
  for (let y = 5; y < 12; y += 3) fillRect(img, 2, y, 8, y + 1, darken(brick, 0.85)); // seams
  pset(img, 4, 0, [200, 200, 210]); // smoke wisp
  pset(img, 5, 0, [200, 200, 210]);
  outline(img, OUT);
  return img;
}

// --- snow -------------------------------------------------------------------------

// A snowy pine: three green tiers with snow on the shoulders, 2 tiles tall.
function paintPine() {
  const img = newImg(16, 26);
  const green = [44, 96, 72];
  const snow = [240, 248, 255];
  const trunk = [96, 70, 50];
  fillRect(img, 7, 21, 10, 26, trunk);
  fillTrap(img, 13, 21, 8, 3, 7.5, green); // bottom tier
  fillTrap(img, 8, 16, 8, 2, 6.5, green); // mid tier
  fillTrap(img, 2, 10, 8, 1, 5, green); // top tier
  fillTrap(img, 2, 5, 8, 1, 2.5, snow); // snow cap
  fillRect(img, 5, 10, 12, 11, snow); // ledge snow between tiers
  fillRect(img, 3, 16, 13, 17, snow);
  outline(img, OUT);
  return img;
}

// A soft snowdrift mound (low — a foreground accent that never hides the heroine).
function paintSnowdrift() {
  const img = newImg(16, 6);
  const snow = [238, 244, 252];
  fillDisc(img, 5, 6, 4.5, snow);
  fillDisc(img, 10.5, 6.5, 5, snow);
  fillRect(img, 2, 4, 14, 6, snow);
  ditherRect(img, 3, 4, 13, 5, [210, 222, 240]); // shaded foot
  pset(img, 4, 2, [255, 255, 255]); // glint
  outline(img, [150, 165, 190]); // soft outline, like the roller — black reads "rock"
  return img;
}

// A big crystal cluster: a tall spire flanked by two shards, one lit facet.
function paintCrystalBig() {
  const img = newImg(12, 16);
  const cyan = [96, 214, 226];
  fillTrap(img, 6, 15, 2.5, 1, 2, darken(cyan, 0.8)); // left shard
  fillTrap(img, 8, 15, 9.5, 0.5, 1.5, darken(cyan, 0.75)); // right shard
  fillTrap(img, 1, 8, 6, 1, 3.5, cyan); // main spire
  fillTrap(img, 8, 15, 6, 3.5, 2.5, darken(cyan, 0.85)); // spire base
  fillTrap(img, 2, 7, 5, 0.5, 1.5, lighten(cyan, 1.3)); // lit facet
  outline(img, OUT);
  return img;
}

// --- garden (twilight) ---------------------------------------------------------------

// A rose bush: a leafy mound studded with pink blooms.
function paintRosebush() {
  const img = newImg(14, 10);
  const leaf = [58, 102, 64];
  const bloom = [222, 84, 120];
  fillDisc(img, 4.5, 7, 3.6, leaf);
  fillDisc(img, 9.5, 7, 4, leaf);
  fillDisc(img, 7, 5.5, 3.4, lighten(leaf, 1.15));
  pset(img, 4, 4, bloom); // blooms
  pset(img, 8, 3, bloom);
  pset(img, 11, 6, bloom);
  pset(img, 6, 7, darken(bloom, 0.85));
  pset(img, 8, 3, lighten(bloom, 1.2));
  outline(img, OUT);
  return img;
}

// An ivy arch: two leafy pillars meeting in a crown — frames a path, 2 tiles tall.
function paintIvyArch() {
  const img = newImg(24, 26);
  const stone = [150, 142, 158];
  const ivy = [62, 110, 70];
  const bloom = [222, 84, 120];
  for (const x of [2, 19]) {
    fillRect(img, x, 6, x + 3, 26, stone); // pillars
    fillRect(img, x + 2, 6, x + 3, 26, darken(stone, 0.82));
  }
  fillTrap(img, 0, 6, 11.5, 7, 11.5, stone); // arch crown
  fillTrap(img, 1, 5, 11.5, 5, 8, darken(stone, 0.9));
  // Ivy climbing the left pillar and spilling over the crown.
  for (const [x, y] of [[2, 22], [3, 18], [2, 14], [4, 10], [6, 4], [10, 2], [14, 2], [18, 5], [20, 12]]) {
    fillRect(img, x, y, x + 2, y + 2, ivy);
  }
  pset(img, 7, 3, bloom); // climbing roses
  pset(img, 15, 2, bloom);
  pset(img, 20, 13, bloom);
  outline(img, OUT);
  return img;
}

// A small garden fountain: a basin with a jet and a lit rim.
function paintFountain() {
  const img = newImg(20, 16);
  const stone = [150, 142, 158];
  const water = [120, 190, 215];
  fillTrap(img, 11, 16, 10, 8, 9.5, stone); // basin
  fillRect(img, 3, 10, 17, 12, darken(stone, 0.85)); // basin rim
  fillRect(img, 4, 10, 16, 11, water); // pooled water
  fillRect(img, 9, 3, 11, 10, stone); // column
  fillRect(img, 9, 2, 11, 4, water); // jet crown
  pset(img, 8, 1, water);
  pset(img, 12, 1, water);
  pset(img, 7, 3, lighten(water, 1.2)); // falling droplets
  pset(img, 13, 4, lighten(water, 1.2));
  pset(img, 5, 10, [255, 255, 255]); // sparkle on the pool
  outline(img, OUT);
  return img;
}

// --- castle (interior) -----------------------------------------------------------------

// A standing candelabra: three warm flames on golden arms, 1.5 tiles tall.
function paintCandelabra() {
  const img = newImg(10, 22);
  const gold = [196, 158, 64];
  const flame = [255, 196, 90];
  fillRect(img, 4, 6, 6, 20, gold); // shaft
  fillRect(img, 2, 20, 8, 22, darken(gold, 0.8)); // base
  fillRect(img, 1, 8, 9, 9, gold); // arm bar
  for (const x of [1, 4, 7]) {
    fillRect(img, x, 6, x + 2, 8, darken(gold, 0.85)); // cups
    pset(img, x + 1, 4, flame); // flames
    pset(img, x + 1, 3, lighten(flame, 1.25));
  }
  outline(img, OUT);
  return img;
}

// A suit of armour on a plinth — the silent castle guard, 2 tiles tall.
function paintArmor() {
  const img = newImg(12, 20);
  const steel = [168, 174, 192];
  const dark = darken(steel, 0.78);
  fillRect(img, 2, 17, 10, 20, [110, 100, 120]); // plinth
  fillRect(img, 4, 3, 8, 6, steel); // helmet
  fillRect(img, 4, 5, 8, 6, dark); // visor slit
  pset(img, 5, 1, [196, 60, 70]); // plume
  pset(img, 6, 0, [196, 60, 70]);
  fillRect(img, 3, 7, 9, 12, steel); // cuirass
  fillRect(img, 3, 10, 9, 12, dark);
  fillRect(img, 2, 7, 3, 11, dark); // pauldron edges
  fillRect(img, 9, 7, 10, 11, dark);
  fillRect(img, 4, 12, 6, 17, steel); // legs
  fillRect(img, 7, 12, 9, 17, dark);
  fillRect(img, 1, 6, 2, 16, [140, 120, 90]); // halberd shaft
  fillTrap(img, 3, 6, 1.5, 0.5, 1.5, steel); // halberd head
  outline(img, OUT);
  return img;
}

// A royal wall banner: bordeaux drape with the gold crown emblem, swallow-tailed.
function paintRoyalBanner() {
  const img = newImg(12, 20);
  const cloth = [150, 44, 64];
  const gold = [218, 178, 70];
  fillRect(img, 1, 0, 11, 2, gold); // hanging rod
  fillRect(img, 2, 2, 10, 15, cloth);
  fillRect(img, 8, 2, 10, 15, darken(cloth, 0.85)); // shaded fold
  fillTrap(img, 15, 19, 4, 1.5, 0.2, cloth); // swallow tails
  fillTrap(img, 15, 19, 8, 1.5, 0.2, cloth);
  fillRect(img, 4, 6, 8, 8, gold); // crown emblem
  pset(img, 4, 5, gold);
  pset(img, 6, 5, gold);
  pset(img, 8, 5, gold);
  outline(img, OUT);
  return img;
}

// --- export ------------------------------------------------------------------------

// Files emitted by tools/gen/index.mjs; keys must match ASSETS.sprites in src/config.js
// and the theme.props lists in src/levels/level*.js.
export const DECOR = [
  ["deco_tree.png", paintTree],
  ["deco_mushroom.png", paintMushroom],
  ["deco_fern.png", paintFern],
  ["deco_coralfan.png", paintCoralFan],
  ["deco_kelp.png", paintKelp],
  ["deco_shell.png", paintShell],
  ["deco_lanternpost.png", paintLanternPost],
  ["deco_banner.png", paintBanner],
  ["deco_chimney.png", paintChimney],
  ["deco_pine.png", paintPine],
  ["deco_snowdrift.png", paintSnowdrift],
  ["deco_crystal_big.png", paintCrystalBig],
  ["deco_rosebush.png", paintRosebush],
  ["deco_ivyarch.png", paintIvyArch],
  ["deco_fountain.png", paintFountain],
  ["deco_candelabra.png", paintCandelabra],
  ["deco_armor.png", paintArmor],
  ["deco_royalbanner.png", paintRoyalBanner],
];
