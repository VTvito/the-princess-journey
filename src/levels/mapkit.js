// mapkit.js — compose a level's tile map from a compact, declarative description.
//
// The levels are wide (≈120 cells) and now have real elevation, which is painful and
// error-prone to hand-type as string literals. This helper builds the rows
// programmatically.
//
// THE CRITICAL-PATH CONTRACT. The design rule that keeps every level fair and beatable:
//   • the left→right critical path is completable with run / jump / wait alone — single
//     jumps clear ≤2-cell gaps and ≤2-cell climbs (tuned to config.PHYSICS; there is NO
//     double jump), and moving platforms can be ridden by waiting at a gap's edge;
//   • verticality, bonus routes and optional pickups are unconstrained — they live OFF
//     the critical path, so they may demand springs / feathers / updrafts / precise hops
//     without ever blocking completion of the level.
//
// Terminology: the GROUND is the bottom two solid rows (broken by ravines); TERRACES
// raise the walkable surface by `h` cells for a run of columns; the LANE is the row
// just above the base ground where spawn/hazards/enemies/goal usually sit.

const DEFAULT_HEIGHT = 11;

/**
 * @param {{
 *   width:number,
 *   height?:number,                          // total rows (default 11)
 *   ravines?:{x:number,w:number}[],          // gaps in the ground (w cells wide, at x)
 *   terraces?:{x:number,w:number,h:number}[],// raised ground runs (surface rises h cells)
 *   items?:{x:number,y:number,ch:string}[],  // anything placed on top (legend chars)
 *   platforms?:{x:number,y:number,w:number}[], // floating "=" runs (bonus verticality)
 *   semisolids?:{x:number,y:number,w:number}[], // one-way "#" runs (bonus verticality)
 * }} def
 * @returns {string[]} the ASCII map (one string per row)
 */
export function composeMap({
  width,
  height = DEFAULT_HEIGHT,
  ravines = [],
  terraces = [],
  items = [],
  platforms = [],
  semisolids = [],
}) {
  const grid = Array.from({ length: height }, () => Array(width).fill(" "));
  const groundRows = [height - 2, height - 1];

  // Ground line: solid except where a ravine carves a gap.
  for (let x = 0; x < width; x++) {
    const inRavine = ravines.some((r) => x >= r.x && x < r.x + r.w);
    if (!inRavine) for (const gr of groundRows) grid[gr][x] = "=";
  }
  // Terraces: raise the walkable surface by t.h cells over t.w columns.
  for (const t of terraces) {
    for (let i = 0; i < t.w; i++) {
      for (let y = height - 2 - t.h; y < height - 2; y++) put(grid, t.x + i, y, "=", height);
    }
  }
  // Floating platforms (rendered as "platform" sprites — air above and below).
  for (const p of platforms) for (let i = 0; i < p.w; i++) put(grid, p.x + i, p.y, "=", height);
  // One-way semisolid runs (bonus high routes the heroine can jump up through).
  for (const s of semisolids) for (let i = 0; i < s.w; i++) put(grid, s.x + i, s.y, "#", height);
  // Everything else on top.
  for (const it of items) put(grid, it.x, it.y, it.ch, height);

  // Keep rows trimmed on the right (the builder treats max row length as the world width).
  return grid.map((row) => row.join("").replace(/\s+$/g, ""));
}

function put(grid, x, y, ch, height) {
  if (y >= 0 && y < height && x >= 0 && x < grid[0].length) grid[y][x] = ch;
}

/** Row just above the base ground — where spawn/lane hazards/enemies/goal usually sit. */
export const laneFor = (height = DEFAULT_HEIGHT) => height - 3;
/** Row for air enemies — high enough that the heroine runs underneath. */
export const airFor = (height = DEFAULT_HEIGHT) => height - 5;

// Back-compat constants for height-11 maps (the current levels).
export const LANE = laneFor();
export const AIR = airFor();

// Convenience: evenly spaced collectibles along the lane's jump arc (rows 6–7 on a
// height-11 map), so they're grabbed while running/hopping. Returns items for composeMap.
export function arcCollectibles(xs, rows = [AIR, LANE - 1]) {
  return xs.map((x, i) => ({ x, y: rows[i % rows.length], ch: "o" }));
}
