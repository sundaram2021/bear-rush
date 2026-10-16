/** Web Audio mixer for local forest ambience and synthesized wildlife-game effects. */
export type Sfx = 'footstep' | 'snow-step' | 'hunt' | 'forage' | 'fish-catch' | 'bear-catch' | 'bear-grunt' | 'bear-hit' | 'poison' | 'trap' | 'fall' | 'wind' | 'life-loss' | 'hurt' | 'ui' | 'win' | 'lose'

export class Audio {
  readonly ctx: AudioContext
  private readonly master: GainNode
  private readonly music: GainNode
  private readonly sfx: GainNode
  private forestSource?: AudioBufferSourceNode
  private forestGain?: GainNode
  private buffers = new Map<string, AudioBuffer>()

  constructor() {
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.music = this.ctx.createGain()
    this.sfx = this.ctx.createGain()
    const limiter = this.ctx.createDynamicsCompressor()
    limiter.threshold.value = -1
    limiter.knee.value = 0
    limiter.ratio.value = 18
    limiter.attack.value = 0.004
    limiter.release.value = 0.14
    this.music.connect(this.master)
    this.sfx.connect(this.master)
    this.master.connect(limiter).connect(this.ctx.destination)
    this.setVolumes(0.7, 0.8, false)
  }

  unlock(): void { if (this.ctx.state === 'suspended') void this.ctx.resume() }

  setVolumes(music: number, sfx: number, muted = false): void {
    const t = this.ctx.currentTime
    this.music.gain.setTargetAtTime(muted ? 0 : Math.max(0, Math.min(1, music)) * 0.2, t, 0.05)
    this.sfx.gain.setTargetAtTime(muted ? 0 : Math.max(0, Math.min(1, sfx)) * 0.4, t, 0.05)
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
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    source.connect(bus === 'music' ? this.music : this.sfx)
    source.start()
    return source
  }

