// settings.js — the volume settings overlay (Fase 1c).
//
// Pure DOM, like the pause/insert-coin overlays: two range sliders wired to the Music and
// SFX buses in src/audio.js. Reachable from the main menu and from the pause menu (it
// stacks above the pause overlay, so closing it reveals the pause card again). Markup lives
// in index.html; this module just toggles + wires it.

import { getMusicVolume, getSfxVolume, setMusicVolume, setSfxVolume } from "../audio.js";
import { resetProgress, resetCoccolineRun } from "../state.js";
import { sfx } from "../sfx.js";

let overlay = null;
let musicSlider = null;
let sfxSlider = null;
let resetBtn = null;
let closeBtn = null;
let resetArmed = false; // two-tap confirm guard for the destructive reset

function els() {
  overlay ||= document.getElementById("settings-overlay");
  musicSlider ||= document.getElementById("set-music-vol");
  sfxSlider ||= document.getElementById("set-sfx-vol");
  resetBtn ||= document.getElementById("settings-reset");
  closeBtn ||= document.getElementById("settings-close");
}

/**
 * Show the settings overlay, seeding the sliders from the saved levels and wiring live
 * updates. `onClose` runs after the overlay hides (e.g. to re-focus the canvas).
 */
export function showSettings(onClose) {
  els();
  if (!overlay) return;
  if (musicSlider) {
    musicSlider.value = String(Math.round(getMusicVolume() * 100));
    musicSlider.oninput = () => setMusicVolume(musicSlider.value / 100); // live, no churn
  }
  if (sfxSlider) {
    sfxSlider.value = String(Math.round(getSfxVolume() * 100));
    sfxSlider.oninput = () => setSfxVolume(sfxSlider.value / 100);
    sfxSlider.onchange = () => sfx("select"); // a tick at the new level on release
  }
  // Reset: a destructive wipe of the saved journey (character, level, score + this run's
  // bill — the lifetime total survives, it's the joke). Two taps to confirm; a full reload
  // then re-reads the cleared storage so every scene reflects the fresh start.
  if (resetBtn) {
    resetArmed = false;
    resetBtn.textContent = "Cancella i progressi";
    resetBtn.classList.remove("danger-armed");
    resetBtn.onclick = () => {
      if (!resetArmed) {
        resetArmed = true;
        resetBtn.textContent = "Sei sicura? Tocca ancora";
        resetBtn.classList.add("danger-armed");
        sfx("select");
        return;
      }
      resetProgress();
      resetCoccolineRun();
      location.reload();
    };
  }
  if (closeBtn) {
    closeBtn.onclick = () => {
      sfx("select");
      hideSettings();
      onClose?.();
    };
  }
  overlay.hidden = false;
}

/** Hide the overlay (also called defensively when entering other scenes). */
export function hideSettings() {
  els();
  if (overlay) overlay.hidden = true;
}
