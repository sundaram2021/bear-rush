import * as THREE from 'three'
import { CONFIG } from './config'
import { fbm, smoothstep } from './noise'
import { createNaturalTexture } from './textures'

export type GroundSample = { height: number; slope: number; normal: THREE.Vector3; snowMask: number }

/** A continuous global heightfield shared by streamed meshes, footing, wildlife and hazards. */
export class Terrain {
  readonly chunkSize = CONFIG.world.chunkSize
  readonly trenchWidth = CONFIG.world.trenchWidth

  riverX(z: number): number {
    return -17 + fbm(0.35, z * 0.0037, 4, 1447) * 78 + Math.sin(z * 0.011) * 5.8
  }

  trenchX(z: number): number {
    return 33 + fbm(1.8, z * 0.0045, 4, 3779) * 26 + Math.sin(z * 0.017 + 1.1) * 3.2
  }

  heightAt(x: number, z: number): number {
    const broad = fbm(x * 0.0047, z * 0.0047, 5, 981) * 10.5
    const landform = fbm(x * 0.0095, z * 0.0095, 4, 5521) * 12.5
    const ridges = 1 - Math.abs(fbm(x * 0.018, z * 0.018, 5, 2718))
    const mountainMask = smoothstep(-0.24, 0.4, fbm(x * 0.0029, z * 0.0029, 4, 7883))
    const alpine = mountainMask * (5 + ridges * 24)
    const rolling = Math.sin(x * 0.031 + z * 0.012) * 1.35 + Math.sin(z * 0.026 - x * 0.018) * 1.1
    const riverDistance = x - this.riverX(z)
    const riverChannel = Math.exp(-(riverDistance * riverDistance) / 20) * 2.4
    const trenchDistance = Math.abs(x - this.trenchX(z))
    const trench = trenchDistance < 10 ? Math.pow(1 - trenchDistance / 10, 1.45) * CONFIG.world.trenchDepth : 0
    const talus = fbm(x * 0.075, z * 0.075, 3, 551) * 0.42
    return broad + landform + rolling + alpine + talus - riverChannel - trench
  }

  sample(x: number, z: number): GroundSample {
    const step = 0.8
    const height = this.heightAt(x, z)
    const dx = (this.heightAt(x + step, z) - this.heightAt(x - step, z)) / (step * 2)
    const dz = (this.heightAt(x, z + step) - this.heightAt(x, z - step)) / (step * 2)
    const normal = new THREE.Vector3(-dx, 1, -dz).normalize()
    const slope = Math.acos(THREE.MathUtils.clamp(normal.y, -1, 1))
    const snowMask = smoothstep(CONFIG.world.snowLine - 12, CONFIG.world.snowLine + 16, height) * (1 - smoothstep(0.8, 1.35, slope))
    return { height, slope, normal, snowMask }
  }

  waterY(z: number): number { return this.heightAt(this.riverX(z), z) + 0.16 }

  trenchDistance(x: number, z: number): number { return Math.abs(x - this.trenchX(z)) }

  isInTrench(x: number, z: number): boolean {
    return this.trenchDistance(x, z) < this.trenchWidth * 0.66
  }

  isSafeSurface(x: number, z: number): boolean {
    return !this.isInTrench(x, z) && this.sample(x, z).slope < 0.98
      && Math.abs(x - this.riverX(z)) > 3.1
  }

  /** Build one terrain tile. Vertex heights/normals are sampled in global coordinates. */
  createGeometry(chunkX = 0, chunkZ = 0): THREE.BufferGeometry {
    const n = CONFIG.world.chunkGrid
    const size = this.chunkSize
    const originX = chunkX * size
    const originZ = chunkZ * size
    const step = size / n
    const positions = new Float32Array((n + 1) * (n + 1) * 3)
    const normals = new Float32Array((n + 1) * (n + 1) * 3)
    const colors = new Float32Array((n + 1) * (n + 1) * 3)
    const uvs = new Float32Array((n + 1) * (n + 1) * 2)
    const indices = new Uint32Array(n * n * 6)
    const meadow = new THREE.Color('#99a186')
    const alpineGrass = new THREE.Color('#9faeab')
    const exposedRock = new THREE.Color('#a29a8e')
    let vertex = 0
    let index = 0
    for (let iz = 0; iz <= n; iz += 1) {
      const localZ = iz * step
      const z = originZ + localZ
      for (let ix = 0; ix <= n; ix += 1) {
        const localX = ix * step
        const x = originX + localX
        const ground = this.sample(x, z)
        positions[vertex * 3] = localX
        positions[vertex * 3 + 1] = ground.height
        positions[vertex * 3 + 2] = localZ
        normals[vertex * 3] = ground.normal.x
        normals[vertex * 3 + 1] = ground.normal.y
        normals[vertex * 3 + 2] = ground.normal.z
        uvs[vertex * 2] = x / 8
        uvs[vertex * 2 + 1] = z / 8
        const altitude = smoothstep(8, 31, ground.height)
        const steep = smoothstep(0.34, 1.1, ground.slope)
        const base = meadow.clone().lerp(alpineGrass, altitude * 0.78).lerp(exposedRock, steep * 0.86)
        const variation = 0.94 + (fbm(x * 0.17, z * 0.17, 2, 1481) + 1) * 0.03
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
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeBoundingSphere()
    return geometry
  }

  createMaterial(): THREE.MeshStandardMaterial {
    const groundTexture = createNaturalTexture('ground')
    const bumpTexture = groundTexture?.clone()
    if (bumpTexture) { bumpTexture.colorSpace = THREE.NoColorSpace; bumpTexture.needsUpdate = true }
    const parameters: THREE.MeshStandardMaterialParameters = { color: '#ffffff', bumpScale: 0.14, roughness: 0.98, vertexColors: true }
    if (groundTexture) parameters.map = groundTexture
    if (bumpTexture) parameters.bumpMap = bumpTexture
    const material = new THREE.MeshStandardMaterial(parameters)
    material.onBeforeCompile = shader => {
      shader.uniforms.uSnowAmount = { value: 0 }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vGroundHeight;\nvarying float vGroundSteepness;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundHeight = position.y;\nvGroundSteepness = 1.0 - normalize(normal).y;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSnowAmount;\nvarying float vGroundHeight;\nvarying float vGroundSteepness;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float highSnow = smoothstep(9.0, 35.0, vGroundHeight);
          float slopeSnow = 1.0 - smoothstep(0.28, 0.9, vGroundSteepness);
          float snowCover = clamp(highSnow * 0.7 + uSnowAmount * 0.62, 0.0, 0.93) * slopeSnow;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.87, 0.9), snowCover);`)
      ;(material.userData as { shader?: typeof shader }).shader = shader
    }
    material.customProgramCacheKey = () => 'bear-rush-infinite-snow-terrain-v3'
    return material
  }

  setSnow(material: THREE.MeshStandardMaterial, amount: number): void {
    const shader = (material.userData as { shader?: { uniforms: Record<string, { value: number }> } }).shader
    if (shader) shader.uniforms.uSnowAmount.value = amount
  }
}
