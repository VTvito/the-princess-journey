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
const MUSIC_VOL_KEY = "pj.musicVol";
const SFX_VOL_KEY = "pj.sfxVol";

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
// Numeric (0..1) reads/writes for the volume sliders (clamped + NaN-safe).
function readNum(key, dflt) {
  try {
    const v = parseFloat(window.localStorage.getItem(key));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : dflt;
  } catch {
    return dflt;
  }
}
function writeNum(key, n) {
  try {
    window.localStorage.setItem(key, String(n));
  } catch {
    // no-op
  }
}

let musicOn = read(MUSIC_KEY, true);
let sfxOn = read(SFX_KEY, true);
// Per-bus level (0..1) sitting on top of the on/off toggle and each track/cue's base volume.
let musicVolume = readNum(MUSIC_VOL_KEY, 1);
let sfxVolume = readNum(SFX_VOL_KEY, 1);
let bgm = null; // active looping music handle
let bgmKey = null; // its asset key (re-requesting the same track is a no-op)
let bgmVol = 0.4; // its base volume (scaled by the music level, or 0 while the bus is muted)

// Effective music gain: the track's base volume scaled by the slider, 0 while muted.
const effMusicVol = () => (musicOn ? bgmVol * musicVolume : 0);

export const isMusicOn = () => musicOn;
export const isSfxOn = () => sfxOn;
export const getMusicVolume = () => musicVolume;
export const getSfxVolume = () => sfxVolume;
/** Gain the SFX bus applies on top of each cue's base volume (0 when muted). */
export const sfxGain = () => (sfxOn ? sfxVolume : 0);

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
    bgm = k.play(key, { loop: true, volume: effMusicVol() });
  } catch {
    bgm = null; // not loaded / context still locked — a later call will retry
    bgmKey = null;
  }
  return bgm;
}

/**
 * Re-start the track that *should* be playing, now that the audio context is unlocked.
 * The first playBgm() of a session often runs while iOS still has the context suspended,
 * so its source schedules but never sounds. src/audioUnlock.js calls this once the context
 * reaches "running" to give that track a clean (re)start. No-op if nothing was requested.
 */
export function resumeCurrentBgm() {
  if (!bgmKey) return; // no track requested yet — nothing to resume
  const key = bgmKey;
  const vol = bgmVol;
  stopBgm(); // clears bgm/bgmKey so the playBgm below isn't a "same track" no-op
  playBgm(key, vol);
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

// Push the current effective music gain onto the live track (no-op if none playing).
function applyMusicVol() {
  if (!bgm) return;
  try {
    bgm.volume = effMusicVol();
  } catch {
    // handle gone
  }
}

export function setMusicOn(on) {
  musicOn = on;
  write(MUSIC_KEY, on);
  applyMusicVol(); // unmuting resumes the same track in place, at the slider level
}

export function setSfxOn(on) {
  sfxOn = on;
  write(SFX_KEY, on);
}

/** Set the music level (0..1) from the settings slider; updates the live track + persists. */
export function setMusicVolume(v) {
  musicVolume = Math.min(1, Math.max(0, v));
  writeNum(MUSIC_VOL_KEY, musicVolume);
  applyMusicVol();
}

/** Set the SFX level (0..1) from the settings slider; persists (applied per cue in sfx.js). */
export function setSfxVolume(v) {
  sfxVolume = Math.min(1, Math.max(0, v));
  writeNum(SFX_VOL_KEY, sfxVolume);
}
