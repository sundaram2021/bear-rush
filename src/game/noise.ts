/** Deterministic 32-bit value noise used to build the mountain terrain and scatter props. */

export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 362437)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function valueNoise(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

/** Fractal Brownian motion in [0, 1]. */
export function fbm2(x: number, y: number, octaves = 4, seed = 0): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(fx, fy, seed + i * 131) * amp
    norm += amp
    amp *= 0.5
    fx *= 2.03
    fy *= 2.01
  }
  return sum / norm
}

/** Ridged multifractal in [0, 1]; sharp crests suit mountain ranges. */
export function ridged2(x: number, y: number, octaves = 4, seed = 0): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i += 1) {
    const n = 1 - Math.abs(valueNoise(fx, fy, seed + i * 97) * 2 - 1)
    sum += n * n * amp
    norm += amp
    amp *= 0.5
    fx *= 2.07
    fy *= 2.05
  }
  return sum / norm
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1)))
  return t * t * (3 - 2 * t)
}

/** Seeded stream for prop placement so the world is identical every load. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
