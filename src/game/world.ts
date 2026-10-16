import * as THREE from 'three'
import { CONFIG } from './config'
import { seededRandom, smoothstep } from './noise'
import { Terrain } from './terrain'
import { createNaturalTexture } from './textures'

type Tree = { root: THREE.Group; phase: number; sway: number }

/** Naturalistic, continuous mountain terrain. The gameplay samples this same surface. */
export class World {
  readonly scene = new THREE.Scene()
  readonly terrain = new Terrain()
  private readonly ground: THREE.MeshStandardMaterial
  private readonly trees: Tree[] = []
  private readonly foliageMaterials: THREE.MeshStandardMaterial[] = []
  private snow!: THREE.Points
  private snowPositions!: Float32Array
  private waterMaterial?: THREE.MeshPhysicalMaterial
  private time = 0
  private snowAmount = 0

  constructor() {
    this.scene.background = new THREE.Color('#9db3bd')
    this.scene.fog = new THREE.FogExp2('#9db3bd', 0.0038)
    const hemisphere = new THREE.HemisphereLight('#dce8ed', '#394538', 1.65)
    this.scene.add(hemisphere)
    const sun = new THREE.DirectionalLight('#fff1d3', 3.1)
    sun.position.set(-42, 72, 38)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -68
    sun.shadow.camera.right = 68
    sun.shadow.camera.top = 76
    sun.shadow.camera.bottom = -76
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 210
    sun.shadow.bias = -0.00015
    sun.shadow.normalBias = 0.025
    this.scene.add(sun)
    const skyFill = new THREE.DirectionalLight('#a7c8df', 0.72)
    skyFill.position.set(42, 20, -48)
    this.scene.add(skyFill)

    this.ground = this.terrain.createMaterial()
    const groundMesh = new THREE.Mesh(this.terrain.createGeometry(), this.ground)
    groundMesh.receiveShadow = true
    groundMesh.castShadow = false
    this.scene.add(groundMesh)
    this.addWater()
    this.addForest()
    this.addRocks()
    this.addAlpineGroundCover()
    this.addSnow()
  }

  get weatherLabel(): 'Clear' | 'Changing' | 'Snowing' {
    if (this.snowAmount > 0.68) return 'Snowing'
    if (this.snowAmount < 0.32) return 'Clear'
    return 'Changing'
  }

  get weatherIntensity(): number { return this.snowAmount }

  update(dt: number): void {
    this.time += Math.max(0, dt)
    const period = CONFIG.world.seasonPeriod
    this.snowAmount = 0.5 + 0.5 * Math.sin((this.time / period) * Math.PI * 2 - Math.PI / 2)
    this.snowAmount = smoothstep(0.12, 0.9, this.snowAmount)
    this.terrain.setSnow(this.ground, this.snowAmount)
    const waterShader = this.waterMaterial?.userData.shader as { uniforms?: Record<string, { value: number }> } | undefined
    if (waterShader?.uniforms?.uWaterTime) waterShader.uniforms.uWaterTime.value = this.time
    const clear = new THREE.Color('#9bb5bd')
    const snowSky = new THREE.Color('#d2dce1')
    const fog = clear.clone().lerp(snowSky, this.snowAmount * 0.75)
    ;(this.scene.background as THREE.Color).copy(fog)
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.color.copy(fog)
    for (const tree of this.trees) {
      tree.root.rotation.z = Math.sin(this.time * 0.55 + tree.phase) * tree.sway * (0.7 + this.snowAmount * 0.4)
      tree.root.rotation.x = Math.cos(this.time * 0.38 + tree.phase * 1.6) * tree.sway * 0.27
    }
    const green = new THREE.Color('#ffffff')
    const winter = new THREE.Color('#e2e9e8')
    this.foliageMaterials.forEach((material, i) => material.color.copy(green).lerp(winter, this.snowAmount * (0.22 + (i % 3) * 0.06)))
    this.animateSnow(dt)
  }

