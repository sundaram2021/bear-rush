import * as THREE from 'three'
import { CONFIG } from './config'
import { fbm, smoothstep } from './noise'
import { createNaturalTexture } from './textures'

export type GroundSample = { height: number; slope: number; normal: THREE.Vector3; snowMask: number }

/** One analytic landscape field drives the mesh, bear footing, river, wildlife and trench checks. */
export class Terrain {
  readonly halfSize = CONFIG.world.halfSize
  readonly trenchWidth = CONFIG.world.trenchWidth

  riverX(z: number): number {
    return -15 + 9 * Math.sin(z * 0.023) + 3.2 * Math.sin(z * 0.061 + 0.8)
  }

  trenchX(z: number): number {
    return 24 + 3.6 * Math.sin(z * 0.019 + 1.1) + 1.25 * Math.sin(z * 0.051)
  }

  heightAt(x: number, z: number): number {
    const broad = fbm(x * 0.014, z * 0.014, 5, 981) * 4.1
    const rolling = Math.sin(x * 0.031 + z * 0.012) * 1.55 + Math.sin(z * 0.026 - x * 0.018) * 1.25
    const ridgeNoise = Math.abs(fbm(x * 0.021, z * 0.021, 4, 2718))
    const rim = Math.max(Math.abs(x), Math.abs(z))
    const alpine = smoothstep(38, 104, rim) * (14 + ridgeNoise * 34 + Math.sin(x * 0.049 + z * 0.021) * 6)
    const riverDistance = x - this.riverX(z)
    const riverChannel = Math.exp(-(riverDistance * riverDistance) / 17) * 1.95
    const trenchDistance = Math.abs(x - this.trenchX(z))
    const trench = trenchDistance < 7.8 ? Math.pow(1 - trenchDistance / 7.8, 1.6) * CONFIG.world.trenchDepth : 0
    const talus = fbm(x * 0.075, z * 0.075, 3, 551) * 0.46
    return broad + rolling + alpine + talus - riverChannel - trench
  }

  sample(x: number, z: number): GroundSample {
    const step = 0.8
    const height = this.heightAt(x, z)
    const dx = (this.heightAt(x + step, z) - this.heightAt(x - step, z)) / (step * 2)
    const dz = (this.heightAt(x, z + step) - this.heightAt(x, z - step)) / (step * 2)
    const normal = new THREE.Vector3(-dx, 1, -dz).normalize()
    const slope = Math.acos(THREE.MathUtils.clamp(normal.y, -1, 1))
    const snowMask = smoothstep(CONFIG.world.snowLine - 11, CONFIG.world.snowLine + 13, height) * smoothstep(0.98, 0.22, slope)
    return { height, slope, normal, snowMask }
  }

  waterY(z: number): number { return this.heightAt(this.riverX(z), z) + 0.18 }

  trenchDistance(x: number, z: number): number { return Math.abs(x - this.trenchX(z)) }

  isInTrench(x: number, z: number): boolean {
    return Math.abs(z) < this.halfSize * 0.88 && this.trenchDistance(x, z) < this.trenchWidth * 0.62
  }

  isSafeSurface(x: number, z: number): boolean {
    return Math.abs(x) < this.halfSize - 14 && Math.abs(z) < this.halfSize - 14
      && !this.isInTrench(x, z) && this.sample(x, z).slope < 0.88
      && Math.abs(x - this.riverX(z)) > 2.2
  }

  createGeometry(): THREE.BufferGeometry {
    const n = CONFIG.world.grid
    const size = CONFIG.world.size
    const step = size / n
    const positions = new Float32Array((n + 1) * (n + 1) * 3)
    const colors = new Float32Array((n + 1) * (n + 1) * 3)
    const uvs = new Float32Array((n + 1) * (n + 1) * 2)
    const indices = new Uint32Array(n * n * 6)
    const meadow = new THREE.Color('#abb299')
    const alpineGrass = new THREE.Color('#aeb9b6')
    const exposedRock = new THREE.Color('#a79d8f')
    let vertex = 0
    let index = 0
    for (let iz = 0; iz <= n; iz += 1) {
      const z = -size / 2 + iz * step
      for (let ix = 0; ix <= n; ix += 1) {
        const x = -size / 2 + ix * step
        const ground = this.sample(x, z)
        positions[vertex * 3] = x
        positions[vertex * 3 + 1] = ground.height
        positions[vertex * 3 + 2] = z
        uvs[vertex * 2] = (x + size / 2) / 8
        uvs[vertex * 2 + 1] = (z + size / 2) / 8
        const altitude = smoothstep(8, 31, ground.height)
        const steep = smoothstep(0.34, 1.1, ground.slope)
        const base = meadow.clone().lerp(alpineGrass, altitude * 0.75).lerp(exposedRock, steep * 0.88)
        const variation = 0.93 + (fbm(x * 0.17, z * 0.17, 2, 1481) + 1) * 0.035
        colors[vertex * 3] = base.r * variation
        colors[vertex * 3 + 1] = base.g * variation
        colors[vertex * 3 + 2] = base.b * variation
        if (ix < n && iz < n) {
          const a = iz * (n + 1) + ix
          const b = a + n + 1
          indices[index++] = a; indices[index++] = b; indices[index++] = a + 1
          indices[index++] = a + 1; indices[index++] = b; indices[index++] = b + 1
        }
        vertex += 1
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    return geometry
  }

  createMaterial(): THREE.MeshStandardMaterial {
    const groundTexture = createNaturalTexture('ground')
    const bumpTexture = groundTexture?.clone()
    if (bumpTexture) { bumpTexture.colorSpace = THREE.NoColorSpace; bumpTexture.needsUpdate = true }
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', map: groundTexture ?? undefined,
      bumpMap: bumpTexture ?? undefined, bumpScale: 0.14, roughness: 0.98, vertexColors: true })
    material.onBeforeCompile = shader => {
      shader.uniforms.uSnowAmount = { value: 0 }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vGroundHeight;\nvarying float vGroundSteepness;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundHeight = position.y;\nvGroundSteepness = 1.0 - normalize(normal).y;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSnowAmount;\nvarying float vGroundHeight;\nvarying float vGroundSteepness;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float highSnow = smoothstep(8.0, 34.0, vGroundHeight);
          float slopeSnow = 1.0 - smoothstep(0.28, 0.84, vGroundSteepness);
          float snowCover = clamp(highSnow * 0.72 + uSnowAmount * 0.66, 0.0, 0.96) * slopeSnow;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.87, 0.9), snowCover);`)
      ;(material.userData as { shader?: typeof shader }).shader = shader
    }
    material.customProgramCacheKey = () => 'bear-rush-natural-snow-terrain-v2'
    return material
  }

  setSnow(material: THREE.MeshStandardMaterial, amount: number): void {
    const shader = (material.userData as { shader?: { uniforms: Record<string, { value: number }> } }).shader
    if (shader) shader.uniforms.uSnowAmount.value = amount
  }
}
