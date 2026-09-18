// Analisis audio di browser (Web Audio API): pitch, tempo, nada dasar, not angka.
// Semua angka berasal dari sinyal audio nyata — tidak ada tebakan acak.

export type DetectedNote = {
  start: number;
  end: number;
  midi: number | null; // null = istirahat
  confidence: number;
};

export type NotationSection = {
  section: string;
  notation: string;
  start: number;
  end: number;
  confidence: number;
};

export type AudioAnalysis = {
  duration: number;
  bpm: number;
  key: string;
  keyRoot: number; // pitch class tonic
  scale: "mayor" | "minor";
  timeSignature: string;
  rangeLow: string;
  rangeHigh: string;
  confidence: number;
  notes: DetectedNote[];
  sections: NotationSection[];
  warnings: string[];
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

export function midiToName(midi: number) {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12] ?? "C";
  return `${name}${Math.floor(midi / 12) - 1}`;
}

async function decode(file: File): Promise<AudioBuffer> {
  const Ctx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } finally {
    void ctx.close();
  }
}

function toMono(buffer: AudioBuffer): Float32Array {
  const len = buffer.length;
  const out = new Float32Array(len);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += data[i]! / buffer.numberOfChannels;
  }
  return out;
}

// Deteksi pitch satu frame dengan autokorelasi ternormalisasi (mirip YIN sederhana).
function detectPitch(frame: Float32Array, sampleRate: number): { freq: number; clarity: number } {
  const size = frame.length;
  const minLag = Math.floor(sampleRate / 1000); // 1000 Hz
  const maxLag = Math.floor(sampleRate / 70); // 70 Hz
  let bestLag = -1;
  let bestValue = 0;
  let energy = 0;
  for (let i = 0; i < size; i++) energy += frame[i]! * frame[i]!;
  if (energy < 1e-4) return { freq: 0, clarity: 0 };

  for (let lag = minLag; lag <= Math.min(maxLag, size - 1); lag++) {
    let corr = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < size - lag; i++) {
      const a = frame[i]!;
      const b = frame[i + lag]!;
      corr += a * b;
      norm1 += a * a;
      norm2 += b * b;
    }
    const value = corr / (Math.sqrt(norm1 * norm2) + 1e-9);
    if (value > bestValue) {
      bestValue = value;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || bestValue < 0.82) return { freq: 0, clarity: bestValue };
  return { freq: sampleRate / bestLag, clarity: bestValue };
}

function estimateBpm(mono: Float32Array, sampleRate: number): number {
  const hop = 512;
  const frames = Math.floor(mono.length / hop);
  const envelope = new Float32Array(frames);
  let prev = 0;
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = 0; i < hop; i++) {
      const v = mono[f * hop + i] ?? 0;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / hop);
    envelope[f] = Math.max(0, rms - prev);
    prev = rms;
  }
  const fps = sampleRate / hop;
  const minLag = Math.round(fps * 60 / 200); // 200 BPM
  const maxLag = Math.round(fps * 60 / 60); // 60 BPM
  let bestLag = minLag;
  let best = -Infinity;
  for (let lag = minLag; lag <= Math.min(maxLag, frames - 2); lag++) {
    let sum = 0;
    for (let i = 0; i + lag < frames; i++) sum += envelope[i]! * envelope[i + lag]!;
    const score = sum / (frames - lag);
    if (score > best) {
      best = score;
      bestLag = lag;
    }
  }
  const bpm = (60 * fps) / bestLag;
  if (!Number.isFinite(bpm) || bpm <= 0) return 90;
  let value = bpm;
  while (value < 65) value *= 2;
  while (value > 190) value /= 2;
  return Math.round(value);
}

function detectKey(notes: DetectedNote[]) {
  const hist = new Array(12).fill(0);
  for (const note of notes) {
    if (note.midi == null) continue;
    hist[((note.midi % 12) + 12) % 12] += note.end - note.start;
  }
  const total = hist.reduce((a, b) => a + b, 0) || 1;
  const norm = hist.map((v) => v / total);

  function correlate(profile: number[], shift: number) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += norm[(i + shift) % 12]! * profile[i]!;
    return sum;
  }

  let bestRoot = 0;
  let bestScale: "mayor" | "minor" = "mayor";
  let bestScore = -Infinity;
  for (let root = 0; root < 12; root++) {
    const major = correlate(MAJOR_PROFILE, root);
    const minor = correlate(MINOR_PROFILE, root);
    if (major > bestScore) { bestScore = major; bestRoot = root; bestScale = "mayor"; }
    if (minor > bestScore) { bestScore = minor; bestRoot = root; bestScale = "minor"; }
  }
  return { root: bestRoot, scale: bestScale, strength: bestScore };
}

function degreeFor(midi: number, root: number, scale: "mayor" | "minor") {
  const steps = scale === "mayor" ? MAJOR_STEPS : MINOR_STEPS;
  const diff = midi - root;
  const octave = Math.floor(diff / 12);
  const within = ((diff % 12) + 12) % 12;
  let index = steps.indexOf(within);
  let accidental = "";
  if (index === -1) {
    // nada kromatis: bulatkan ke derajat terdekat di bawah, tandai dengan '#'
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i]! < within) { index = i; accidental = "#"; break; }
    }
    if (index === -1) index = 0;
  }
  return { degree: index + 1, octave, accidental };
}

