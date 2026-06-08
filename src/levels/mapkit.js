// mapkit.js — compose a level's tile map from a compact, declarative description.
//
// The levels grew much wider (≈3× the original) with optional verticality, which is painful
// and error-prone to hand-type as 100+ character string literals. This helper builds the rows
// programmatically while preserving the contract the autoplay bot (tools/test/play.mjs) and
// the renderer (src/levels/build.js) rely on:
//   • height stays 11 rows so the bot's tuned y-thresholds (floor y>540, lane hazards y>500,
//     ground vs air enemies at y 480) stay valid — the critical path is the bottom lane;
//   • the two ground rows are solid "=" except for ravine gaps (a gap = a jumpable ravine);
//   • everything else (spawn @, hazards ^/s, enemies c/f, collectibles o, floating platforms
//     "=", goal >) is placed by (x, y) on top.
// Verticality is purely optional bonus content ABOVE the lane (floating platforms in rows
// 0–7), never on the critical left→right ground line.

const HEIGHT = 11;
const GROUND_ROWS = [9, 10]; // bottom two rows = the navigable floor
export const LANE = 8; // row where spawn / lane hazards / ground enemies / goal sit
export const AIR = 6; // row for air enemies (flyers) — y≈416 so the bot runs underneath

/**
 * @param {{
 *   width:number,
 *   ravines?:{x:number,w:number}[],   // gaps in the ground (w cells wide, starting at x)
 *   items?:{x:number,y:number,ch:string}[], // anything placed on top (legend chars)
 *   platforms?:{x:number,y:number,w:number}[], // floating "=" runs (bonus verticality)
 * }} def
 * @returns {string[]} the ASCII map (one string per row)
 */
export function composeMap({ width, ravines = [], items = [], platforms = [] }) {
  const grid = Array.from({ length: HEIGHT }, () => Array(width).fill(" "));

  // Ground line: solid except where a ravine carves a gap.
  for (let x = 0; x < width; x++) {
    const inRavine = ravines.some((r) => x >= r.x && x < r.x + r.w);
    if (!inRavine) for (const gr of GROUND_ROWS) grid[gr][x] = "=";
  }
  // Floating platforms (rendered as "platform" sprites by build.js since air is above+below).
  for (const p of platforms) for (let i = 0; i < p.w; i++) put(grid, p.x + i, p.y, "=");
  // Everything else on top.
  for (const it of items) put(grid, it.x, it.y, it.ch);

  // Keep rows trimmed on the right (the builder treats max row length as the world width).
  return grid.map((row) => row.join("").replace(/\s+$/g, ""));
}

function put(grid, x, y, ch) {
  if (y >= 0 && y < HEIGHT && x >= 0 && x < grid[0].length) grid[y][x] = ch;
}

// Convenience: evenly spaced collectibles along the lane's jump arc (rows 6–7), so they're
// grabbed while running/hopping. Returns items for composeMap.
export function arcCollectibles(xs, rows = [AIR, 7]) {
  return xs.map((x, i) => ({ x, y: rows[i % rows.length], ch: "o" }));
}
