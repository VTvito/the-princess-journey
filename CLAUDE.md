# CLAUDE.md — The Princess Journey

Quick reference for working in this repo. Design lore lives in `Specifiche_*.md`; the
user-facing guide is `README.md`. This file is the agent/contributor playbook.

## What this is
- A **no-build** browser platformer. Kaplay is **vendored** (`vendor/kaplay-3001.0.19.mjs`)
  and imported directly — there is nothing to compile or bundle.
- One engine context only: `src/kaplayCtx.js` exports `k`; every module imports it. No globals.
- **`src/config.js` is the single source of truth** (GAME_W/H, PALETTE, CHARACTERS, SKINS,
  PHYSICS, MECHANICS, ENEMIES, POWERUP, ASSETS incl. the `fonts` manifest). Add tunables here,
  don't scatter constants.
- Levels are **data** (`src/levels/level1..6.js` + `build.js` + `mapkit.js`). Six playable
  levels; the finale (`src/scenes/finale.js`) is the non-playable "level 7" (`MAX_LEVEL = 7`).
- All DOM/HTML UI is isolated in `index.html`, `style.css`, `src/ui/*` — it must never touch
  the collision/gameplay logic in `src/scenes/game.js`.

## Commands (run the server first; never use `python -m http.server`)
```bash
python tools/serve.py 8137   # or npm run serve   (skill: /serve-game). MIME-correct ES modules.
npm test                     # smoke + features + levels (Playwright-core → installed Edge)
npm run test:play            # autoplay reachability guard (levels 1–6)
npm run test:mobile          # iPhone-landscape emulation (audio unlock, controls, fit, hint)
npm run gen                  # regenerate all assets (deterministic) — don't hand-edit assets/
npm run deploy               # prod deploy to Vercel (reads VERCEL_TOKEN from gitignored .env)
```

## Gotchas
- **Test flakiness (pre-existing, not regressions):** `air anim while jumping` and `spring
  launches the player` in `test:features`, and the autoplay bot on **Livello 3** (and
  occasionally **Livello 5**, whose breeze glide is timing-luck — a bad cluster of deaths can
  time the bot out at ~80% even though the level is completable), sample at frame boundaries and
  flip pass/fail with identical code. Re-run (`npm run test:play --levels 5`) before assuming a
  break — per-level death counts swing widely (e.g. L5 has read 1 and 22 on back-to-back runs).
- **iOS audio:** the `AudioContext` unlocks only on a **real DOM gesture**, handled by
  `src/audioUnlock.js` (window capture listener) — a Kaplay `onClick` runs in the rAF loop and
  does NOT count. If you change audio init, keep that gesture path.
- **Touch controls** show only with `body.playing` (toggled per scene). The four scenes set/
  clear it; keep that invariant or the D-pad reappears over the menu.
- **Fit:** `html, body` use `100dvh`; interactive UI uses `env(safe-area-inset-*)`. Don't
  revert to `height: 100%` (it clips under the iOS toolbar).
- **Emulation ≠ device:** Edge/Chromium can't reproduce WebKit audio quirks or the notch
  safe-area — real iOS audio/safe-area must be verified on a physical iPhone.
- **Dev handle:** `window.__pj` (engine + input + debug) is attached **only on localhost**
  (`src/main.js`); tests drive the game through it. Never rely on it in shipped code.
- **Pixel UI font:** the Kaplay default font is `"pixel"` (`src/kaplayCtx.js`, loaded in
  `src/assets.js`, mirrored via `@font-face` in `style.css`). It has **no emoji/★ glyphs**, so a
  `k.text()` containing 👑 🍎 ✨ ★ must pass `font: "sans-serif"` per object (DOM falls back
  per-glyph on its own). The HUD name/level sit at x=88 to clear the top-left ⏸ pause button.
- **Pause = global freeze:** Esc / ⏸ sets `k.getTreeRoot().paused` and shows a **DOM** overlay
  (`src/ui/pauseMenu.js`, settings stacks above via `src/ui/settings.js`) so its buttons stay
  clickable while the world is frozen. Every exit (resume/restart/menu) unfreezes first, and the
  game scene resets `paused = false` on entry — never leak a paused tree into another scene.
- **Springs target semisolids, not solids:** a spring (`makeSpring`, `src/levels/build.js`)
  launches the heroine straight up via `player.bounce()`, which also **disarms the variable-
  height jump-cut** so the bounce is always its full height. The platform it lifts onto must be
  a one-way **semisolid** (`#`), never a solid `platforms` slab — a solid slab over a spring
  blocks the bounce from below (she bonks its underside). A reliable, higher arc also overshoots
  farther, so keep the bounce-landing clear of hazards.
- **Difficulty lives in level data, not enemy speed:** `ENEMIES` speeds are tightly coupled to
  the autoplay bot's hop timing — bumping `CRAB_SPEED`/`FLY_SPEED` globally death-loops the bot
  at existing crab+thorn+gap clusters (`test:play` fails, often flaky-looking). Tune difficulty
  per-level instead: add enemies/hazards on flat stretches **clear of jump arcs and patrol
  ranges**, add 2-cell gaps (never >2 on the critical path — the bot can't single-jump wider),
  thin out checkpoints. Re-run `test:play` per level after each change.
- **Service worker is prod-only:** `sw.js` is registered in `src/main.js` **only off localhost**,
  so it never caches stale files between Playwright runs / dev edits. On a real content change,
  bump `CACHE` in `sw.js` so clients fetch fresh.

## Secrets / deploy
- `VERCEL_TOKEN` lives in a **gitignored + vercelignored `.env`**; `tools/deploy.mjs` reads it.
  Never commit `.env` or echo the token. After deploy, sanity-check `/.env` → 404 in prod.

## Conventions
- Match the surrounding style: detailed top-of-file header comments explaining the "why",
  generous inline comments at decision points. Italian for user-facing strings, English for code.
- When adding a level: add a data file + register it; reuse `build.js`/`mapkit.js`, don't write
  new rendering/collision code.
