// audioUnlock.js — unlocks the WebAudio context inside a REAL DOM user gesture.
//
// Why this exists: on iOS (Safari AND Chrome — both ride WKWebView/WebKit) the AudioContext
// starts "suspended" and only resumes if resume() runs synchronously inside a genuine
// user-gesture call stack (touchend/pointerdown). The menu's Start/character buttons are drawn
// by Kaplay (canvas objects), and Kaplay runs their onClick during its rAF loop — NOT inside
// the DOM gesture — so the context stayed locked and neither music nor SFX ever played.
//
// Hardening (iPhone Chrome, iOS 17: total silence, ringer ON, other apps audible — so it was
// NOT the mute switch; the context simply never reached "running"):
//   • set navigator.audioSession.type = "playback" (iOS 16.4+) so WebAudio uses the media
//     audio category instead of the ambient route some WKWebView builds leave it on;
//   • drive the bgm (re)start from the context's REAL "statechange" event, not a same-tick
//     setTimeout — on WebKit the resume→"running" transition often lands a few ticks later,
//     and the old check missed it;
//   • re-resume on visibilitychange/focus, since iOS drops the context to suspended/
//     "interrupted" when the tab or app is backgrounded.
// Idempotent; the gesture listeners self-remove only once the context is truly "running".

import { k } from "./kaplayCtx.js";
import { resumeCurrentBgm } from "./audio.js";

const GESTURES = ["pointerdown", "touchend", "mousedown", "keydown"];
let installed = false;
let statechangeBound = false;

/** Play a 0-length silent buffer — some WebKit builds need an actual play() to fully unlock. */
function pokeSilent(ctx) {
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);
    src.stop(0);
  } catch {
    // best-effort; resume() alone is enough on modern iOS
  }
}

function removeListeners(handler) {
  for (const ev of GESTURES) window.removeEventListener(ev, handler, true);
}

/** Tell iOS this is media playback so WebAudio output isn't tied to the ambient route. */
function setPlaybackCategory() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch {
    // unsupported (older iOS / other engines) — harmless
  }
}

/**
 * Install one-shot gesture listeners that resume the audio context. Call once at startup
 * (from main.js). No-op if the context isn't available yet — listeners just retry on the
 * next gesture/visibility change until it resolves to "running".
 */
export function installAudioUnlock() {
  if (installed) return;
  installed = true;

  setPlaybackCategory();

  // The context just reached "running": (re)start whatever track a locked-context call
  // scheduled-but-never-sounded, and stop listening for gestures. Stays correct if a later
  // interruption re-runs it (resumeCurrentBgm restarts cleanly; removeListeners is idempotent).
  const onRunning = () => {
    resumeCurrentBgm();
    removeListeners(onGesture);
  };

  const tryResume = () => {
    const ctx = k.audioCtx;
    if (!ctx) return; // engine/audio not ready yet — a later gesture/event retries
    if (ctx.state === "running") {
      onRunning();
      return;
    }
    // Bind the REAL state transition once: fires whenever resume() actually completes,
    // however many ticks later WebKit takes — this is what the old setTimeout(0) missed.
    if (!statechangeBound) {
      statechangeBound = true;
      ctx.addEventListener("statechange", () => {
        if (ctx.state === "running") onRunning();
      });
    }
    // "suspended"/"interrupted" → ask to resume inside the gesture and poke a silent buffer.
    ctx.resume().catch(() => {});
    pokeSilent(ctx);
  };

  const onGesture = () => tryResume();

  for (const ev of GESTURES) {
    // capture: true → fires during the real DOM dispatch, ahead of Kaplay's own handlers.
    window.addEventListener(ev, onGesture, true);
  }

  // iOS suspends/interrupts the context on backgrounding; resume() is allowed again right
  // after the page becomes visible/focused, so re-arm there too (not only on taps).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryResume();
  });
  window.addEventListener("focus", () => tryResume());
}
