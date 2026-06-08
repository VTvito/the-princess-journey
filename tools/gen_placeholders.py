#!/usr/bin/env python3
"""Generate swap-ready placeholder assets for "The Princess Journey".

Uses only the Python standard library (no pip installs). Run once:

    python tools/gen_placeholders.py

Sprites: 64x96 RGBA PNGs (transparent background) -- simple drawn heroines (head, hair,
dress, limbs) plus matching clothing-skin overlays, all on one canvas so the layers line
up (spec section 3). Replace the files in assets/sprites with real art later, keeping the
same filenames (or update ASSETS in src/config.js).

Audio: gentle looping background music (a menu waltz + a softer gameplay loop) plus a set
of tiny synthesized gameplay SFX (jump / collect / coin / oops / goal / win / select).
Replace the files in assets/audio later with real sound, keeping the filenames (or update
ASSETS.sounds in src/config.js if any extension changes).

This mirrors tools/gen-placeholders.mjs (the canonical Node version); keep the two in sync.
"""

import math
import os
import struct
import wave
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")
AUDIO_DIR = os.path.join(ROOT, "assets", "audio")


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def encode_png(width: int, height: int, pixels: bytearray) -> bytes:
    """pixels: RGBA bytes, length width*height*4."""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (none)
        raw.extend(pixels[y * stride : y * stride + stride])
    idat = zlib.compress(bytes(raw), 9)
    return sig + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", idat) + _png_chunk(b"IEND", b"")


# --- Sprite drawing: a tiny raster toolkit on a width×height RGBA buffer, used to compose
# simple-but-readable heroines (head, hair, dress, limbs) instead of flat discs. Heroines and
# their skins share ONE canvas size so the skin layers line up at any scale. (Mirrors the
# helpers in tools/gen-placeholders.mjs.)
SPRITE_W = 64
SPRITE_H = 96  # taller than wide so the heroine reads as a character, not a ball

SKIN = (243, 207, 178)  # shared incarnato
SHOE = (70, 54, 70)
EYE = (44, 36, 50)


def blank(w: int, h: int) -> bytearray:
    return bytearray(w * h * 4)  # zero-filled => fully transparent


def pset(buf: bytearray, w: int, x, y, color, a: int = 255) -> None:
    x, y = round(x), round(y)
    if x < 0 or y < 0 or x >= w:
        return
    i = (y * w + x) * 4
    if i < 0 or i + 3 >= len(buf):
        return
    buf[i], buf[i + 1], buf[i + 2], buf[i + 3] = color[0], color[1], color[2], a


def fill_rect(buf, w, x0, y0, x1, y1, color, a: int = 255) -> None:
    for y in range(round(y0), round(y1)):
        for x in range(round(x0), round(x1)):
            pset(buf, w, x, y, color, a)


def fill_disc(buf, w, cx, cy, r, color, a: int = 255) -> None:
    for y in range(math.floor(cy - r), math.ceil(cy + r) + 1):
        for x in range(math.floor(cx - r), math.ceil(cx + r) + 1):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy <= r * r:
                pset(buf, w, x, y, color, a)


def fill_trap(buf, w, y_top, y_bot, cx, half_top, half_bot, color, a: int = 255) -> None:
    """Vertical trapezoid centred on cx: half-width eases half_top->half_bot over y_top->y_bot."""
    for y in range(round(y_top), round(y_bot)):
        f = (y - y_top) / max(1, y_bot - y_top)
        half = half_top + (half_bot - half_top) * f
        fill_rect(buf, w, cx - half, y, cx + half + 1, y + 1, color, a)


def darken(c, f: float = 0.82):
    return [round(v * f) for v in c]


