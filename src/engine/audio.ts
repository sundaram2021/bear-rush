/** Browser-safe Web Audio mixer. Wildlife and stream sounds are synthesized locally. */
export type Sfx = 'pickup' | 'jump' | 'land' | 'hurt' | 'ui' | 'win' | 'lose' | 'dash' | 'eat' | 'bear-grunt' | 'bear-hit' | 'collision' | 'life-loss' | 'fish-catch' | 'bear-catch' | 'miss' | 'block-hit' | 'algae'

export class Audio {
  readonly ctx: AudioContext
  private readonly master: GainNode
  private readonly music: GainNode
  private readonly sfx: GainNode
  private readonly musicBase: GainNode
  private readonly sfxBase: GainNode
  private readonly limiter: DynamicsCompressorNode
  private riverSource?: AudioBufferSourceNode
  private riverGain?: GainNode
  private buffers = new Map<string, AudioBuffer>()

  constructor() {
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.music = this.ctx.createGain()
    this.sfx = this.ctx.createGain()
    this.musicBase = this.ctx.createGain()
    this.sfxBase = this.ctx.createGain()
    this.musicBase.gain.value = 3
    this.sfxBase.gain.value = 2
    this.limiter = this.ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -1
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.12
    this.music.connect(this.musicBase).connect(this.master)
    this.sfx.connect(this.sfxBase).connect(this.master)
    this.master.gain.value = 1
    this.master.connect(this.limiter).connect(this.ctx.destination)
    this.setVolumes(0.7, 0.8, false)
  }

  unlock(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setVolumes(music: number, sfx: number, muted = false): void {
    const t = this.ctx.currentTime
    const m = Math.max(0, Math.min(1, music))
    const s = Math.max(0, Math.min(1, sfx))
    this.music.gain.setTargetAtTime(muted ? 0 : (0.55 / 3) * m, t, 0.05)
    this.sfx.gain.setTargetAtTime(muted ? 0 : (0.8 / 2) * s, t, 0.05)
  }

  async load(url: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(url)
    if (cached) return cached
    const data = await (await fetch(url)).arrayBuffer()
    const buffer = await this.ctx.decodeAudioData(data)
    this.buffers.set(url, buffer)
    return buffer
  }

  playBuffer(buffer: AudioBuffer, bus: 'music' | 'sfx' = 'sfx', loop = false): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = loop
    src.connect(bus === 'music' ? this.music : this.sfx)
    src.start()
    return src
  }

