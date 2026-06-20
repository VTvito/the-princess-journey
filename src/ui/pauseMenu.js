// pauseMenu.js — the in-game pause overlay (Fase 1b).
//
// Pure DOM, like src/ui/insertCoin.js: an HTML overlay over the canvas, NOT a Kaplay
// object, so its buttons stay clickable while the game scene freezes the world
// (k.getTreeRoot().paused = true). The game scene calls showPause({onResume, onRestart,
// onMenu}) when the player pauses; each button hides the overlay and runs its callback.
// Markup lives in index.html; this module just toggles + wires it.

let overlay = null;
let btnResume = null;
let btnSettings = null;
let btnRestart = null;
let btnMenu = null;

function els() {
  overlay ||= document.getElementById("pause-overlay");
  btnResume ||= document.getElementById("pause-resume");
  btnSettings ||= document.getElementById("pause-settings");
  btnRestart ||= document.getElementById("pause-restart");
  btnMenu ||= document.getElementById("pause-menu");
}

/**
 * Show the pause overlay and wire its actions. (Settings stacks above this overlay, so it
 * stays shown underneath and reappears when settings closes.)
 * @param {{onResume:Function, onSettings:Function, onRestart:Function, onMenu:Function}} cb
 */
export function showPause({ onResume, onSettings, onRestart, onMenu } = {}) {
  els();
  if (!overlay) return;
  overlay.hidden = false;
  // Assign (not addEventListener) so re-opening the menu never stacks handlers.
  if (btnResume) btnResume.onclick = () => onResume?.();
  if (btnSettings) btnSettings.onclick = () => onSettings?.();
  if (btnRestart) btnRestart.onclick = () => onRestart?.();
  if (btnMenu) btnMenu.onclick = () => onMenu?.();
}

/** Hide the overlay (also called defensively when entering other scenes). */
export function hidePause() {
  els();
  if (overlay) overlay.hidden = true;
}