  private addWater(): void {
    const segments = 260
    const across = 12
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const deep = new THREE.Color('#174c58')
    const shallows = new THREE.Color('#629493')
    for (let i = 0; i <= segments; i += 1) {
      const z = -CONFIG.world.halfSize * 0.95 + (i / segments) * CONFIG.world.halfSize * 1.9
      const center = this.terrain.riverX(z)
      const y = this.terrain.waterY(z)
      for (let j = 0; j <= across; j += 1) {
        const u = j / across
        const xOffset = (u - 0.5) * CONFIG.world.riverWidth
        positions.push(center + xOffset, y + Math.sin(this.time + i * 0.17 + j * 0.6) * 0.012, z)
        const c = deep.clone().lerp(shallows, Math.pow(Math.abs(u - 0.5) * 2, 1.45) * 0.55)
        colors.push(c.r, c.g, c.b)
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
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const material = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.2, metalness: 0.08, clearcoat: 0.62, clearcoatRoughness: 0.18, side: THREE.DoubleSide })
    material.onBeforeCompile = shader => {
      shader.uniforms.uWaterTime = { value: 0 }
      ;(material.userData as { shader?: typeof shader }).shader = shader
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWaterTime;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(position.x * 1.8 + uWaterTime * 1.4) * 0.035 + sin(position.z * 0.5 - uWaterTime * 0.9) * 0.025;')
    }
    material.customProgramCacheKey = () => 'bear-rush-mountain-water-v1'
    this.waterMaterial = material
    const water = new THREE.Mesh(geometry, material)
    water.receiveShadow = true
    water.renderOrder = 1
    this.scene.add(water)
  }