def make_heroine(hair, dress, hair_len: int = 52, skin=SKIN) -> bytearray:
    w, h, cx = SPRITE_W, SPRITE_H, SPRITE_W / 2
    buf = blank(w, h)
    dress2 = darken(dress)
    # Hair behind the head + locks falling past the shoulders.
    fill_disc(buf, w, cx, 23, 20, hair)
    fill_rect(buf, w, cx - 17, 23, cx + 17, hair_len, hair)
    # Dress (chest -> hem) with a darker hem band.
    fill_trap(buf, w, 47, 86, cx, 10, 22, dress)
    fill_trap(buf, w, 80, 86, cx, 22, 22, dress2)
    # Sleeves + hands.
    fill_rect(buf, w, cx - 22, 50, cx - 13, 70, dress)
    fill_rect(buf, w, cx + 13, 50, cx + 22, 70, dress)
    fill_disc(buf, w, cx - 18, 71, 4, skin)
    fill_disc(buf, w, cx + 18, 71, 4, skin)
    # Legs + shoes.
    fill_rect(buf, w, cx - 7, 84, cx - 1, 92, skin)
    fill_rect(buf, w, cx + 1, 84, cx + 7, 92, skin)
    fill_rect(buf, w, cx - 8, 91, cx - 0.5, 96, SHOE)
    fill_rect(buf, w, cx + 0.5, 91, cx + 8, 96, SHOE)
    # Neck + face.
    fill_rect(buf, w, cx - 4, 38, cx + 4, 46, skin)
    fill_disc(buf, w, cx, 28, 15, skin)
    # Hair fringe over the forehead + side framing of the face.
    fill_trap(buf, w, 13, 24, cx, 16, 13, hair)
    fill_rect(buf, w, cx - 16, 22, cx - 11, 40, hair)
    fill_rect(buf, w, cx + 11, 22, cx + 16, 40, hair)
    # Eyes, blush, a small smile.
    fill_disc(buf, w, cx - 6, 29, 2.6, EYE)
    fill_disc(buf, w, cx + 6, 29, 2.6, EYE)
    fill_disc(buf, w, cx - 9, 34, 2.3, (233, 150, 160), 150)
    fill_disc(buf, w, cx + 9, 34, 2.3, (233, 150, 160), 150)
    fill_rect(buf, w, cx - 2, 35, cx + 3, 36, (176, 88, 92))
    return buf


def make_skin(kind: str, color) -> bytearray:
    w, cx = SPRITE_W, SPRITE_W / 2
    buf = blank(w, SPRITE_H)
    if kind == "skirt":
        fill_trap(buf, w, 63, 90, cx, 11, 27, color)
        fill_trap(buf, w, 85, 90, cx, 27, 27, darken(color, 0.85))
    elif kind == "bodice":
        fill_trap(buf, w, 47, 67, cx, 10, 14, color)
    elif kind == "necklace":
        fill_rect(buf, w, cx - 7, 44, cx + 7, 47, color)
        fill_disc(buf, w, cx, 49, 2.6, color)
    elif kind == "crown":
        fill_rect(buf, w, cx - 12, 8, cx + 12, 13, color)
        for off in (-11, -3.5, 4):
            fill_trap(buf, w, 1, 8, cx + off + 3.5, 0.5, 3.5, color)
    return buf


def make_logo() -> bytearray:
    w, cx = SPRITE_W, SPRITE_W / 2
    gold, gem = (212, 175, 55), (235, 220, 150)
    buf = blank(w, SPRITE_H)
    fill_rect(buf, w, cx - 20, 52, cx + 20, 64, gold)
    for off in (-18, -6, 6):
        fill_trap(buf, w, 30, 52, cx + off + 6, 1, 6, gold)
    fill_disc(buf, w, cx - 12, 30, 3, gem)
    fill_disc(buf, w, cx, 26, 3, gem)
    fill_disc(buf, w, cx + 12, 30, 3, gem)
    return buf


# Skin layers (spec §3): each on the same 64x96 transparent canvas, positioned to overlay
# the base body so the stack (skirt < bodice < necklace < crown) lines up.
SKINS = [
    ("skirt.png", "skirt", (212, 175, 55)),
    ("bodice.png", "bodice", (231, 150, 173)),
    ("necklace.png", "necklace", (255, 236, 170)),
    ("crown.png", "crown", (212, 175, 55)),
]


# Background music is composed from the same tone() synth as the SFX -- see
# build_menu_music / build_game_music below (pentatonic, soft, low-volume loops). This
# replaces the old single-sine "menu-bgm" placeholder that produced the grating drone.


# --- Sound effects (gameplay juiciness) -------------------------------------------
# Tiny synthesized WAVs (same stdlib-only approach as the bgm). Each is built from simple
# oscillators with a short anti-click attack/release and an optional exponential decay.

SFX_RATE = 22050


def _osc(phase: float, wave: str) -> float:
    if wave == "tri":
        return (2.0 / math.pi) * math.asin(math.sin(phase))
    if wave == "square":
        return 1.0 if math.sin(phase) >= 0 else -1.0
    if wave == "saw":
        x = phase / (2 * math.pi)
        return 2.0 * (x - math.floor(x + 0.5))
    return math.sin(phase)