function octaveMark(token: string, octave: number) {
  if (octave > 0) return token + "'".repeat(Math.min(octave, 2));
  if (octave < 0) return token + ".".repeat(Math.min(-octave, 2));
  return token;
}

function buildNotation(
  notes: DetectedNote[],
  root: number,
  scale: "mayor" | "minor",
  bpm: number,
): string[] {
  const beat = 60 / bpm;
  const tokens: string[] = [];
  for (const note of notes) {
    const beats = Math.max(1, Math.round((note.end - note.start) / (beat / 2))); // resolusi 1/8
    if (note.midi == null) {
      for (let i = 0; i < beats; i++) tokens.push("0");
      continue;
    }
    const { degree, octave, accidental } = degreeFor(note.midi, root, scale);
    tokens.push(octaveMark(`${accidental}${degree}`, octave));
    for (let i = 1; i < beats; i++) tokens.push("-");
  }
  // 8 token = 1 birama 4/4 (resolusi 1/8)
  const bars: string[] = [];
  for (let i = 0; i < tokens.length; i += 8) bars.push(tokens.slice(i, i + 8).join(" "));
  return bars;
}

export async function analyzeAudio(
  file: File,
  onStep?: (index: number) => void,
): Promise<AudioAnalysis> {
  onStep?.(1);
  const buffer = await decode(file);
  const sampleRate = buffer.sampleRate;
  const mono = toMono(buffer);
  const duration = buffer.duration;
  const warnings: string[] = [];

  onStep?.(2);
  const bpm = estimateBpm(mono, sampleRate);

  onStep?.(3);
  // Deteksi pitch per frame.
  const frameSize = Math.round(sampleRate * 0.046);
  const hop = Math.round(sampleRate * 0.023);
  const raw: { time: number; midi: number | null; clarity: number }[] = [];
  for (let pos = 0; pos + frameSize < mono.length; pos += hop) {
    const frame = mono.subarray(pos, pos + frameSize);
    const { freq, clarity } = detectPitch(frame as Float32Array, sampleRate);
    const midi = freq > 0 ? Math.round(69 + 12 * Math.log2(freq / 440)) : null;
    raw.push({ time: pos / sampleRate, midi, clarity });
    if (raw.length % 200 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  onStep?.(5);
  // Median filter agar pitch tidak loncat-loncat.
  const smoothed = raw.map((item, i) => {
    const window = raw.slice(Math.max(0, i - 2), i + 3).map((x) => x.midi).filter((m): m is number => m != null);
    if (window.length < 2) return { ...item, midi: null };
    window.sort((a, b) => a - b);
    return { ...item, midi: window[Math.floor(window.length / 2)]! };
  });

  onStep?.(6);
  const notes: DetectedNote[] = [];
  const frameDur = hop / sampleRate;
  let current: DetectedNote | null = null;
  for (const item of smoothed) {
    if (current && current.midi === item.midi) {
      current.end = item.time + frameDur;
      current.confidence = (current.confidence + item.clarity) / 2;
      continue;
    }
    if (current) notes.push(current);
    current = { start: item.time, end: item.time + frameDur, midi: item.midi, confidence: item.clarity };
  }
  if (current) notes.push(current);

  const cleaned = notes.filter((n) => n.end - n.start >= 0.08);
  const pitched = cleaned.filter((n) => n.midi != null);
  if (pitched.length < 8) {
    warnings.push("Melodi utama sulit dikenali — audio mungkin terlalu ramai atau bising.");
  }

  const { root, scale, strength } = detectKey(pitched);

  onStep?.(7);
  const bars = buildNotation(cleaned, root, scale, bpm);

  // Bagi jadi bagian tiap 8 birama.
  const sections: NotationSection[] = [];
  const perSection = 8;
  const secDur = duration / Math.max(1, Math.ceil(bars.length / perSection));
  for (let i = 0; i < bars.length; i += perSection) {
    const idx = sections.length;
    sections.push({
      section: `Bagian ${idx + 1}`,
      notation: bars.slice(i, i + perSection).join(" | "),
      start: idx * secDur,
      end: Math.min(duration, (idx + 1) * secDur),
      confidence: Math.round(
        (pitched.slice(0, 50).reduce((a, n) => a + n.confidence, 0) / Math.max(1, Math.min(50, pitched.length))) * 100,
      ),
    });
  }
  if (!sections.length) {
    warnings.push("Tidak ada nada yang cukup jelas untuk dijadikan not angka.");
  }

  const midis = pitched.map((n) => n.midi!) as number[];
  const avgClarity = pitched.length
    ? pitched.reduce((a, n) => a + n.confidence, 0) / pitched.length
    : 0;
  const confidence = Math.round(Math.max(0, Math.min(1, avgClarity * 0.7 + Math.min(1, strength) * 0.3)) * 100);
  if (confidence < 65) {
    warnings.push(
      "Beberapa bagian lagu kurang jelas sehingga not angka mungkin perlu diperiksa atau diedit secara manual.",
    );
  }

  onStep?.(8);
  return {
    duration,
    bpm,
    key: `${NOTE_NAMES[root]} ${scale}`,
    keyRoot: root,
    scale,
    timeSignature: "4/4",
    rangeLow: midis.length ? midiToName(Math.min(...midis)) : "—",
    rangeHigh: midis.length ? midiToName(Math.max(...midis)) : "—",
    confidence,
    notes: cleaned,
    sections,
    warnings,
  };
}
