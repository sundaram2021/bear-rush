import * as THREE from 'three'
import { CONFIG } from './config'
import { seededRandom, smoothstep } from './noise'
import { Terrain } from './terrain'
import { createNaturalTexture } from './textures'

type Chunk = { root: THREE.Group; disposables: THREE.BufferGeometry[] }
type Matrix = THREE.Matrix4

/** Seeded, seamless landscape streamed around a player at arbitrary world coordinates. */
export class World {
  readonly scene = new THREE.Scene()
  readonly terrain = new Terrain()
  private readonly ground: THREE.MeshStandardMaterial
  private readonly chunks = new Map<string, Chunk>()
  private readonly foliageMaterials: THREE.MeshStandardMaterial[] = []
  private readonly foliageBase: THREE.Color[] = []
  private readonly windUniforms: Array<{ value: number }> = []
  private readonly sun: THREE.DirectionalLight
  private snow!: THREE.Points
  private snowPositions!: Float32Array
  private snowAmount = 0
  private time = 0
  private readonly snowRandom = seededRandom(1822)
  private readonly trunkGeo = new THREE.CylinderGeometry(0.22, 0.54, 1, 16, 4)
  private readonly pineGeo = new THREE.ConeGeometry(1, 1, 20, 4)
  private readonly leafGeo = new THREE.SphereGeometry(1, 16, 12)
  private readonly rockGeo = new THREE.IcosahedronGeometry(1, 2)
  private readonly grassGeo = new THREE.ConeGeometry(0.055, 0.36, 6, 2)
  private readonly shrubGeo = new THREE.SphereGeometry(1, 14, 10)
  private readonly bark: THREE.MeshStandardMaterial
  private readonly rockMaterials: THREE.MeshStandardMaterial[]
  private readonly grassMaterials: THREE.MeshStandardMaterial[]
  private readonly waterMaterial: THREE.MeshPhysicalMaterial

