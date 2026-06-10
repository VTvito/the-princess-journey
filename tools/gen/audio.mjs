// audio.mjs — synthesized WAV music + SFX (ported unchanged from the old generator;
// the chiptune sequencer upgrade lands in a later phase). Simple oscillators with short
// anti-click fades and optional exponential decay, mixed and normalized, 22050 Hz mono.

export const SFX_RATE = 22050;

function osc(phase, wave) {
  if (wave === "tri") return (2 / Math.PI) * Math.asin(Math.sin(phase));
  if (wave === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  if (wave === "saw") {
    const x = phase / (2 * Math.PI);
    return 2 * (x - Math.floor(x + 0.5));
  }
  return Math.sin(phase);
}

export function tone(freq, dur, { vol = 0.5, wave = "sine", decay = 0, fEnd = null, sr = SFX_RATE } = {}) {
  const n = Math.max(1, Math.floor(dur * sr));
  const atk = Math.max(1, Math.floor(0.004 * sr));
  const rel = Math.max(1, Math.floor(0.006 * sr));
  const out = new Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const f = fEnd === null ? freq : freq + (fEnd - freq) * (i / Math.max(1, n - 1));
    phase += (2 * Math.PI * f) / sr;
    let s = osc(phase, wave) * vol;
    if (decay > 0) s *= Math.exp(-decay * (i / sr));
    s *= Math.min(1, i / atk); // fade in
    s *= Math.min(1, (n - i) / rel); // fade out
    out[i] = s;
  }
  return out;
}

export const seq = (...parts) => parts.flat();

export function mix(...parts) {
  const n = Math.max(...parts.map((p) => p.length));
  const out = new Array(n).fill(0);
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i];
  return out;
}

export function normalize(samples, peak = 0.85) {
  let m = 0;
  for (const s of samples) m = Math.max(m, Math.abs(s));
  if (m <= 1e-9) return samples;
  const g = peak / m;
  return samples.map((s) => s * g);
}

export function buildSfx() {
  return {
    jump: tone(420, 0.13, { vol: 0.5, wave: "tri", fEnd: 780, decay: 6 }),
    collect: seq(tone(1175, 0.05, { vol: 0.45 }), tone(1568, 0.11, { vol: 0.5, decay: 8 })),
    coin: seq(
      tone(988, 0.07, { vol: 0.45, wave: "tri" }),
      tone(1319, 0.42, { vol: 0.45, wave: "tri", decay: 6 }),
    ),
    oops: tone(659, 0.32, { vol: 0.5, fEnd: 415, decay: 3 }),
    goal: seq(
      tone(523, 0.08, { vol: 0.4, wave: "tri" }),
      tone(659, 0.08, { vol: 0.4, wave: "tri" }),
      tone(784, 0.08, { vol: 0.4, wave: "tri" }),
      tone(1047, 0.3, { vol: 0.5, wave: "tri", decay: 4 }),
    ),
    win: seq(
      tone(523, 0.1, { vol: 0.4, wave: "tri" }),
      tone(659, 0.1, { vol: 0.4, wave: "tri" }),
      tone(784, 0.1, { vol: 0.4, wave: "tri" }),
      mix(
        tone(523, 0.7, { vol: 0.22, decay: 2.2 }),
        tone(659, 0.7, { vol: 0.22, decay: 2.2 }),
        tone(784, 0.7, { vol: 0.22, decay: 2.2 }),
        tone(1047, 0.7, { vol: 0.22, decay: 2.2 }),
      ),
    ),
    select: seq(tone(784, 0.04, { vol: 0.32 }), tone(1175, 0.07, { vol: 0.32, decay: 12 })),
  };
}

// --- Background music (pentatonic → always consonant; soft + low for a gentle loop) -------
const NOTE = {
  C3: 130.81, E3: 164.81, G3: 196.0, A3: 220.0,
  E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25,
};

// Menu: a light music-box waltz over a soft low bass (~13s loop).
export function buildMenuMusic() {
  const b = 0.4; // seconds per beat
  const N = NOTE;
  const m = (f, beats = 1) => tone(f, b * beats, { vol: 0.5, wave: "sine", decay: 2.6 });
  const bass = (f, beats) => tone(f, b * beats, { vol: 0.3, wave: "tri", decay: 0.8 });
  const melody = seq(
    m(N.G4), m(N.C5), m(N.E5), m(N.D5),
    m(N.C5), m(N.E5), m(N.G4), m(N.A4),
    m(N.G4), m(N.A4), m(N.C5), m(N.D5),
    m(N.E5, 2), m(N.D5, 2),
    m(N.C5), m(N.A4), m(N.G4), m(N.E4),
    m(N.G4), m(N.C5), m(N.A4), m(N.G4),
    m(N.E4), m(N.G4), m(N.A4), m(N.C5),
    m(N.G4, 2), m(0, 2),
  );
  const bassline = seq(
    bass(N.C3, 4), bass(N.A3, 4), bass(N.G3, 4), bass(N.E3, 4),
    bass(N.C3, 4), bass(N.G3, 4), bass(N.A3, 4), bass(N.G3, 4),
  );
  return normalize(mix(melody, bassline), 0.62);
}

// Gameplay: a slower, sparser, airier loop that stays out of the way (~26s loop).
export function buildGameMusic() {
  const b = 0.8;
  const N = NOTE;
  const lead = (f, beats = 2) => tone(f, b * beats, { vol: 0.4, wave: "sine", decay: 1.1 });
  const pad = (f, beats) => tone(f, b * beats, { vol: 0.2, wave: "tri", decay: 0.5 });
  const melody = seq(
    lead(N.C5), lead(N.G4), lead(N.A4), lead(N.E5),
    lead(N.D5), lead(N.C5), lead(N.G4), lead(N.A4),
    lead(N.E4), lead(N.G4), lead(N.C5), lead(N.D5),
    lead(N.E5), lead(N.D5), lead(N.C5, 4),
  );
  const padline = seq(pad(N.C3, 8), pad(N.A3, 8), pad(N.E3, 8), pad(N.G3, 8));
  return normalize(mix(melody, padline), 0.5);
}

export function encodeWav(samples, sampleRate = SFX_RATE) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 0x7fff, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
