// audioToggle.js — the two top-right toggle buttons for the Music and SFX buses
// (extended). 🎵 silences the looping background music; 🔊 silences
// the gameplay sound effects. Each reflects + persists its bus state (src/audio.js) so the
// choice survives reloads. Bound once at startup (like the touch buttons), so both work on
// every scene. Markup lives in index.html.

import { isMusicOn, isSfxOn, setMusicOn, setSfxOn } from "../audio.js";

let musicBtn = null;
let sfxBtn = null;

function paintMusic() {
  if (!musicBtn) return;
  const on = isMusicOn();
  musicBtn.classList.toggle("is-muted", !on); // dims the 🎵 when off
  musicBtn.setAttribute("aria-label", on ? "Disattiva musica" : "Attiva musica");
}

function paintSfx() {
  if (!sfxBtn) return;
  const on = isSfxOn();
  sfxBtn.textContent = on ? "🔊" : "🔇";
  sfxBtn.classList.toggle("is-muted", !on);
  sfxBtn.setAttribute("aria-label", on ? "Disattiva effetti" : "Attiva effetti");
}

/** Wire both toggles and apply the saved preferences. Call once at startup. */
export function bindAudioToggle() {
  musicBtn = document.getElementById("music-toggle");
  sfxBtn = document.getElementById("audio-toggle");
  paintMusic();
  paintSfx();
  if (musicBtn) {
    musicBtn.addEventListener("click", () => {
      setMusicOn(!isMusicOn());
      paintMusic();
    });
  }
  if (sfxBtn) {
    sfxBtn.addEventListener("click", () => {
      setSfxOn(!isSfxOn());
      paintSfx();
    });
  }
}
