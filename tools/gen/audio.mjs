// audio.mjs — chiptune music + synthesized SFX (WAV, 22050 Hz mono).
//
// A small pattern sequencer in the 16-bit console spirit: 2 pulse/triangle melodic
// channels + a bass channel + an LFSR-ish noise percussion channel, with a single echo
// tap for air. Six songs (menu waltz, grand finale waltz, one per level theme) are
// defined as note data below; everything renders deterministically.

export const SFX_RATE = 22050;

// --- oscillators / primitives -------------------------------------------------------

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

// Deterministic white noise with an exponential envelope (percussion / impacts). The
// `soft` flag low-passes it (two-sample average) for hats vs harsher crashes.
export function noise(dur, { vol = 0.5, decay = 12, soft = false, sr = SFX_RATE } = {}) {
  const n = Math.max(1, Math.floor(dur * sr));
  const out = new Array(n);
  let s = 1234567;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    let v = (s / 0x7fffffff) * 2 - 1;
    if (soft) v = (v + prev) / 2;
    prev = v;
    out[i] = v * vol * Math.exp(-decay * (i / sr)) * Math.min(1, (n - i) / 64);
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

// --- note names → Hz ------------------------------------------------------------------

const SEMI = { C: -9, "C#": -8, D: -7, "D#": -6, E: -5, F: -4, "F#": -3, G: -2, "G#": -1, A: 0, "A#": 1, B: 2 };
function noteHz(name) {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) throw new Error(`bad note: ${name}`);
  return 440 * Math.pow(2, (SEMI[m[1]] + (Number(m[2]) - 4) * 12) / 12);
}

// --- sequencer --------------------------------------------------------------------------

// A track is [[note|null, beats], …]; null = rest. Renders sequentially at the song tempo.
function renderTrack(notes, beat, { wave = "tri", vol = 0.4, decay = 2 } = {}) {
  return seq(...notes.map(([n, b]) => tone(n ? noteHz(n) : 0, beat * b, { wave, vol: n ? vol : 0, decay })));
}

// Percussion: one char per half-beat — k kick, h hat, s snare/brush, "." rest.
function renderPerc(pattern, beat, vol = 1) {
  const half = beat / 2;
  const hit = {
    k: () => mix(tone(110, Math.min(half, 0.1), { vol: 0.5 * vol, fEnd: 45, decay: 28 })),
    h: () => noise(Math.min(half, 0.05), { vol: 0.16 * vol, decay: 70 }),
    s: () => noise(Math.min(half, 0.1), { vol: 0.26 * vol, decay: 30, soft: true }),
  };
  return seq(
    ...[...pattern].map((c) => {
      const part = hit[c] ? hit[c]() : [];
      const cell = new Array(Math.floor(half * SFX_RATE)).fill(0);
      for (let i = 0; i < part.length && i < cell.length; i++) cell[i] = part[i];
      return cell;
    }),
  );
}

// One echo tap (delay + feedback-less) — cheap chiptune "air".
function echo(samples, delaySec = 0.22, gain = 0.22) {
  const d = Math.floor(delaySec * SFX_RATE);
  const out = samples.slice();
  for (let i = d; i < out.length; i++) out[i] += samples[i - d] * gain;
  return out;
}

// Assemble a song: melodic tracks + optional percussion, echo, normalize.
function song({ bpm, tracks, perc = null, percVol = 1, air = 0.22, peak = 0.6 }) {
  const beat = 60 / bpm;
  const parts = tracks.map(({ notes, ...opts }) => renderTrack(notes, beat, opts));
  if (perc) parts.push(renderPerc(perc, beat, percVol));
  return normalize(echo(mix(...parts), air), peak);
}

// Repeat a pattern of [note,beats] n times; small helper to keep song data compact.
const rep = (n, pat) => Array.from({ length: n }, () => pat).flat();

// --- the six songs -----------------------------------------------------------------------

