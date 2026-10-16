/** Small deterministic value-noise helpers shared by terrain and world dressing. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(x: number, z: number, seed: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 1442695041)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

const fade = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function valueNoise(x: number, z: number, seed = 1337): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = fade(x - ix)
  const fz = fade(z - iz)
  const a = lerp(hash(ix, iz, seed), hash(ix + 1, iz, seed), fx)
  const b = lerp(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), fx)
  return lerp(a, b, fz) * 2 - 1
}

export function fbm(x: number, z: number, octaves = 5, seed = 1337): number {
  let value = 0
  let amplitude = 0.55
  let frequency = 1
  let weight = 0
  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(x * frequency, z * frequency, seed + octave * 1013) * amplitude
    weight += amplitude
    amplitude *= 0.5
    frequency *= 2.03
  }
  return weight > 0 ? value / weight : 0
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
