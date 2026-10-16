import * as THREE from 'three'

export type NaturalTextureKind = 'ground' | 'foliage' | 'bark' | 'rock' | 'fur'
const textures = new Map<NaturalTextureKind, THREE.CanvasTexture>()

/** Tileable-style deterministic color/bump textures; generated locally with no asset requests. */
export function createNaturalTexture(kind: NaturalTextureKind): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const cached = textures.get(kind)
  if (cached) return cached
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const image = ctx.createImageData(size, size)
  let seed = ({ ground: 31573, foliage: 9017, bark: 44219, rock: 12831, fur: 29731 } as const)[kind]
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4
      const fine = (random() - 0.5) * 30
      const broad = Math.sin(x * 0.035 + Math.sin(y * 0.024) * 2.2) * 9 + Math.sin(y * 0.049 + x * 0.009) * 7
      const fibers = Math.sin(x * 0.19 + Math.sin(y * 0.04) * 1.4) * 9
      let r = 116, g = 119, b = 91
      if (kind === 'ground') {
        const fleck = random() > 0.996 ? -34 : random() > 0.997 ? 26 : 0
        r = 119 + broad + fine + fleck
        g = 128 + broad * 0.7 + fine + fleck
        b = 98 + broad * 0.45 + fine * 0.65 + fleck * 0.6
      } else if (kind === 'foliage') {
        const vein = Math.sin((x + y * 0.28) * 0.15) * 5
        const leaf = random() > 0.94 ? 18 : 0
        r = 54 + broad * 0.55 + fine * 0.48 + leaf
        g = 76 + broad + fine + vein + leaf
        b = 49 + broad * 0.5 + fine * 0.48 + leaf * 0.45
      } else if (kind === 'bark') {
        const groove = Math.sin(x * 0.095 + Math.sin(y * 0.012) * 1.7) * 17
        const fleck = random() > 0.996 ? 32 : 0
        r = 94 + groove + fibers + fine * 0.55 + fleck
        g = 68 + groove * 0.72 + fibers * 0.74 + fine * 0.5 + fleck * 0.6
        b = 46 + groove * 0.52 + fibers * 0.48 + fine * 0.35
      } else if (kind === 'rock') {
        const strata = Math.sin(y * 0.11 + Math.sin(x * 0.02) * 2) * 11
        r = 124 + strata + broad * 0.6 + fine
        g = 119 + strata + broad * 0.5 + fine
        b = 107 + strata * 0.8 + broad * 0.45 + fine
      } else {
        const hair = Math.sin((x * 0.13) + Math.sin(y * 0.02) * 1.4) * 11
        const fleck = random() > 0.997 ? 26 : 0
        r = 155 + hair + fine * 0.65 + fleck
        g = 117 + hair * 0.75 + fine * 0.55 + fleck * 0.65
        b = 82 + hair * 0.48 + fine * 0.4 + fleck * 0.35
      }
      image.data[i] = Math.max(0, Math.min(255, r))
      image.data[i + 1] = Math.max(0, Math.min(255, g))
      image.data[i + 2] = Math.max(0, Math.min(255, b))
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  texture.generateMipmaps = true
  textures.set(kind, texture)
  return texture
}