// Menu: the light music-box waltz (3/4), now with a proper oom-pah-pah under it. ~16s.
export function buildMenuMusic() {
  const lead = [
    ["G4", 1], ["C5", 1], ["E5", 1], ["D5", 1], ["C5", 1], ["E5", 1],
    ["G4", 1], ["A4", 1], ["C5", 1], ["D5", 3],
    ["E5", 1], ["D5", 1], ["C5", 1], ["A4", 1], ["G4", 1], ["E4", 1],
    ["G4", 1], ["C5", 1], ["A4", 1], ["G4", 3],
    ["E4", 1], ["G4", 1], ["A4", 1], ["C5", 1], ["D5", 1], ["E5", 1],
    ["D5", 2], ["C5", 1], ["G4", 3],
  ];
  const bass = [
    ...rep(2, [["C3", 1], ["E3", 1], ["G3", 1]]), ...rep(2, [["A2", 1], ["C3", 1], ["E3", 1]]),
    ...rep(2, [["F2", 1], ["A2", 1], ["C3", 1]]), ...rep(2, [["G2", 1], ["B2", 1], ["D3", 1]]),
    ...rep(2, [["C3", 1], ["E3", 1], ["G3", 1]]), ["G2", 1], ["B2", 1], ["D3", 1], ["C3", 3],
  ];
  return song({
    bpm: 150,
    tracks: [
      { notes: lead, wave: "tri", vol: 0.42, decay: 2.4 },
      { notes: bass, wave: "sine", vol: 0.3, decay: 1.6 },
    ],
    peak: 0.58,
  });
}

// Finale: the grand ballroom waltz — fuller voicing, harmony in thirds. ~21s.
export function buildFinaleMusic() {
  const lead = [
    ["E5", 2], ["D5", 1], ["C5", 2], ["E5", 1], ["G5", 3],
    ["F5", 2], ["E5", 1], ["D5", 3], ["E5", 2], ["C5", 1], ["A4", 3],
    ["C5", 2], ["D5", 1], ["E5", 2], ["G5", 1], ["A4", 3],
    ["G5", 2], ["E5", 1], ["D5", 2], ["B4", 1], ["C5", 6],
  ];
  const harmony = [
    ["C5", 2], ["B4", 1], ["A4", 2], ["C5", 1], ["E5", 3],
    ["D5", 2], ["C5", 1], ["B4", 3], ["C5", 2], ["A4", 1], ["F4", 3],
    ["A4", 2], ["B4", 1], ["C5", 2], ["E5", 1], ["F5", 3],
    ["E5", 2], ["C5", 1], ["B4", 2], ["G4", 1], ["E4", 6],
  ];
  const bass = [
    ...rep(2, [["C3", 1], ["G3", 1], ["E3", 1]]), ...rep(2, [["G2", 1], ["D3", 1], ["B2", 1]]),
    ...rep(2, [["A2", 1], ["E3", 1], ["C3", 1]]), ...rep(2, [["F2", 1], ["C3", 1], ["A2", 1]]),
    ...rep(2, [["C3", 1], ["G3", 1], ["E3", 1]]), ...rep(2, [["G2", 1], ["D3", 1], ["B2", 1]]),
    ["C3", 6],
  ];
  return song({
    bpm: 132,
    tracks: [
      { notes: lead, wave: "tri", vol: 0.4, decay: 1.6 },
      { notes: harmony, wave: "sine", vol: 0.22, decay: 1.6 },
      { notes: bass, wave: "sine", vol: 0.3, decay: 1.2 },
    ],
    air: 0.28,
    peak: 0.6,
  });
}

// Forest: pastoral C-pentatonic stroll with a soft brush beat. ~27s.
export function buildForestMusic() {
  const lead = [
    ["E4", 1], ["G4", 1], ["A4", 2], ["G4", 1], ["E4", 1], ["D4", 2],
    ["C4", 1], ["D4", 1], ["E4", 2], ["G4", 1], ["A4", 1], ["G4", 2],
    ["A4", 1], ["C5", 1], ["D5", 2], ["C5", 1], ["A4", 1], ["G4", 2],
    ["E4", 1], ["G4", 1], ["A4", 1], ["G4", 1], ["E4", 1], ["D4", 1], ["C4", 2],
    [null, 1], ["G4", 1], ["A4", 1], ["C5", 1], ["A4", 2], ["G4", 2],
    ["E4", 1], ["D4", 1], ["C4", 1], ["D4", 1], ["E4", 4],
  ];
  const bass = rep(6, [["C3", 2], ["G3", 2], ["A2", 2], ["G2", 2]]);
  return song({
    bpm: 108,
    tracks: [
      { notes: lead, wave: "tri", vol: 0.4, decay: 1.8 },
      { notes: bass, wave: "sine", vol: 0.26, decay: 0.9 },
    ],
    perc: rep(12, "k.h.").join(""),
    percVol: 0.55,
    peak: 0.56,
  });
}

