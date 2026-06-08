// audio.js — two independent audio buses with persisted on/off toggles:
//   • Music — the looping background tracks (menu waltz / gameplay loop), and
//   • SFX   — the one-shot gameplay cues (jump/collect/…), played via src/sfx.js.
// This replaces the old single master-mute so the player can silence the background music
// while keeping the playful sound effects (or vice-versa) — a common ask for looping music.
// The DOM buttons in src/ui/audioToggle.js flip these; scenes call playBgm() to switch
// tracks. The bgm handle lives here (not in a scene), so a track keeps playing seamlessly
// across scene changes and only restarts when the requested track actually changes.

import { k } from "./kaplayCtx.js";

const MUSIC_KEY = "pj.music";
const SFX_KEY = "pj.sfx";

function read(key, dflt) {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? dflt : v === "1";
  } catch {
    return dflt;
  }
}
function write(key, on) {
  try {
    window.localStorage.setItem(key, on ? "1" : "0");
  } catch {
    // no-op — preference just won't persist this session
  }
}

let musicOn = read(MUSIC_KEY, true);
let sfxOn = read(SFX_KEY, true);
let bgm = null; // active looping music handle
let bgmKey = null; // its asset key (re-requesting the same track is a no-op)
let bgmVol = 0.4; // its base volume (scaled to 0 while the music bus is muted)

export const isMusicOn = () => musicOn;
export const isSfxOn = () => sfxOn;
/** Gain the SFX bus applies on top of each cue's base volume (0 when muted). */
export const sfxGain = () => (sfxOn ? 1 : 0);

/**
 * Start a looping background track on the music bus. No-op if that track is already
 * playing, so scenes can call it freely on (re)entry. Must be reached from a user gesture
 * the first time (browsers block audio until then); if the context is still locked the play
 * fails silently and the next gesture-driven call retries.
 */
export function playBgm(key, vol = 0.4) {
  if (bgmKey === key && bgm) return bgm; // already playing this track
  stopBgm();
  bgmKey = key;
  bgmVol = vol;
  try {
    bgm = k.play(key, { loop: true, volume: musicOn ? vol : 0 });
  } catch {
    bgm = null; // not loaded / context still locked — a later call will retry
    bgmKey = null;
  }
  return bgm;
}

/** Stop the current background track. */
export function stopBgm() {
  if (bgm) {
    try {
      bgm.stop();
    } catch {
      // already gone
    }
  }
  bgm = null;
  bgmKey = null;
}

export function setMusicOn(on) {
  musicOn = on;
  write(MUSIC_KEY, on);
  if (bgm) {
    try {
      bgm.volume = on ? bgmVol : 0; // unmuting resumes the same track in place
    } catch {
      // handle gone
    }
  }
}

export function setSfxOn(on) {
  sfxOn = on;
  write(SFX_KEY, on);
}