def tone(freq, dur, vol=0.5, wave="sine", decay=0.0, f_end=None, sr=SFX_RATE):
    """One oscillator note. Accumulates phase (so f_end gives a clean pitch glide), with a
    short anti-click fade in/out and an optional exponential amplitude decay."""
    n = max(1, int(dur * sr))
    atk = max(1, int(0.004 * sr))
    rel = max(1, int(0.006 * sr))
    out = []
    phase = 0.0
    for i in range(n):
        f = freq if f_end is None else freq + (f_end - freq) * (i / max(1, n - 1))
        phase += 2 * math.pi * f / sr
        s = _osc(phase, wave) * vol
        if decay > 0:
            s *= math.exp(-decay * (i / sr))
        s *= min(1.0, i / atk)        # fade in
        s *= min(1.0, (n - i) / rel)  # fade out
        out.append(s)
    return out


def seq(*parts):
    out = []
    for p in parts:
        out.extend(p)
    return out


def mix(*parts):
    n = max(len(p) for p in parts)
    out = [0.0] * n
    for p in parts:
        for i, v in enumerate(p):
            out[i] += v
    return out


def normalize(samples, peak=0.85):
    m = max((abs(s) for s in samples), default=0.0)
    if m <= 1e-9:
        return samples
    g = peak / m
    return [s * g for s in samples]


def build_sfx():
    """{name: samples} for every gameplay sound. Frequencies are musical so the cues feel
    pleasant rather than beepy; the 'oops' is a soft downward glide (it's a gentle gift, not
    a harsh death sound), and 'coin' is a two-note arcade chime that fits the Insert-Coin gag."""
    return {
        "jump": tone(420, 0.13, vol=0.5, wave="tri", f_end=780, decay=6),
        "collect": seq(
            tone(1175, 0.05, vol=0.45, wave="sine"),
            tone(1568, 0.11, vol=0.5, wave="sine", decay=8),
        ),
        "coin": seq(
            tone(988, 0.07, vol=0.45, wave="tri"),
            tone(1319, 0.42, vol=0.45, wave="tri", decay=6),
        ),
        "oops": tone(659, 0.32, vol=0.5, wave="sine", f_end=415, decay=3),
        "goal": seq(
            tone(523, 0.08, vol=0.4, wave="tri"),
            tone(659, 0.08, vol=0.4, wave="tri"),
            tone(784, 0.08, vol=0.4, wave="tri"),
            tone(1047, 0.30, vol=0.5, wave="tri", decay=4),
        ),
        "win": seq(
            tone(523, 0.10, vol=0.4, wave="tri"),
            tone(659, 0.10, vol=0.4, wave="tri"),
            tone(784, 0.10, vol=0.4, wave="tri"),
            mix(
                tone(523, 0.70, vol=0.22, wave="sine", decay=2.2),
                tone(659, 0.70, vol=0.22, wave="sine", decay=2.2),
                tone(784, 0.70, vol=0.22, wave="sine", decay=2.2),
                tone(1047, 0.70, vol=0.22, wave="sine", decay=2.2),
            ),
        ),
        "select": seq(
            tone(784, 0.04, vol=0.32, wave="sine"),
            tone(1175, 0.07, vol=0.32, wave="sine", decay=12),
        ),
    }


# --- Background music (pentatonic -> always consonant; soft + low for a gentle loop) -------
NOTE = {
    "C3": 130.81, "E3": 164.81, "G3": 196.0, "A3": 220.0,
    "E4": 329.63, "G4": 392.0, "A4": 440.0,
    "C5": 523.25, "D5": 587.33, "E5": 659.25,
}