  constructor() {
    this.scene.background = new THREE.Color('#9db3bd')
    this.scene.fog = new THREE.FogExp2('#9db3bd', 0.0028)
    this.scene.add(new THREE.HemisphereLight('#dce8ed', '#394538', 1.58))
    this.sun = new THREE.DirectionalLight('#fff1d3', 3.1)
    this.sun.position.set(-42, 72, 38)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.left = -78
    this.sun.shadow.camera.right = 78
    this.sun.shadow.camera.top = 84
    this.sun.shadow.camera.bottom = -84
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 250
    this.sun.shadow.bias = -0.00015
    this.sun.shadow.normalBias = 0.025
    this.scene.add(this.sun, this.sun.target)
    const skyFill = new THREE.DirectionalLight('#a7c8df', 0.72)
    skyFill.position.set(42, 20, -48)
    this.scene.add(skyFill)

    this.ground = this.terrain.createMaterial()
    const barkTexture = createNaturalTexture('bark')
    const barkBump = barkTexture?.clone()
    if (barkBump) { barkBump.colorSpace = THREE.NoColorSpace; barkBump.needsUpdate = true }
    const barkParameters: THREE.MeshStandardMaterialParameters = { color: '#ffffff', bumpScale: 0.14, roughness: 0.98 }
    if (barkTexture) barkParameters.map = barkTexture
    if (barkBump) barkParameters.bumpMap = barkBump
    this.bark = new THREE.MeshStandardMaterial(barkParameters)
    const rockTexture = createNaturalTexture('rock')
    this.rockMaterials = ['#89877d'].map(color => {
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.98 })
      if (rockTexture) material.map = rockTexture
      return material
    })
    this.grassMaterials = [new THREE.MeshStandardMaterial({ color: '#718054', roughness: 0.98, side: THREE.DoubleSide })]
    const leafTexture = createNaturalTexture('foliage')
    const leafBump = leafTexture?.clone()
    if (leafBump) { leafBump.colorSpace = THREE.NoColorSpace; leafBump.needsUpdate = true }
    for (const color of ['#71835f', '#8b956b']) {
      const wind = { value: 0 }
      const parameters: THREE.MeshStandardMaterialParameters = { color, bumpScale: 0.055, roughness: 0.96 }
      if (leafTexture) parameters.map = leafTexture
      if (leafBump) parameters.bumpMap = leafBump
      const material = new THREE.MeshStandardMaterial(parameters)
      material.onBeforeCompile = shader => {
        shader.uniforms.uWindTime = wind
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sin(position.x * 4.7 + position.z * 3.1 + uWindTime) * max(position.y + 0.45, 0.0) * 0.025;')
      }
      material.customProgramCacheKey = () => 'bear-rush-wind-foliage-v1'
      this.windUniforms.push(wind)
      this.foliageMaterials.push(material)
      this.foliageBase.push(new THREE.Color(color))
    }
    this.waterMaterial = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.2, metalness: 0.06, clearcoat: 0.72, clearcoatRoughness: 0.14, side: THREE.DoubleSide })
    this.waterMaterial.onBeforeCompile = shader => {
      shader.uniforms.uWaterTime = { value: 0 }
      ;(this.waterMaterial.userData as { shader?: typeof shader }).shader = shader
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 worldUv;\nuniform float uWaterTime;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(worldUv.x * 1.8 + uWaterTime * 1.4) * 0.035 + sin(worldUv.y * 0.5 - uWaterTime * 0.9) * 0.025;')
    }
    this.waterMaterial.customProgramCacheKey = () => 'bear-rush-endless-river-v1'
    this.addSnow()
    this.update(0, new THREE.Vector3(-5, 0, 5))
  }

  get weatherLabel(): 'Clear' | 'Changing' | 'Snowing' {
    if (this.snowAmount > 0.68) return 'Snowing'
    if (this.snowAmount < 0.32) return 'Clear'
    return 'Changing'
  }

  get weatherIntensity(): number { return this.snowAmount }
  get chunkCount(): number { return this.chunks.size }

  windVector(): THREE.Vector3 {
    const angle = Math.sin(this.time * 0.037) * 0.62 + Math.sin(this.time * 0.011 + 1.4) * 0.28
    return new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(1.8 + this.snowAmount * 3.5)
  }

  update(dt: number, center: THREE.Vector3): void {
    this.time += Math.max(0, dt)
    this.ensureChunks(center.x, center.z)
    const period = CONFIG.world.seasonPeriod
    this.snowAmount = 0.5 + 0.5 * Math.sin((this.time / period) * Math.PI * 2 - Math.PI / 2)
    this.snowAmount = smoothstep(0.12, 0.9, this.snowAmount)
    this.terrain.setSnow(this.ground, this.snowAmount)
    const waterShader = this.waterMaterial.userData.shader as { uniforms?: Record<string, { value: number }> } | undefined
    if (waterShader?.uniforms?.uWaterTime) waterShader.uniforms.uWaterTime.value = this.time
    this.windUniforms.forEach(uniform => { uniform.value = this.time * (0.5 + this.snowAmount * 0.9) })
    const clear = new THREE.Color('#9bb5bd')
    const snowSky = new THREE.Color('#d2dce1')
    const sky = clear.clone().lerp(snowSky, this.snowAmount * 0.75)
    ;(this.scene.background as THREE.Color).copy(sky)
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.color.copy(sky)
    const winter = new THREE.Color('#e2e9e8')
    this.foliageMaterials.forEach((material, i) => material.color.copy(this.foliageBase[i]).lerp(winter, this.snowAmount * (0.18 + (i % 3) * 0.045)))
    this.sun.target.position.set(center.x, center.y, center.z)
    this.sun.position.set(center.x - 42, center.y + 72, center.z + 38)
    this.sun.target.updateMatrixWorld()
    this.animateSnow(dt, center)
  }

  private ensureChunks(x: number, z: number): void {
    const size = this.terrain.chunkSize
    const cx = Math.floor(x / size)
    const cz = Math.floor(z / size)
    const radius = CONFIG.world.renderChunkRadius
    const wanted = new Set<string>()
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const chunkX = cx + dx
        const chunkZ = cz + dz
        const key = `${chunkX},${chunkZ}`
        wanted.add(key)
        if (!this.chunks.has(key)) this.chunks.set(key, this.createChunk(chunkX, chunkZ))
      }
    }
    for (const [key, chunk] of this.chunks) {
      if (wanted.has(key)) continue
      this.scene.remove(chunk.root)
      for (const geometry of chunk.disposables) geometry.dispose()
      this.chunks.delete(key)
    }
  }

  private createChunk(chunkX: number, chunkZ: number): Chunk {
    const size = this.terrain.chunkSize
    const originX = chunkX * size
    const originZ = chunkZ * size
    const root = new THREE.Group()
    root.position.set(originX, 0, originZ)
    const disposables: THREE.BufferGeometry[] = []
    const groundGeometry = this.terrain.createGeometry(chunkX, chunkZ)
    disposables.push(groundGeometry)
    const ground = new THREE.Mesh(groundGeometry, this.ground)
    ground.receiveShadow = true
    root.add(ground)
    this.addRiver(root, originX, originZ, disposables)
    this.addDressing(root, chunkX, chunkZ)
    this.scene.add(root)
    return { root, disposables }
  }

  private addRiver(root: THREE.Group, originX: number, originZ: number, disposables: THREE.BufferGeometry[]): void {
    const size = this.terrain.chunkSize
    const middle = originZ + size * 0.5
    if (Math.abs(this.terrain.riverX(middle) - (originX + size * 0.5)) > size * 0.83) return
    const segments = 48
    const across = 10
    const positions: number[] = []
    const colors: number[] = []
    const worldUvs: number[] = []
    const indices: number[] = []
    const deep = new THREE.Color('#174c58')
    const shallows = new THREE.Color('#6b9a95')
    for (let i = 0; i <= segments; i += 1) {
      const z = originZ + (i / segments) * size
      const center = this.terrain.riverX(z)
      const y = this.terrain.waterY(z) + 0.11
      for (let j = 0; j <= across; j += 1) {
        const u = j / across
        const x = center + (u - 0.5) * CONFIG.world.riverWidth
        positions.push(x - originX, y, z - originZ)
        worldUvs.push(x / 5, z / 5)
        const color = deep.clone().lerp(shallows, Math.pow(Math.abs(u - 0.5) * 2, 1.35) * 0.56)
        colors.push(color.r, color.g, color.b)
        if (i < segments && j < across) {
          const a = i * (across + 1) + j
          const b = a + across + 1
          indices.push(a, b, a + 1, a + 1, b, b + 1)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setAttribute('worldUv', new THREE.Float32BufferAttribute(worldUvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    disposables.push(geometry)
    const water = new THREE.Mesh(geometry, this.waterMaterial)
    water.receiveShadow = true
    water.renderOrder = 1
    root.add(water)
  }

  private addDressing(root: THREE.Group, chunkX: number, chunkZ: number): void {
    const size = this.terrain.chunkSize
    const originX = chunkX * size
    const originZ = chunkZ * size
    const random = seededRandom((Math.imul(chunkX, 73856093) ^ Math.imul(chunkZ, 19349663) ^ 880127) >>> 0)
    const trunks: Matrix[] = []
    const pines: Matrix[] = []
    const broadLeaves: Matrix[] = []
    const rotate = new THREE.Euler()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const compose = (x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0): Matrix => {
      position.set(x, y, z); scale.set(sx, sy, sz); rotate.set(0, yaw, 0); quaternion.setFromEuler(rotate)
      return new THREE.Matrix4().compose(position, quaternion, scale)
    }
    const treeCount = 18
    for (let i = 0; i < treeCount; i += 1) {
      const x = 3 + random() * (size - 6)
      const z = 3 + random() * (size - 6)
      const worldX = originX + x
      const worldZ = originZ + z
      if (Math.abs(worldX - this.terrain.riverX(worldZ)) < 11 || this.terrain.trenchDistance(worldX, worldZ) < 11) continue
      const ground = this.terrain.sample(worldX, worldZ)
      if (ground.slope > 0.76) continue
      const height = 8.2 + random() * 8.8
      const yaw = random() * Math.PI * 2
      const trunkScale = 0.62 + random() * 0.28
      trunks.push(compose(x, height * 0.35 + ground.height, z, trunkScale, height * 0.72, trunkScale, yaw))
      if (random() < 0.17) {
        const lobes = 5 + Math.floor(random() * 3)
        for (let j = 0; j < lobes; j += 1) {
          const lx = x + (random() - 0.5) * 3.2
          const lz = z + (random() - 0.5) * 2.8
          const ly = ground.height + height * (0.64 + random() * 0.24)
          const s = 1.2 + random() * 0.9
          const matrix = compose(lx, ly, lz, s * 1.15, s * 0.78, s, yaw)
          broadLeaves.push(matrix)
        }
      } else {
        for (let tier = 0; tier < 3; tier += 1) {
          const crownY = ground.height + height * (0.4 + tier * 0.15)
          const radius = (0.78 - tier * 0.13) * (0.85 + random() * 0.4)
          pines.push(compose(x, crownY, z, radius * height * 0.095, height * (0.24 - tier * 0.025), radius * height * 0.095, yaw + tier * 0.6))
        }
      }
    }
    this.addInstances(root, this.trunkGeo, this.bark, trunks, true)
    this.addInstances(root, this.pineGeo, this.foliageMaterials[0], pines, true)
    this.addInstances(root, this.leafGeo, this.foliageMaterials[1], broadLeaves, true)

    const rocks: Matrix[] = []
    for (let i = 0; i < 34; i += 1) {
      const x = random() * size; const z = random() * size
      const worldX = originX + x; const worldZ = originZ + z
      const riverDistance = Math.abs(worldX - this.terrain.riverX(worldZ))
      const trenchDistance = this.terrain.trenchDistance(worldX, worldZ)
      if (riverDistance > 9 && trenchDistance > 9 && random() > 0.08) continue
      const s = trenchDistance < 9 ? 0.8 + random() * 2.3 : 0.3 + random() * 1.1
      rocks.push(compose(x, this.terrain.heightAt(worldX, worldZ) + s * 0.22, z, s * (0.8 + random() * 0.45), s * (0.55 + random() * 0.65), s * (0.75 + random() * 0.45), random() * Math.PI))
    }
    this.addInstances(root, this.rockGeo, this.rockMaterials[0], rocks, true)

    const grass: Matrix[] = []
    for (let i = 0; i < 230; i += 1) {
      const x = random() * size; const z = random() * size
      const worldX = originX + x; const worldZ = originZ + z
      if (Math.abs(worldX - this.terrain.riverX(worldZ)) < 6.5 || this.terrain.trenchDistance(worldX, worldZ) < 7) continue
      const y = this.terrain.heightAt(worldX, worldZ)
      if (this.terrain.sample(worldX, worldZ).slope > 0.65) continue
      const s = 0.55 + random() * 0.8
      grass.push(compose(x, y + 0.11, z, s, s, s, random() * Math.PI * 2))
    }
    this.addInstances(root, this.grassGeo, this.grassMaterials[0], grass, false)

    const shrubs: Matrix[] = []
    for (let j = 0; j < 28; j += 1) {
      const x = random() * size; const z = random() * size
      const worldX = originX + x; const worldZ = originZ + z
      if (Math.abs(worldX - this.terrain.riverX(worldZ)) < 7 || this.terrain.trenchDistance(worldX, worldZ) < 8) continue
      const s = 0.4 + random() * 0.55
      shrubs.push(compose(x, this.terrain.heightAt(worldX, worldZ) + s * 0.45, z, s * 1.2, s * 0.72, s, random() * Math.PI))
    }
    this.addInstances(root, this.shrubGeo, this.foliageMaterials[1], shrubs, true)
  }

  private addInstances(root: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, matrices: Matrix[], shadow: boolean): void {
    if (!matrices.length) return
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length)
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix))
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    mesh.castShadow = shadow
    mesh.receiveShadow = true
    root.add(mesh)
  }

  private addSnow(): void {
    const count = 950
    this.snowPositions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      this.snowPositions[i * 3] = (this.snowRandom() * 2 - 1) * 55
      this.snowPositions[i * 3 + 1] = 8 + this.snowRandom() * 48
      this.snowPositions[i * 3 + 2] = (this.snowRandom() * 2 - 1) * 55
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3))
    const material = new THREE.PointsMaterial({ color: '#f5f7f8', size: 0.12, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true })
    this.snow = new THREE.Points(geometry, material)
    this.scene.add(this.snow)
  }

  private animateSnow(dt: number, center: THREE.Vector3): void {
    this.snow.position.set(center.x, 0, center.z)
    const material = this.snow.material as THREE.PointsMaterial
    material.opacity = this.snowAmount * 0.68
    const wind = this.windVector()
    for (let i = 0; i < this.snowPositions.length; i += 3) {
      this.snowPositions[i] += wind.x * dt * 0.34
      this.snowPositions[i + 1] -= dt * (2.1 + (i % 7) * 0.12)
      this.snowPositions[i + 2] += wind.z * dt * 0.34
      const worldX = center.x + this.snowPositions[i]
      const worldZ = center.z + this.snowPositions[i + 2]
      if (this.snowPositions[i + 1] < this.terrain.heightAt(worldX, worldZ) + 0.7) {
        this.snowPositions[i] = (this.snowRandom() * 2 - 1) * 55
        this.snowPositions[i + 1] = 26 + this.snowRandom() * 34
        this.snowPositions[i + 2] = (this.snowRandom() * 2 - 1) * 55
      }
    }
    ;(this.snow.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  }
}