  private addForest(): void {
    const random = seededRandom(880127)
    const barkTexture = createNaturalTexture('bark')
    const barkBump = barkTexture?.clone()
    if (barkBump) { barkBump.colorSpace = THREE.NoColorSpace; barkBump.needsUpdate = true }
    const leafTexture = createNaturalTexture('foliage')
    const leafBump = leafTexture?.clone()
    if (leafBump) { leafBump.colorSpace = THREE.NoColorSpace; leafBump.needsUpdate = true }
    const bark = new THREE.MeshStandardMaterial({ color: '#ffffff', map: barkTexture ?? undefined, bumpMap: barkBump ?? undefined, bumpScale: 0.16, roughness: 0.98 })
    const barkLight = new THREE.MeshStandardMaterial({ color: '#ffffff', map: barkTexture ?? undefined, bumpMap: barkBump ?? undefined, bumpScale: 0.13, roughness: 0.98 })
    const leafColors = ['#edf2e5', '#e4ead7', '#eff0d8', '#e4e8d3']
    leafColors.forEach(color => this.foliageMaterials.push(new THREE.MeshStandardMaterial({ color, map: leafTexture ?? undefined, bumpMap: leafBump ?? undefined, bumpScale: 0.07, roughness: 0.96 })))
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.58, 1, 20, 4)
    const crownGeo = [
      new THREE.ConeGeometry(1.8, 3.1, 28, 4),
      new THREE.ConeGeometry(1.55, 2.8, 28, 4),
      new THREE.ConeGeometry(1.28, 2.5, 28, 4),
    ]
    const broadLeaf = new THREE.SphereGeometry(1, 24, 16)
    for (let i = 0; i < 120; i += 1) {
      const angle = random() * Math.PI * 2
      const radius = 19 + random() * 86
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      if (Math.abs(x) > CONFIG.world.halfSize - 8 || Math.abs(z) > CONFIG.world.halfSize - 8) continue
      if (Math.abs(x - this.terrain.riverX(z)) < 10 || this.terrain.trenchDistance(x, z) < 8) continue
      const ground = this.terrain.sample(x, z)
      if (ground.slope > 0.8) continue
      const height = 8.2 + random() * 8.7
      const root = new THREE.Group()
      const trunk = new THREE.Mesh(trunkGeo, random() < 0.22 ? barkLight : bark)
      trunk.position.y = height * 0.34
      trunk.scale.set(0.72 + random() * 0.4, height * 0.72, 0.72 + random() * 0.4)
      trunk.castShadow = true
      root.add(trunk)
      const isBroadleaf = random() < 0.2
      if (isBroadleaf) {
        for (let leaf = 0; leaf < 6; leaf += 1) {
          const crown = new THREE.Mesh(broadLeaf, this.foliageMaterials[Math.floor(random() * this.foliageMaterials.length)])
          crown.position.set((random() - 0.5) * 2.1, height * (0.62 + random() * 0.26), (random() - 0.5) * 1.9)
          crown.scale.set(1.5 + random() * 1.1, 1.1 + random() * 0.7, 1.4 + random() * 0.9)
          crown.castShadow = true
          root.add(crown)
        }
      } else {
        const turn = random() * Math.PI * 2
        for (let tier = 0; tier < crownGeo.length; tier += 1) {
          const crown = new THREE.Mesh(crownGeo[tier], this.foliageMaterials[Math.floor(random() * this.foliageMaterials.length)])
          crown.position.y = height * (0.37 + tier * 0.145)
          crown.scale.set(0.68 + random() * 0.5, 0.82 + random() * 0.42, 0.68 + random() * 0.5)
          crown.rotation.y = turn + tier * 0.7
          crown.castShadow = true
          root.add(crown)
        }
      }
      root.position.set(x, ground.height, z)
      root.rotation.y = random() * Math.PI * 2
      this.scene.add(root)
      this.trees.push({ root, phase: random() * Math.PI * 2, sway: 0.008 + random() * 0.014 })
    }
    this.addShrubs(random)
  }

  private addShrubs(random: () => number): void {
    const geometry = new THREE.SphereGeometry(1, 18, 14)
    const leafTexture = createNaturalTexture('foliage')
    const materials = ['#98a981', '#a5ae8a', '#b2b995'].map(color => new THREE.MeshStandardMaterial({ color, map: leafTexture ?? undefined, roughness: 1 }))
    const instances = materials.map(material => {
      const mesh = new THREE.InstancedMesh(geometry, material, 130)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.scene.add(mesh)
      return { mesh, count: 0 }
    })
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 310; i += 1) {
      const angle = random() * Math.PI * 2
      const radius = 11 + random() * 93
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      if (Math.abs(x - this.terrain.riverX(z)) < 7 || this.terrain.trenchDistance(x, z) < 7) continue
      const group = instances[Math.floor(random() * instances.length)]
      if (group.count >= 130) continue
      const y = this.terrain.heightAt(x, z)
      dummy.position.set(x, y + 0.45, z)
      dummy.rotation.set(random() * 0.15, random() * Math.PI, random() * 0.12)
      dummy.scale.set(0.55 + random() * 0.8, 0.35 + random() * 0.5, 0.55 + random() * 0.75)
      dummy.updateMatrix()
      group.mesh.setMatrixAt(group.count++, dummy.matrix)
    }
    instances.forEach(({ mesh, count }) => { mesh.count = count; mesh.instanceMatrix.needsUpdate = true })
  }

  private addRocks(): void {
    const random = seededRandom(412005)
    const geometry = new THREE.IcosahedronGeometry(1, 2)
    const rockTexture = createNaturalTexture('rock')
    const rockBump = rockTexture?.clone()
    if (rockBump) { rockBump.colorSpace = THREE.NoColorSpace; rockBump.needsUpdate = true }
    const materials = ['#e3e0d8', '#d8d3c7', '#c9c6bd', '#ece5d7'].map(color => new THREE.MeshStandardMaterial({ color, map: rockTexture ?? undefined, bumpMap: rockBump ?? undefined, bumpScale: 0.13, roughness: 0.98 }))
    const meshes = materials.map(material => {
      const mesh = new THREE.InstancedMesh(geometry, material, 120)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.scene.add(mesh)
      return { mesh, count: 0 }
    })
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 360; i += 1) {
      const x = (random() * 2 - 1) * (CONFIG.world.halfSize - 8)
      const z = (random() * 2 - 1) * (CONFIG.world.halfSize - 8)
      const riverDist = Math.abs(x - this.terrain.riverX(z))
      const trenchDist = this.terrain.trenchDistance(x, z)
      const isEdge = trenchDist < 8.6
      if (!isEdge && riverDist > 6.3 && random() > 0.24) continue
      const group = meshes[Math.floor(random() * meshes.length)]
      if (group.count >= 120) continue
      dummy.position.set(x, this.terrain.heightAt(x, z) + 0.22, z)
      dummy.rotation.set(random() * 0.35, random() * Math.PI, random() * 0.35)
      const s = isEdge ? 0.7 + random() * 2.2 : 0.22 + random() * 0.8
      dummy.scale.set(s * (0.8 + random() * 0.4), s * (0.55 + random() * 0.7), s * (0.7 + random() * 0.6))
      dummy.updateMatrix()
      group.mesh.setMatrixAt(group.count++, dummy.matrix)
    }
    meshes.forEach(({ mesh, count }) => { mesh.count = count; mesh.instanceMatrix.needsUpdate = true })
  }

  private addAlpineGroundCover(): void {
    const random = seededRandom(30819)
    const bladeGeo = new THREE.ConeGeometry(0.045, 0.36, 6, 2)
    const mats = ['#596c45', '#6d7850', '#87906c'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }))
    const patches = mats.map(material => {
      const mesh = new THREE.InstancedMesh(bladeGeo, material, 900)
      mesh.castShadow = false
      this.scene.add(mesh)
      return { mesh, count: 0 }
    })
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 1900; i += 1) {
      const x = (random() * 2 - 1) * (CONFIG.world.halfSize - 4)
      const z = (random() * 2 - 1) * (CONFIG.world.halfSize - 4)
      if (Math.abs(x - this.terrain.riverX(z)) < 5 || this.terrain.trenchDistance(x, z) < 6) continue
      const target = patches[Math.floor(random() * patches.length)]
      if (target.count >= 900) continue
      const height = this.terrain.heightAt(x, z)
      dummy.position.set(x, height + 0.12, z)
      dummy.rotation.set(0.08 + random() * 0.22, random() * Math.PI, 0.12 + random() * 0.36)
      dummy.scale.set(0.65 + random() * 0.7, 0.42 + random() * 0.85, 0.65 + random() * 0.7)
      dummy.updateMatrix()
      target.mesh.setMatrixAt(target.count++, dummy.matrix)
    }
    patches.forEach(({ mesh, count }) => { mesh.count = count; mesh.instanceMatrix.needsUpdate = true })
  }

  private addSnow(): void {
    const count = 1100
    this.snowPositions = new Float32Array(count * 3)
    const random = seededRandom(1822)
    for (let i = 0; i < count; i += 1) {
      this.snowPositions[i * 3] = (random() * 2 - 1) * CONFIG.world.halfSize
      this.snowPositions[i * 3 + 1] = 5 + random() * 48
      this.snowPositions[i * 3 + 2] = (random() * 2 - 1) * CONFIG.world.halfSize
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3))
    const material = new THREE.PointsMaterial({ color: '#f5f7f8', size: 0.13, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true })
    this.snow = new THREE.Points(geometry, material)
    this.scene.add(this.snow)
  }

  private animateSnow(dt: number): void {
    const material = this.snow.material as THREE.PointsMaterial
    material.opacity = this.snowAmount * 0.72
    const positions = this.snow.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < this.snowPositions.length; i += 3) {
      this.snowPositions[i + 1] -= dt * (2.1 + (i % 7) * 0.14)
      this.snowPositions[i] += Math.sin(this.time * 0.7 + i) * dt * 0.25
      if (this.snowPositions[i + 1] < this.terrain.heightAt(this.snowPositions[i], this.snowPositions[i + 2])) {
        this.snowPositions[i + 1] = 28 + (i % 29)
      }
    }
    positions.needsUpdate = true
  }
}