  /** Begin a quiet, layered wind-and-running-water bed only after a player gesture. */
  startForest(): void {
    if (this.forestSource) { this.resumeForest(); return }
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * 4))
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate)
    for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
      const data = buffer.getChannelData(channelIndex)
      let brown = 0
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1
        brown = (brown + 0.03 * white) / 1.03
        const gust = 0.7 + 0.3 * Math.sin((i / length) * Math.PI * 2 + channelIndex * 0.4)
        data[i] = brown * 2.2 * gust + white * 0.06
      }
    }
    const source = this.ctx.createBufferSource()
    const low = this.ctx.createBiquadFilter()
    const high = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()
    source.buffer = buffer
    source.loop = true
    low.type = 'lowpass'; low.frequency.value = 1100
    high.type = 'highpass'; high.frequency.value = 55
    gain.gain.value = 0.0001
    source.connect(high).connect(low).connect(gain).connect(this.music)
    source.start()
    gain.gain.setTargetAtTime(0.13, this.ctx.currentTime, 0.8)
    this.forestSource = source
    this.forestGain = gain
  }

  pauseForest(): void { this.forestGain?.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08) }
  resumeForest(): void {
    if (!this.forestSource) { this.startForest(); return }
    this.forestGain?.gain.setTargetAtTime(0.13, this.ctx.currentTime, 0.35)
  }
  stopForest(): void {
    const source = this.forestSource
    const gain = this.forestGain
    if (!source || !gain) return
    gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06)
    this.forestSource = undefined
    this.forestGain = undefined
    window.setTimeout(() => { try { source.stop() } catch { /* already stopped */ } }, 260)
  }

  play(name: Sfx): void {
    if (this.ctx.state !== 'running') return
    const t = this.ctx.currentTime
    const tone = (freq: number, end: number, dur: number, type: OscillatorType, vol: number, delay = 0) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, t + delay)
      osc.frequency.exponentialRampToValueAtTime(Math.max(end, 20), t + delay + dur)
      gain.gain.setValueAtTime(0.0001, t + delay)
      gain.gain.exponentialRampToValueAtTime(Math.min(vol, 0.55), t + delay + 0.009)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur)
      osc.connect(gain).connect(this.sfx)
      osc.start(t + delay)
      osc.stop(t + delay + dur + 0.04)
    }
    const noise = (dur: number, lowHz: number, highHz: number, volume: number) => {
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * dur))
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length)
      const source = this.ctx.createBufferSource()
      const high = this.ctx.createBiquadFilter()
      const low = this.ctx.createBiquadFilter()
      const gain = this.ctx.createGain()
      source.buffer = buffer
      high.type = 'highpass'; high.frequency.value = lowHz
      low.type = 'lowpass'; low.frequency.value = highHz
      gain.gain.setValueAtTime(Math.min(volume, 0.45), t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      source.connect(high).connect(low).connect(gain).connect(this.sfx)
      source.start(t); source.stop(t + dur + 0.03)
    }
    const growl = (low: number, high: number, dur: number, volume: number) => {
      const osc = this.ctx.createOscillator()
      const formant = this.ctx.createBiquadFilter()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(low, t)
      osc.frequency.exponentialRampToValueAtTime(high, t + dur)
      formant.type = 'bandpass'; formant.frequency.value = 310; formant.Q.value = 1.1
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(Math.min(volume, 0.3), t + 0.035)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(formant).connect(gain).connect(this.sfx)
      osc.start(t); osc.stop(t + dur + 0.04)
    }

    switch (name) {
      case 'footstep': noise(0.1, 80, 320, 0.2); tone(112, 68, 0.095, 'triangle', 0.12); break
      case 'snow-step': noise(0.11, 450, 4200, 0.15); tone(700, 430, 0.07, 'triangle', 0.07); break
      case 'hunt': noise(0.22, 130, 2100, 0.16); growl(154, 95, 0.25, 0.18); break
      case 'forage': noise(0.18, 360, 2800, 0.14); tone(620, 1010, 0.15, 'triangle', 0.2); tone(1010, 1320, 0.13, 'sine', 0.15, 0.06); break
      case 'fish-catch': noise(0.2, 180, 1900, 0.16); tone(440, 760, 0.14, 'triangle', 0.21); tone(760, 1020, 0.16, 'sine', 0.15, 0.06); break
      case 'bear-catch': growl(138, 96, 0.28, 0.16); noise(0.13, 190, 760, 0.08); break
      case 'bear-grunt': growl(124 + Math.random() * 20, 80, 0.36, 0.12); noise(0.16, 90, 700, 0.07); break
      case 'bear-hit': growl(184, 68, 0.43, 0.23); break
      case 'poison': noise(0.23, 240, 1500, 0.16); tone(310, 86, 0.36, 'sawtooth', 0.17); tone(277, 134, 0.32, 'triangle', 0.08, 0.04); break
      case 'trap': noise(0.11, 600, 7000, 0.23); tone(1300, 410, 0.2, 'square', 0.13); tone(210, 78, 0.23, 'triangle', 0.15, 0.03); break
      case 'fall': noise(0.38, 60, 1800, 0.21); tone(260, 48, 0.52, 'sine', 0.19); growl(110, 56, 0.52, 0.17); break
      case 'wind': noise(1.4, 80, 900, 0.075); break
      case 'life-loss': tone(760, 390, 0.24, 'triangle', 0.18); tone(390, 230, 0.3, 'sine', 0.12, 0.18); break
      case 'hurt': noise(0.2, 45, 430, 0.22); tone(115, 42, 0.24, 'triangle', 0.21); break
      case 'ui': tone(660, 700, 0.06, 'triangle', 0.14); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.3, 'triangle', 0.17, i * 0.11)); break
      case 'lose':
        noise(0.48, 35, 380, 0.12); growl(110, 54, 0.68, 0.27)
        ;[330, 262, 196].forEach((f, i) => tone(f, f * 0.78, 0.34, 'sine', 0.13, i * 0.19))
        break
    }
  }
}