// Coral: slow, watery — long sine phrases over a deep pad, bubbly high arp. ~30s.
export function buildCoralMusic() {
  const lead = [
    ["A4", 3], ["C5", 3], ["B4", 2], ["G4", 4],
    ["E4", 3], ["G4", 3], ["A4", 6],
    ["C5", 3], ["E5", 3], ["D5", 2], ["B4", 4],
    ["A4", 3], ["G4", 3], ["A4", 6],
  ];
  const arp = rep(5, [
    // Brought the sparkle down a step from the old C6 top so it shimmers without piercing.
    [null, 1], ["E5", 0.5], ["A5", 0.5], [null, 2], ["A5", 0.5], ["E5", 0.5], [null, 3],
  ]);
  const bass = rep(2, [["A2", 8], ["F2", 8], ["C3", 8], ["E2", 8]]);
  return song({
    bpm: 76,
    tracks: [
      { notes: lead, wave: "sine", vol: 0.4, decay: 0.7 },
      { notes: arp, wave: "sine", vol: 0.11, decay: 5 },
      { notes: bass, wave: "tri", vol: 0.24, decay: 0.4 },
    ],
    air: 0.34,
    peak: 0.52,
  });
}

// Rooftops: dusk pentatonic (hirajoshi flavour) over a drone, thin square lead. ~26s.
export function buildRooftopsMusic() {
  const lead = [
    ["E4", 1], ["G4", 1], ["A4", 2], ["B4", 1], ["A4", 1], ["G4", 2],
    ["E4", 1], ["G4", 1], ["B4", 2], ["C5", 1], ["B4", 1], ["A4", 2],
    ["E5", 2], ["D5", 1], ["B4", 1], ["C5", 2], ["B4", 1], ["A4", 1],
    ["G4", 1], ["A4", 1], ["B4", 1], ["G4", 1], ["E4", 4],
    [null, 2], ["B4", 1], ["C5", 1], ["E5", 2], ["D5", 1], ["B4", 1],
    ["A4", 1], ["G4", 1], ["E4", 6],
  ];
  const drone = rep(4, [["E2", 6], ["E2", 6]]);
  return song({
    bpm: 112,
    tracks: [
      // Warm voicing: the old thin square top sounded metallic, so the lead is now a soft
      // sine sheen over a triangle body (no harsh odd-harmonic edge).
      { notes: lead, wave: "sine", vol: 0.14, decay: 2.2 },
      { notes: lead, wave: "tri", vol: 0.3, decay: 2.2 }, // doubled an octave-equal for body
      { notes: drone, wave: "tri", vol: 0.18, decay: 0.3 },
    ],
    perc: rep(12, "..h.").join(""),
    percVol: 0.5,
    air: 0.3,
    peak: 0.54,
  });
}

// Snow: a tiny music box (3/4) — high bell-like sines with fast decay, very sparse. ~24s.
export function buildSnowMusic() {
  // Dropped a full octave from the old C6-topped melody — the previous register sounded
  // shrill / "shot upward"; this sits in a cosier music-box range.
  const lead = [
    ["E4", 1], ["G4", 1], ["C5", 1], ["B4", 2], ["G4", 1],
    ["A4", 1], ["G4", 1], ["E4", 1], ["D4", 3],
    ["E4", 1], ["G4", 1], ["A4", 1], ["G4", 2], ["E4", 1],
    ["D4", 1], ["E4", 1], ["C4", 1], ["C4", 3],
    [null, 3], ["E4", 1], ["D4", 1], ["C4", 1],
    ["D4", 1], ["E4", 1], ["G4", 1], ["E4", 3],
  ];
  const bass = rep(5, [["C3", 1], ["G3", 1], ["E3", 1], ["A2", 1], ["E3", 1], ["C3", 1]]);
  return song({
    bpm: 100,
    tracks: [
      { notes: lead, wave: "sine", vol: 0.4, decay: 3.2 },
      { notes: bass, wave: "sine", vol: 0.2, decay: 2.5 },
    ],
    air: 0.3,
    peak: 0.5,
  });
}

// Garden: a waltz prelude (3/4) — it hints at the finale ballroom waltz from afar,
// dreamier and in minor, so the last two chapters feel like an approach. ~24s.
export function buildGardenMusic() {
  const lead = [
    ["A4", 2], ["C5", 1], ["E5", 2], ["D5", 1], ["C5", 3],
    ["B4", 2], ["D5", 1], ["C5", 2], ["A4", 1], ["E4", 3],
    ["A4", 2], ["C5", 1], ["E5", 2], ["G5", 1], ["F5", 3],
    ["E5", 2], ["C5", 1], ["B4", 2], ["D5", 1], ["A4", 6],
  ];
  const harmony = [
    [null, 3], ["A4", 3], [null, 3], ["E4", 3],
    [null, 3], ["C5", 3], [null, 3], ["A4", 3],
    [null, 1], ["E5", 1], [null, 1], ["C5", 3], [null, 6],
  ];
  const bass = [
    ...rep(2, [["A2", 1], ["E3", 1], ["C3", 1]]), ...rep(2, [["G2", 1], ["D3", 1], ["B2", 1]]),
    ...rep(2, [["A2", 1], ["E3", 1], ["C3", 1]]), ...rep(2, [["F2", 1], ["C3", 1], ["A2", 1]]),
    ...rep(2, [["A2", 1], ["E3", 1], ["C3", 1]]), ["E2", 1], ["B2", 1], ["G#3", 1], ["A2", 6],
  ];
  return song({
    bpm: 126,
    tracks: [
      { notes: lead, wave: "tri", vol: 0.4, decay: 2 },
      { notes: harmony, wave: "sine", vol: 0.16, decay: 3 },
      { notes: bass, wave: "sine", vol: 0.28, decay: 1.4 },
    ],
    air: 0.3,
    peak: 0.56,
  });
}

