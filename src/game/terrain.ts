import * as THREE from 'three'
import { CONFIG } from './config'
import { fbm2, ridged2, smoothstep, valueNoise } from './noise'

/** A mountain valley heightfield: rolling forest floor, a winding river gorge, a deep crevasse and snow-capped rims. */
export class Terrain {
  readonly size: number
  readonly half: number
  readonly uniforms = { uSnow: { value: 0 } }
  private readonly seed: number

  constructor(seed = 1337) {
    this.size = CONFIG.world.size
    this.half = this.size / 2
    this.seed = seed
  }

  /** River centerline meanders across the whole valley. */
  riverX(z: number): number {
    return 58 * Math.sin(z * 0.0105) + 22 * Math.sin(z * 0.027 + 1.3) - 18 * Math.sin(z * 0.004)
  }

  /** Slowly descending water surface so the river always flows downstream (+z). */
  waterY(z: number): number {
    return -0.4 - z * 0.0035
  }

  private hills(x: number, z: number): number {
    const rolling = (fbm2(x * 0.0062, z * 0.0062, 4, this.seed) - 0.34) * 40
    const r = Math.hypot(x, z)
    const edge = smoothstep(this.half * 0.46, this.half * 0.98, r)
    const wall = edge * edge * 150
    const ridge = (ridged2(x * 0.0125, z * 0.0125, 4, this.seed + 91) - 0.32) * 30
    return rolling + wall + ridge * smoothstep(this.half * 0.16, this.half * 0.72, r)
  }

  /** Depth of the crevasse gash carved across the valley (0 = solid ground). */
  trenchDepth(x: number, z: number): number {
    return trenchOnSegment(x, z, -330, -150, 285, 340, 3, 10, 18)
  }

  height(x: number, z: number): number {
    const dr = Math.abs(x - this.riverX(z))
    const bank = smoothstep(5.5, 30, dr)
    let h = this.hills(x, z) * bank + this.waterY(z) * (1 - bank)
    const channel = 1 - smoothstep(0, 6.5, dr)
    h -= channel * 1.7
    h -= this.trenchDepth(x, z)
    return h
  }

  normal(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    const e = 1.4
    const hx = this.height(x + e, z) - this.height(x - e, z)
    const hz = this.height(x, z + e) - this.height(x, z - e)
    return out.set(-hx, 2 * e, -hz).normalize()
  }

  /** Gradient magnitude; ~0 flat, >1.4 approaching a wall. */
  slope(x: number, z: number): number {
    const e = 1.4
    const hx = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e)
    const hz = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e)
    return Math.hypot(hx, hz)
  }

  /** 0..1 altitude-based snow coverage, before the seasonal snowline drops. */
  snowMask(x: number, z: number): number {
    const h = this.height(x, z)
    const patchy = valueNoise(x * 0.02, z * 0.02, this.seed + 17) * 6 - 3
    return smoothstep(CONFIG.world.snowLine - 10, CONFIG.world.snowLine + 20, h + patchy)
  }

  isWater(x: number, z: number): boolean {
    const dr = Math.abs(x - this.riverX(z))
    return dr < 5.5 && this.height(x, z) < this.waterY(z)
  }

  clampToBounds(v: THREE.Vector3, margin = 34): void {
    const r = Math.hypot(v.x, v.z)
    const max = this.half - margin
    if (r > max) {
      v.x *= max / r
      v.z *= max / r
    }
  }

  /** Solid ground mesh with a seasonally blended snow cap. */
  buildMesh(): THREE.Mesh {
    const n = CONFIG.world.grid
    const size = this.size
    const half = this.half
    const positions: number[] = []
    const colors: number[] = []
    const snow: number[] = []
    const indices: number[] = []
    const shore = new THREE.Color('#6a6a4a')
    const grass = new THREE.Color('#4c6d3c')
    const grassDry = new THREE.Color('#6d7442')
    const rock = new THREE.Color('#6a625a')
    const highRock = new THREE.Color('#8a8579')
    const tmp = new THREE.Color()
    for (let i = 0; i <= n; i += 1) {
      const z = -half + (i / n) * size
      for (let j = 0; j <= n; j += 1) {
        const x = -half + (j / n) * size
        const h = this.height(x, z)
        positions.push(x, h, z)
        const s = this.slope(x, z)
        const alt = smoothstep(2, 48, h)
        const steep = smoothstep(0.7, 1.7, s)
        const tone = valueNoise(x * 0.05, z * 0.05, this.seed + 5)
        tmp.copy(grass).lerp(grassDry, tone * 0.5)
        tmp.lerp(shore, smoothstep(6, 2, Math.abs(x - this.riverX(z))))
        tmp.lerp(rock, steep)
        tmp.lerp(highRock, alt * (1 - steep) * 0.7)
        const shade = 0.86 + tone * 0.24
        colors.push(tmp.r * shade, tmp.g * shade, tmp.b * shade)
        snow.push(this.snowMask(x, z))
        if (i < n && j < n) {
          const a = i * (n + 1) + j
          const b = a + 1
          const c = a + n + 1
          const d = c + 1
          indices.push(a, c, b, b, c, d)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setAttribute('aSnow', new THREE.Float32BufferAttribute(snow, 1))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })
    material.onBeforeCompile = shader => {
      shader.uniforms.uSnow = this.uniforms.uSnow
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aSnow;\nvarying float vSnow;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSnow = aSnow;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSnow;\nvarying float vSnow;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float snowCover = clamp(vSnow + uSnow * (1.0 - vSnow), 0.0, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.99), snowCover);`)
    }
    material.customProgramCacheKey = () => 'bear-rush-terrain-v2'
    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true
    mesh.castShadow = false
    mesh.frustumCulled = false
    return mesh
  }

  /** River surface following the channel. */
  buildWater(): THREE.Mesh {
    const half = this.half
    const steps = 160
    const across = 6
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= steps; i += 1) {
      const z = -half + (i / steps) * this.size
      const cx = this.riverX(z)
      const y = this.waterY(z) + 0.08
      for (let j = 0; j <= across; j += 1) {
        const u = j / across
        positions.push(cx + (u - 0.5) * 13, y, z)
        uvs.push(u, i / steps)
        if (i < steps && j < across) {
          const a = i * (across + 1) + j
          const b = a + 1
          const c = a + across + 1
          const d = c + 1
          indices.push(a, c, b, b, c, d)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const material = new THREE.MeshPhysicalMaterial({
      color: '#2d6f86', roughness: 0.38, metalness: 0, clearcoat: 0.28, clearcoatRoughness: 0.45,
      transparent: true, opacity: 0.88, side: THREE.DoubleSide,
    })
    material.onBeforeCompile = shader => {
      shader.uniforms.uWaterTime = terrainWaterTime
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWaterTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          transformed.y += sin(position.x * 1.1 + position.z * 0.2 + uWaterTime * 2.1) * 0.06
            + sin(position.x * 2.3 - position.z * 0.3 - uWaterTime * 1.5) * 0.03;`)
    }
    material.customProgramCacheKey = () => 'bear-rush-water-v1'
    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = false
    mesh.frustumCulled = false
    return mesh
  }

  updateWater(dt: number): void {
    terrainWaterTime.value += dt
  }
}

const terrainWaterTime = { value: 0 }

/** Distance from a point to a segment, plus the carved depth profile of the crevasse. */
function trenchOnSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number, core: number, flank: number, depth: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / len2))
  const dist = Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
  return depth * (1 - smoothstep(core, flank, dist))
}
