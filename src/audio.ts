// Sound effects and background music, synthesised with Web Audio (no audio files to load).
// Browsers only allow sound after a user gesture, so unlock() is called from clicks.

let ctx: AudioContext | null = null
let noiseBuf: AudioBuffer | null = null
let muted = false
let musicWanted = true
let musicTimer: number | null = null
let musicGain: GainNode | null = null
let step = 0
let nextAt = 0

try {
  muted = localStorage.getItem('dk-muted') === '1'
  musicWanted = localStorage.getItem('dk-music') !== '0'
} catch { /* storage blocked */ }

function ac() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

function tone(c: AudioContext, out: AudioNode, t: number, f0: number, f1: number, dur: number, type: OscillatorType, vol: number) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(out)
  o.start(t); o.stop(t + dur + 0.02)
}

function hiss(c: AudioContext, out: AudioNode, t: number, dur: number, freq: number, vol: number, q = 1.2) {
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = noise(c); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f); f.connect(g); g.connect(out)
  s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02)
}

export function unlock() {
  ac()
  startMusic()
}

export const isMuted = () => muted
export const isMusicOn = () => musicWanted

export function setMuted(m: boolean) {
  muted = m
  try { localStorage.setItem('dk-muted', m ? '1' : '0') } catch { /* ignore */ }
  if (m) stopMusic()
  else { ac(); startMusic() }
}

export function setMusic(on: boolean) {
  musicWanted = on
  try { localStorage.setItem('dk-music', on ? '1' : '0') } catch { /* ignore */ }
  if (on) startMusic()
  else stopMusic()
}

export function sfx(kind: string) {
  if (muted || !kind) return
  const c = ac()
  if (!c) return
  const t = c.currentTime + 0.01, out = c.destination
  const notes = (fs: number[], gap: number, type: OscillatorType, vol: number, dur = 0.25) =>
    fs.forEach((f, k) => tone(c, out, t + k * gap, f, f, dur, type, vol))
  switch (kind) {
    case 'rattle': hiss(c, out, t, 0.05, 1800 + Math.random() * 1500, 0.35); tone(c, out, t, 900 + Math.random() * 500, 600, 0.03, 'square', 0.03); break
    case 'land': hiss(c, out, t, 0.08, 1200, 0.5); hiss(c, out, t + 0.09, 0.06, 1500, 0.3); tone(c, out, t, 220, 140, 0.12, 'sine', 0.25); break
    case 'step': tone(c, out, t, 620, 330, 0.07, 'sine', 0.3); hiss(c, out, t, 0.03, 2500, 0.15); break
    case 'out': tone(c, out, t, 330, 880, 0.18, 'triangle', 0.25); break
    case 'capture': tone(c, out, t, 700, 110, 0.4, 'sawtooth', 0.12); hiss(c, out, t, 0.15, 600, 0.3); break
    case 'home': notes([523, 659, 784, 1047], 0.09, 'triangle', 0.22); break
    case 'block': tone(c, out, t, 160, 120, 0.12, 'sine', 0.4); tone(c, out, t + 0.13, 160, 120, 0.12, 'sine', 0.4); break
    case 'ladder': notes([392, 494, 587, 698, 784, 988], 0.08, 'triangle', 0.2, 0.18); break
    case 'snake': tone(c, out, t, 520, 90, 0.7, 'sawtooth', 0.08); hiss(c, out, t, 0.6, 5000, 0.12); break
    case 'nomove': tone(c, out, t, 200, 150, 0.22, 'square', 0.06); break
    case 'join': notes([659, 880], 0.08, 'triangle', 0.18, 0.2); break
    case 'win': notes([523, 659, 784, 1047, 784, 1047, 1319], 0.12, 'triangle', 0.22, 0.35); break
  }
}

// Background music: a looping D-major pentatonic tune (64 steps of 0.3 s) with bass and a tabla-style beat.
const D4 = 293.66, E4 = 329.63, Fs4 = 369.99, A4 = 440, B4 = 493.88, D5 = 587.33, E5 = 659.25
const MELODY = [
  D5, 0, B4, A4, Fs4, 0, A4, 0, B4, A4, Fs4, E4, D4, 0, 0, 0,
  E4, Fs4, A4, 0, B4, 0, D5, B4, A4, Fs4, E4, Fs4, A4, 0, 0, 0,
  D5, 0, B4, A4, Fs4, 0, A4, 0, B4, A4, Fs4, E4, D4, 0, 0, 0,
  D5, E5, D5, B4, A4, 0, B4, A4, Fs4, E4, D4, E4, D4, 0, 0, 0,
]
const BASS = [73.42, 110, 123.47, 110, 73.42, 110, 98, 110]

function musicStep(c: AudioContext, out: AudioNode, s: number, t: number) {
  const f = MELODY[s]
  if (f) {
    const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t)
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.35)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    o.connect(lp); lp.connect(g); g.connect(out)
    o.start(t); o.stop(t + 0.6)
  }
  if (s % 8 === 0) {
    const b = c.createOscillator(), g = c.createGain()
    b.type = 'triangle'; b.frequency.setValueAtTime(BASS[s / 8], t)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3)
    b.connect(g); g.connect(out)
    b.start(t); b.stop(t + 2.4)
  }
  if (s % 4 === 0) tone(c, out, t, 170, 65, 0.22, 'sine', 0.22)
  if (s % 4 === 2 || s % 8 === 7) hiss(c, out, t, 0.06, 3200, s % 8 === 7 ? 0.05 : 0.1, 2)
}

function startMusic() {
  if (musicTimer !== null || muted || !musicWanted) return
  const c = ac()
  if (!c) return
  musicGain = c.createGain()
  musicGain.gain.setValueAtTime(0.0001, c.currentTime)
  musicGain.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 1.5)
  musicGain.connect(c.destination)
  step = 0
  nextAt = c.currentTime + 0.1
  musicTimer = window.setInterval(() => {
    if (!ctx || !musicGain) return
    while (nextAt < ctx.currentTime + 0.4) {
      musicStep(ctx, musicGain, step % 64, nextAt)
      step++
      nextAt += 0.3
    }
  }, 100)
}

function stopMusic() {
  if (musicTimer === null) return
  window.clearInterval(musicTimer)
  musicTimer = null
  const g = musicGain
  if (g && ctx) {
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15)
    window.setTimeout(() => g.disconnect(), 800)
  }
  musicGain = null
}
