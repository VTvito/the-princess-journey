// kaplayCtx.js — creates the one Kaplay context and exports it.
// Every other module imports `k` from here, so there is exactly one engine instance
// and no global (window) pollution.

// Kaplay is vendored (pinned 3001.0.19, downloaded from unpkg) so production never
// depends on a CDN being up, and the game can later work offline as a PWA.
import kaplay from "../vendor/kaplay-3001.0.19.mjs";
import { GAME_W, GAME_H, PALETTE } from "./config.js";

export const k = kaplay({
  width: GAME_W,
  height: GAME_H,
  // letterbox + stretch: scale to the viewport while keeping the 16:9 landscape aspect
  // ratio, adding bars on off-ratio screens instead of distorting.
  letterbox: true,
  stretch: true,
  background: PALETTE.sky,
  canvas: document.querySelector("#game"),
  global: false,           // use the returned context, no globals
  touchToMouse: true,      // taps fire onClick — menu works on mobile
  pixelDensity: Math.min(window.devicePixelRatio || 1, 2), // crisp but cap for perf
  crisp: true, // nearest-neighbour sampling so the generated 64px tiles/sprites stay sharp
  // Default UI font: the vendored pixel font (loaded in src/assets.js as "pixel"). Every
  // k.text() inherits it, so the HUD/menus read as pixel art instead of system sans-serif.
  // The few labels with emoji/symbol glyphs the font lacks (▶ ★ ✨ 👑) override to
  // font:"sans-serif" per object. Until the async load finishes (the loading scene), Kaplay
  // falls back to its built-in font for the brief "Caricamento..." text.
  font: "pixel",
});