  /** Start a low, continuous stream bed only after a player gesture. */
  startRiver(): void {
    if (this.riverSource) { this.resumeRiver(); return }
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * 3))
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const channel = buffer.getChannelData(0)
    let brown = 0
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1
      brown = (brown + 0.035 * white) / 1.035
      channel[i] = brown * 3.2
    }
    const source = this.ctx.createBufferSource()
    const low = this.ctx.createBiquadFilter()
    const high = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()
    source.buffer = buffer
    source.loop = true
    low.type = 'lowpass'
    low.frequency.value = 920
    high.type = 'highpass'
    high.frequency.value = 70
    gain.gain.value = 0.0001
    source.connect(high).connect(low).connect(gain).connect(this.music)
    source.start()
    gain.gain.setTargetAtTime(0.075, this.ctx.currentTime, 0.7)
    this.riverSource = source
    this.riverGain = gain
  }

  pauseRiver(): void { this.riverGain?.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08) }
  resumeRiver(): void {
    if (!this.riverSource) { this.startRiver(); return }
    this.riverGain?.gain.setTargetAtTime(0.075, this.ctx.currentTime, 0.35)
  }

  stopRiver(): void {
    const source = this.riverSource
    const gain = this.riverGain
    if (!source || !gain) return
    gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06)
    this.riverSource = undefined
    this.riverGain = undefined
    window.setTimeout(() => { try { source.stop() } catch { /* already stopped */ } }, 260)
  }

  play(name: Sfx): void {
    if (this.ctx.state !== 'running') return
    const t = this.ctx.currentTime
    const tone = (freq: number, end: number, dur: number, type: OscillatorType, vol: number, delay = 0) => {
      const o = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, t + delay)
      o.frequency.exponentialRampToValueAtTime(Math.max(end, 20), t + delay + dur)
      g.gain.setValueAtTime(0.0001, t + delay)
      g.gain.exponentialRampToValueAtTime(Math.min(vol, 0.7), t + delay + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur)
      o.connect(g).connect(this.sfx)
      o.start(t + delay)
      o.stop(t + delay + dur + 0.05)
    }
    const noise = (dur: number, lowHz: number, highHz: number, volume: number) => {
      const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur))
      const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < n; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / n)
      const src = this.ctx.createBufferSource()
      const high = this.ctx.createBiquadFilter()
      const low = this.ctx.createBiquadFilter()
      const gain = this.ctx.createGain()
      src.buffer = buffer
      high.type = 'highpass'; high.frequency.value = lowHz
      low.type = 'lowpass'; low.frequency.value = highHz
      gain.gain.setValueAtTime(Math.min(volume, 0.4), t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      src.connect(high).connect(low).connect(gain).connect(this.sfx)
      src.start(t); src.stop(t + dur + 0.02)
    }
    const bear = (low: number, high: number, dur: number, volume: number) => {
      const osc = this.ctx.createOscillator()
      const formant = this.ctx.createBiquadFilter()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(low, t)
      osc.frequency.exponentialRampToValueAtTime(high, t + dur)
      formant.type = 'bandpass'
      formant.frequency.value = 360
      formant.Q.value = 1.1
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(Math.min(volume, 0.3), t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(formant).connect(gain).connect(this.sfx)
      osc.start(t); osc.stop(t + dur + 0.03)
    }

    switch (name) {
      case 'eat':
      case 'pickup':
        noise(0.17, 420, 2600, 0.15)
        tone(640, 980, 0.13, 'triangle', 0.22)
        tone(980, 1320, 0.16, 'sine', 0.16, 0.07)
        bear(150, 110, 0.12, 0.08)
        break
      case 'fish-catch':
        noise(0.2, 170, 1800, 0.13)
        tone(520, 850, 0.14, 'triangle', 0.19)
        tone(840, 1130, 0.17, 'sine', 0.14, 0.055)
        break
      case 'bear-catch': bear(142, 98, 0.25, 0.15); noise(0.12, 220, 760, 0.05); break
      case 'miss': noise(0.12, 640, 2600, 0.06); tone(420, 310, 0.14, 'sine', 0.07); break
      case 'bear-grunt': bear(130 + Math.random() * 20, 82, 0.34, 0.11); noise(0.16, 100, 680, 0.06); break
      case 'bear-hit': bear(185, 70, 0.43, 0.23); break
      case 'block-hit': noise(0.18, 55, 620, 0.19); tone(135, 62, 0.18, 'triangle', 0.17); break
      case 'algae': noise(0.21, 280, 1600, 0.12); tone(255, 74, 0.32, 'sawtooth', 0.16); break
      case 'collision':
      case 'hurt': noise(0.2, 45, 430, 0.24); tone(115, 42, 0.24, 'triangle', 0.24); break
      case 'life-loss': tone(760, 390, 0.24, 'triangle', 0.18); tone(390, 230, 0.3, 'sine', 0.12, 0.18); break
      case 'jump': tone(300, 620, 0.14, 'square', 0.12); break
      case 'land': tone(160, 70, 0.1, 'sine', 0.18); break
      case 'ui': tone(660, 700, 0.06, 'triangle', 0.14); break
      case 'dash': tone(500, 180, 0.18, 'sawtooth', 0.1); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.3, 'triangle', 0.17, i * 0.11)); break
      case 'lose':
        noise(0.48, 35, 380, 0.12)
        bear(110, 54, 0.68, 0.27)
        ;[330, 262, 196].forEach((f, i) => tone(f, f * 0.78, 0.34, 'sine', 0.13, i * 0.19))
        break
    }
  }
}
