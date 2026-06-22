// sfx.js — tiny wrapper around k.play for gameplay sound effects.
// Each cue plays on the SFX bus: its base volume below is scaled by sfxGain() (0 when the
// 🔊 toggle is off, see src/audio.js), so effects mute independently of the background music.
// The call is wrapped so a not-yet-loaded sound or a still-locked AudioContext can never
// throw into gameplay.

import { k } from "./kaplayCtx.js";
import { sfxGain } from "./audio.js";

// Relative loudness per cue (master mute/▲ is applied globally on top of these).
const VOL = {
  jump: 0.35,
  collect: 0.5,
  coin: 0.55,
  oops: 0.5,
  goal: 0.6,
  win: 0.75,
  select: 0.4,
  stomp: 0.5,
  spring: 0.45,
  checkpoint: 0.5,
  crumble: 0.4,
  skid: 0.18, // very quiet — it fires on every hard reversal
};

/**
 * Play a one-shot sound effect by asset key (see ASSETS.sounds in config.js).
 * @param {string} name  sound key, e.g. "jump"
 * @param {object} [opts]  extra k.play options (merged over the per-sound default volume)
 * @returns the playback handle, or null if it couldn't play (failed silently)
 */
export function sfx(name, opts = {}) {
  const gain = sfxGain();
  if (gain <= 0) return null; // SFX bus muted
  try {
    return k.play(name, { volume: (VOL[name] ?? 0.5) * gain, ...opts });
  } catch {
    return null; // sound not loaded / audio still locked — never break gameplay
  }
}