def build_menu_music():
    """Menu: a light music-box waltz over a soft low bass (~13s loop)."""
    b = 0.4  # seconds per beat
    N = NOTE
    def m(f, beats=1):
        return tone(f, b * beats, vol=0.5, wave="sine", decay=2.6)
    def bass(f, beats):
        return tone(f, b * beats, vol=0.3, wave="tri", decay=0.8)
    melody = seq(
        m(N["G4"]), m(N["C5"]), m(N["E5"]), m(N["D5"]),
        m(N["C5"]), m(N["E5"]), m(N["G4"]), m(N["A4"]),
        m(N["G4"]), m(N["A4"]), m(N["C5"]), m(N["D5"]),
        m(N["E5"], 2), m(N["D5"], 2),
        m(N["C5"]), m(N["A4"]), m(N["G4"]), m(N["E4"]),
        m(N["G4"]), m(N["C5"]), m(N["A4"]), m(N["G4"]),
        m(N["E4"]), m(N["G4"]), m(N["A4"]), m(N["C5"]),
        m(N["G4"], 2), m(0, 2),
    )
    bassline = seq(
        bass(N["C3"], 4), bass(N["A3"], 4), bass(N["G3"], 4), bass(N["E3"], 4),
        bass(N["C3"], 4), bass(N["G3"], 4), bass(N["A3"], 4), bass(N["G3"], 4),
    )
    return normalize(mix(melody, bassline), 0.62)


def build_game_music():
    """Gameplay: a slower, sparser, airier loop that stays out of the way (~26s loop)."""
    b = 0.8
    N = NOTE
    def lead(f, beats=2):
        return tone(f, b * beats, vol=0.4, wave="sine", decay=1.1)
    def pad(f, beats):
        return tone(f, b * beats, vol=0.2, wave="tri", decay=0.5)
    melody = seq(
        lead(N["C5"]), lead(N["G4"]), lead(N["A4"]), lead(N["E5"]),
        lead(N["D5"]), lead(N["C5"]), lead(N["G4"]), lead(N["A4"]),
        lead(N["E4"]), lead(N["G4"]), lead(N["C5"]), lead(N["D5"]),
        lead(N["E5"]), lead(N["D5"]), lead(N["C5"], 4),
    )
    padline = seq(pad(N["C3"], 8), pad(N["A3"], 8), pad(N["E3"], 8), pad(N["G3"], 8))
    return normalize(mix(melody, padline), 0.5)


def make_sfx(path: str, samples, sr: int = SFX_RATE) -> None:
    frames = bytearray()
    for s in samples:
        frames.extend(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 0x7FFF)))
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(bytes(frames))


# Heroines (spec §3): dress = signature palette colour; hair + hair_len give each a distinct
# silhouette. (The logo is a gold crown emblem, generated separately via make_logo.)
HEROINES = [
    ("anna.png", (92, 60, 40), (167, 199, 231), 54),        # castani mossi, piumino carta da zucchero
    ("sognatrice.png", (168, 96, 52), (240, 198, 116), 68),  # rame/oro lunghi (Belle/Ariel)
    ("avventuriera.png", (46, 36, 38), (196, 122, 88), 46),  # scuri, nomade terracotta
]


def main() -> None:
    os.makedirs(SPRITES_DIR, exist_ok=True)
    os.makedirs(AUDIO_DIR, exist_ok=True)

    for name, hair, dress, hair_len in HEROINES:
        px = make_heroine(hair, dress, hair_len)
        with open(os.path.join(SPRITES_DIR, name), "wb") as f:
            f.write(encode_png(SPRITE_W, SPRITE_H, px))
        print("sprite ->", os.path.join("assets", "sprites", name))
    with open(os.path.join(SPRITES_DIR, "logo.png"), "wb") as f:
        f.write(encode_png(SPRITE_W, SPRITE_H, make_logo()))
    print("sprite ->", os.path.join("assets", "sprites", "logo.png"))

    for name, kind, color in SKINS:
        px = make_skin(kind, color)
        with open(os.path.join(SPRITES_DIR, name), "wb") as f:
            f.write(encode_png(SPRITE_W, SPRITE_H, px))
        print("skin   ->", os.path.join("assets", "sprites", name))

    make_sfx(os.path.join(AUDIO_DIR, "menu-bgm.wav"), build_menu_music())
    print("audio  ->", os.path.join("assets", "audio", "menu-bgm.wav"))
    make_sfx(os.path.join(AUDIO_DIR, "game-bgm.wav"), build_game_music())
    print("audio  ->", os.path.join("assets", "audio", "game-bgm.wav"))

    for name, samples in build_sfx().items():
        path = os.path.join(AUDIO_DIR, f"{name}.wav")
        make_sfx(path, normalize(samples))
        print("sfx    ->", os.path.join("assets", "audio", f"{name}.wav"))

    print("\nDone. Placeholder assets generated.")


if __name__ == "__main__":
    main()
