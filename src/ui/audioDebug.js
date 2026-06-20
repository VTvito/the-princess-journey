// audioDebug.js — on-screen WebAudio diagnostics, shown ONLY when the URL carries
// ?audiodebug=1 (or #audiodebug). It exists because iOS audio bugs cannot be reproduced in
// desktop emulation (Edge/Chromium — see CLAUDE.md), and on Windows there is no Safari Web
// Inspector to read the device's console. This overlay lets a real iPhone report its
// AudioContext state, sample rate, audio-session type, sound-load status and the result of a
// manual test play — so audio issues can be diagnosed on the device itself.
//
// Gated behind the query param so normal players never see it. It creates its own DOM (no
// markup in index.html, no rules in style.css) and never touches gameplay/collision logic.
// Bonus: tapping the "Test suono" button is itself a real DOM gesture, so it also helps the
// audioUnlock listeners resume the context.

import { k } from "../kaplayCtx.js";

/** True when the page was opened with ?audiodebug (any value) or #audiodebug. */
function enabled() {
  try {
    if (new URLSearchParams(location.search).has("audiodebug")) return true;
  } catch {
    // malformed search — fall through to the hash check
  }
  return location.hash.toLowerCase().includes("audiodebug");
}

/** Compact load state for a single sound key, read defensively from kaplay's asset record. */
function soundState(name) {
  try {
    const a = k.getSound(name);
    if (!a) return "?";
    if (a.error) return "ERR";
    // kaplay Asset exposes `loaded`; treat presence of decoded data as loaded too.
    if (a.loaded || a.data) return "ok";
    return "…";
  } catch {
    return "?";
  }
}

export function bindAudioDebug() {
  if (!enabled()) return;

  const box = document.createElement("div");
  box.id = "audio-debug";
  Object.assign(box.style, {
    position: "fixed",
    left: "8px",
    top: "8px",
    zIndex: "99999",
    font: "12px/1.45 monospace",
    color: "#fff",
    background: "rgba(0,0,0,.82)",
    padding: "8px 10px",
    borderRadius: "8px",
    maxWidth: "78vw",
    whiteSpace: "pre",
    pointerEvents: "auto",
  });

  const lines = document.createElement("div");

  const btn = document.createElement("button");
  btn.textContent = "▶ Test suono";
  Object.assign(btn.style, { marginTop: "6px", font: "12px monospace", cursor: "pointer" });

  let lastTest = "—";
  btn.addEventListener("click", () => {
    // Play directly (bypassing the SFX mute toggle) so the test is purely about the context.
    try {
      const h = k.play("select", { volume: 0.8 });
      const st = k.audioCtx ? k.audioCtx.state : "?";
      lastTest = h ? `play() ok @${st}` : `null @${st}`;
    } catch (e) {
      lastTest = "throw: " + (e && e.message ? e.message : String(e));
    }
  });

  box.appendChild(lines);
  box.appendChild(btn);
  document.body.appendChild(box);

  const render = () => {
    const ctx = k.audioCtx;
    lines.textContent = [
      "— AUDIO DEBUG —",
      "ctx.state    : " + (ctx ? ctx.state : "n/a"),
      "sampleRate   : " + (ctx ? ctx.sampleRate : "n/a"),
      "audioSession : " + (navigator.audioSession ? navigator.audioSession.type : "n/a"),
      "sounds       : select=" + soundState("select") +
        " jump=" + soundState("jump") +
        " menu-bgm=" + soundState("menu-bgm"),
      "test play    : " + lastTest,
    ].join("\n");
  };
  render();
  setInterval(render, 250);
}
