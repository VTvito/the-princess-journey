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
// Idempotent; the gesture listeners stay armed for the WHOLE session, so a tap AFTER an
// interruption can re-resume the context (removing them on the first unlock was exactly why
// the music sometimes never came back when resuming an interrupted game — see the resume note
// on `sync` below).

import { k } from "./kaplayCtx.js";
import { resumeCurrentBgm } from "./audio.js";

const GESTURES = ["pointerdown", "touchend", "mousedown", "keydown"];
let installed = false;
let statechangeBound = false;
let wasRunning = false; // tracks the suspended↔running edge so we restart bgm exactly once

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

  // (Re)start whatever track a locked-context call queued — but ONLY on the rising edge into
  // "running", so we never restart the music on every tap while it's already playing. This
  // fires on the FIRST unlock AND again after every iOS interruption: backgrounding drops the
  // context to suspended/"interrupted", and on return the next gesture brings it back to running,
  // re-triggering the edge here so the bgm that fell silent starts again (the resume-bug fix).
  const sync = (ctx) => {
    const running = ctx.state === "running";
    if (running && !wasRunning) resumeCurrentBgm();
    wasRunning = running;
  };

  const tryResume = () => {
    const ctx = k.audioCtx;
    if (!ctx) return; // engine/audio not ready yet — a later gesture/event retries
    // Bind the REAL state transition ONCE (persists for the whole session): it catches the
    // resume→running transition however many ticks later WebKit takes, including re-resumes
    // after an interruption — what the old one-shot teardown + setTimeout(0) missed.
    if (!statechangeBound) {
      statechangeBound = true;
      ctx.addEventListener("statechange", () => sync(ctx));
    }
    sync(ctx); // catch the already-running case (no statechange fires then)
    if (ctx.state !== "running") {
      // "suspended"/"interrupted" → ask to resume inside the gesture and poke a silent buffer.
      ctx.resume().catch(() => {});
      pokeSilent(ctx);
    }
  };

  const onGesture = () => tryResume();

  // Gesture listeners stay armed for the WHOLE session (capture phase, ahead of Kaplay). We do
  // NOT tear them down once running: iOS re-suspends the context on backgrounding, and only a
  // real gesture can resume it again — removing them was why the music sometimes never came back
  // on resuming an interrupted game. Once running they're cheap (a state check + an early out).
  for (const ev of GESTURES) window.addEventListener(ev, onGesture, true);

  // iOS suspends/interrupts the context on backgrounding; resume() is allowed again right
  // after the page becomes visible/focused, so re-try there too (the next real tap seals it).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryResume();
  });
  window.addEventListener("focus", () => tryResume());
}
