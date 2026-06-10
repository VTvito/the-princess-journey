// features.mjs — deeper browser regression test for the polishing features
// (Specifiche_Polishing). Drives the running game in real Edge via the dev handle
// (window.__pj.k) + DOM, and asserts each meta-game / QoL behaviour.
//
// Usage:  python tools/serve.py 8137   (then)   node tools/test/features.mjs
// Exit code 0 = all pass, 1 = a failure or a console error.

import { launchBrowser, routeVendorKaplay } from "./browser.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TARGET = process.argv[2] || process.env.PJ_URL || "http://localhost:8137";
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOT = join(HERE, "features.png");
const T = 15000;

const errors = [];
const results = [];
const check = (name, ok, extra = "") => results.push({ name, ok: !!ok, extra });

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await routeVendorKaplay(page);
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // Boot with a clean slate so Coccoline/mute start from zero/off.
  await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: T });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => window.__pj?.k && window.__pj.k.getSceneName() === "menu",
    null,
    { timeout: T, polling: 100 },
  );
  check("boots to menu", true);

  // --- §4 Audio: independent Music + SFX buses flip, reflect their icon/state, persist ---
  await page.click("#audio-toggle"); // SFX → off
  const s1 = await page.evaluate(() => ({
    icon: document.getElementById("audio-toggle").textContent,
    ls: localStorage.getItem("pj.sfx"),
  }));
  check("sfx toggle → off", s1.icon.includes("🔇") && s1.ls === "0", JSON.stringify(s1));
  await page.click("#audio-toggle"); // SFX → on
  const s2 = await page.evaluate(() => ({
    icon: document.getElementById("audio-toggle").textContent,
    ls: localStorage.getItem("pj.sfx"),
  }));
  check("sfx toggle → on", s2.icon.includes("🔊") && s2.ls === "1", JSON.stringify(s2));

  await page.click("#music-toggle"); // Music → off (🎵 dims; glyph stays the same)
  const mu1 = await page.evaluate(() => ({
    muted: document.getElementById("music-toggle").classList.contains("is-muted"),
    ls: localStorage.getItem("pj.music"),
  }));
  check("music toggle → off", mu1.muted && mu1.ls === "0", JSON.stringify(mu1));
  await page.click("#music-toggle"); // Music → on
  const mu2 = await page.evaluate(() => ({
    muted: document.getElementById("music-toggle").classList.contains("is-muted"),
    ls: localStorage.getItem("pj.music"),
  }));
  check("music toggle → on", !mu2.muted && mu2.ls === "1", JSON.stringify(mu2));

  // --- Enter gameplay on Livello 2 (it has crabs — needed for the stomp checks below).
  // state.js reads localStorage at module init, so pin the level and reload first. ---
  await page.evaluate(() => localStorage.setItem("pj.currentLevel", "2"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => window.__pj?.k && window.__pj.k.getSceneName() === "menu",
    null,
    { timeout: T, polling: 100 },
  );
  await page.evaluate(() => window.__pj.k.go("game"));
  await page.waitForFunction(
    () => window.__pj.k.getSceneName() === "game" && window.__pj.k.get("player").length > 0,
    null,
    { timeout: T, polling: 100 },
  );
  check("enters game scene", true);

  // Focus the canvas so keystrokes reach Kaplay (the audio-button click stole focus;
  // in real play, clicking Start focuses the canvas). The game scene has no click handler
  // at screen-centre, so this is a harmless focus click.
  await page.mouse.click(640, 360);
  await page.waitForTimeout(50);

  // --- SFX assets registered + playable (Specifiche_Polishing §3/§4). The focus click above
  // is a user gesture, so the AudioContext is unlocked and these silent probes stay quiet. ---
  const sfxMissing = await page.evaluate(() => {
    const k = window.__pj.k;
    const names = [
      "jump", "collect", "coin", "oops", "goal", "win", "select",
      "stomp", "spring", "checkpoint", "crumble", "skid",
    ];
    const missing = [];
    for (const n of names) {
      try {
        const h = k.play(n, { volume: 0 });
        if (!h) missing.push(n);
        else if (typeof h.stop === "function") h.stop();
      } catch {
        missing.push(n);
      }
    }
    return missing;
  });
  check(
    "sfx assets load + play",
    sfxMissing.length === 0,
    sfxMissing.length ? `missing: ${sfxMissing.join(",")}` : "12/12",
  );

  // Movement (held key → Δx) and jump (apex Δy upward), plus the animation state machine
  // driven by the same physics (src/entities/player.js + src/animspec.js).
  const px = () => page.evaluate(() => window.__pj.k.get("player")[0].pos.x);
  const py = () => page.evaluate(() => window.__pj.k.get("player")[0].pos.y);
  const anim = () => page.evaluate(() => window.__pj.k.get("player")[0].curAnim());
  // Hold right and WAIT for actual displacement instead of a fixed timeout — decoding the
  // music WAVs can stall the first frames after boot and eat a fixed-length key window.
  const x0 = await px();
  await page.keyboard.down("ArrowRight");
  const moved = await page
    .waitForFunction((sx) => window.__pj.k.get("player")[0].pos.x > sx + 60, x0, {
      timeout: 4000,
      polling: 50,
    })
    .then(() => true)
    .catch(() => false);
  const runAnim = await anim(); // sampled while the key is still held and she's moving
  await page.keyboard.up("ArrowRight");
  check("player moves right", moved, `dx=${((await px()) - x0).toFixed(1)}`);
  check("run anim while moving", runAnim === "run", `anim=${runAnim}`);

  // HOLD the jump (a bare press releases at a driver-dependent instant, and the variable-
  // height cut then makes the measured rise flaky); a 150ms hold guarantees a full arc.
  const yGround = await py();
  await page.keyboard.down("Space");
  await page.waitForTimeout(150);
  const airAnim = await anim(); // sampled mid-rise while still holding
  await page.keyboard.up("Space");
  await page.waitForTimeout(60); // ~apex
  const yApex = await py();
  check("player jumps", yGround - yApex > 60, `dy=${(yGround - yApex).toFixed(1)}`);
  check("air anim while jumping", airAnim === "jump", `anim=${airAnim}`);

  // --- Mario-style stomp + hit-stop: drop the heroine onto a crab; the enemy must die
  // and debug.timeScale must come back to 1 (a stranded hit-stop would slow-motion the
  // whole game). This is a feature probe, not bot play, so teleporting is fair game. ---
  const stomp = await page.evaluate(async () => {
    const k = window.__pj.k;
    const player = k.get("player")[0];
    const crab = k.get("enemy")[0];
    if (!crab) return { ok: false, why: "no enemy found on level 2" };
    const before = k.get("enemy").length;
    player.pos.x = crab.pos.x;
    player.pos.y = crab.pos.y - 90;
    player.vel.y = 200; // falling onto it → the stomp branch
    await new Promise((r) => setTimeout(r, 600)); // real time — unaffected by hit-stop
    return {
      ok: k.get("enemy").length === before - 1,
      enemies: `${before}→${k.get("enemy").length}`,
      timeScale: k.debug.timeScale,
    };
  });
  check("stomp defeats the enemy", stomp.ok, stomp.why || stomp.enemies);
  check("hit-stop restores time", stomp.timeScale === 1, `timeScale=${stomp.timeScale}`);

  // --- §1 Insert Coin: falling off the world shows the DOM overlay (not Kaplay) ---
  await page.evaluate(() => (window.__pj.k.get("player")[0].pos.y = 999999));
  await page.waitForFunction(() => !document.getElementById("coin-overlay").hidden, null, {
    timeout: T,
    polling: 100,
  });
  check("death shows insert-coin overlay", true);

  // Inserting the coin banks 500, hides the overlay, restarts the level.
  await page.click("#coin-btn");
  await page.waitForFunction(
    () =>
      window.__pj.k.getSceneName() === "game" &&
      document.getElementById("coin-overlay").hidden,
    null,
    { timeout: T, polling: 100 },
  );
  const coc = await page.evaluate(() => localStorage.getItem("totaleCoccoline"));
  check("insert coin banks 500", coc === "500", `totaleCoccoline=${coc}`);

  // --- §2 Finale receipt: shows the running debt ---
  await page.evaluate(() => window.__pj.k.go("finale"));
  await page.waitForFunction(() => !document.getElementById("receipt-overlay").hidden, null, {
    timeout: T,
    polling: 100,
  });
  const amount = await page.evaluate(
    () => document.getElementById("receipt-amount").textContent,
  );
  check("finale receipt shows debt", amount === "500", `amount=${amount}`);

  // --- §3 Animation contract: the finale avatar wears all four skins, celebrates, and
  // every skin layer mirrors the body's sheet frame (src/animspec.js sync contract). ---
  const avatarState = await page.evaluate(() => {
    const av = window.__pj.k.get("avatar")[0];
    return av
      ? { anim: av.curAnim(), frame: av.frame, layerFrames: av.skinLayers.map((l) => l.frame) }
      : null;
  });
  check("finale avatar celebrates", avatarState?.anim === "celebrate", `anim=${avatarState?.anim}`);
  check(
    "skin layers frame-synced",
    avatarState && avatarState.layerFrames.length === 4 &&
      avatarState.layerFrames.every((f) => f === avatarState.frame),
    JSON.stringify(avatarState),
  );
  await page.screenshot({ path: SHOT });

  // --- Report ---
  let allOk = errors.length === 0;
  for (const r of results) {
    allOk = allOk && r.ok;
    console.log(`${r.ok ? "PASS" : "FAIL"} — ${r.name}${r.extra ? `  (${r.extra})` : ""}`);
  }
  if (errors.length) {
    console.log("\nConsole/page errors:");
    errors.forEach((e) => console.log("  " + e));
  }
  console.log(`\nscreenshot: ${SHOT}`);
  process.exitCode = allOk ? 0 : 1;
} catch (err) {
  console.error(`FAIL — exception: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