// Castle: a stately processional (4/4) — square fanfare over a walking bass and a slow
// ceremonial drum, the most regal track before the ball. ~25s.
export function buildCastleMusic() {
  const lead = [
    ["D4", 1.5], ["D4", 0.5], ["F4", 1], ["A4", 1], ["D5", 2], ["C5", 1], ["A4", 1],
    ["A#4", 1.5], ["A#4", 0.5], ["A4", 1], ["G4", 1], ["A4", 4],
    ["D5", 1.5], ["D5", 0.5], ["E5", 1], ["F5", 1], ["E5", 2], ["C5", 1], ["A4", 1],
    ["A#4", 1], ["A4", 1], ["G4", 1], ["E4", 1], ["D4", 4],
  ];
  const harmony = [
    ["F3", 4], ["G3", 4], ["F3", 2], ["E3", 2], ["F3", 4],
    ["F3", 4], ["A3", 4], ["G3", 2], ["C#4", 2], ["D4", 4],
  ];
  const bass = [
    ["D2", 2], ["D3", 2], ["A#2", 2], ["A2", 2], ["G2", 2], ["G3", 2], ["A2", 2], ["A2", 2],
    ["D2", 2], ["D3", 2], ["A#2", 2], ["C3", 2], ["G2", 2], ["A2", 2], ["D2", 4],
  ];
  return song({
    bpm: 100,
    tracks: [
      // Regal but not tinny: the fanfare top is a sine sheen instead of the old square,
      // letting the triangle body carry the melody warmly.
      { notes: lead, wave: "sine", vol: 0.12, decay: 1.8 },
      { notes: lead, wave: "tri", vol: 0.3, decay: 1.8 },
      { notes: harmony, wave: "sine", vol: 0.18, decay: 0.8 },
      { notes: bass, wave: "tri", vol: 0.26, decay: 0.9 },
    ],
    perc: rep(8, "k...s...").join(""),
    percVol: 0.6,
    air: 0.32,
    peak: 0.56,
  });
}

export const SONGS = {
  "menu-bgm": buildMenuMusic,
  "finale-bgm": buildFinaleMusic,
  "bgm-forest": buildForestMusic,
  "bgm-coral": buildCoralMusic,
  "bgm-rooftops": buildRooftopsMusic,
  "bgm-snow": buildSnowMusic,
  "bgm-garden": buildGardenMusic,
  "bgm-castle": buildCastleMusic,
};

// --- gameplay SFX --------------------------------------------------------------------------

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
    // Impact thud for the Mario-style stomp: a fast pitch drop + a puff of noise.
    stomp: mix(
      tone(220, 0.12, { vol: 0.5, wave: "square", fEnd: 70, decay: 16 }),
      noise(0.07, { vol: 0.3, decay: 40, soft: true }),
    ),
    // Spring mushroom "boing": a rising triangle chirp with a little overshoot wobble.
    spring: seq(
      tone(240, 0.06, { vol: 0.4, wave: "tri", fEnd: 180 }),
      tone(200, 0.28, { vol: 0.45, wave: "tri", fEnd: 1050, decay: 4 }),
    ),
    // Checkpoint flag: a warm two-note chime + held sparkle.
    checkpoint: seq(
      tone(784, 0.09, { vol: 0.4, wave: "tri" }),
      mix(tone(1047, 0.5, { vol: 0.35, wave: "tri", decay: 4 }), tone(1568, 0.5, { vol: 0.18, decay: 6 })),
    ),
    // Crumbling platform: low rumble + falling debris crackle.
    crumble: mix(
      tone(140, 0.3, { vol: 0.35, wave: "saw", fEnd: 60, decay: 7 }),
      noise(0.3, { vol: 0.3, decay: 10, soft: true }),
    ),
    // Skid: a tiny scuff of noise (played very quietly by sfx.js).
    skid: noise(0.12, { vol: 0.4, decay: 22, soft: true }),
  };
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
