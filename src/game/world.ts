import * as THREE from 'three'
import { CONFIG } from './config'

export type RiverVector = { x: number; y: number; z: number }
type SwayTree = { root: THREE.Group; phase: number; amount: number }
type Foam = { mesh: THREE.Mesh; z: number; offset: number; pace: number; phase: number }

/** Full forest valley and the shared height/bend functions used by fish and floating hazards. */
export class World {
  readonly scene = new THREE.Scene()
  readonly riverWidth = CONFIG.world.riverWidth
  private readonly water: THREE.Mesh
  private waterTime?: { value: number }
  private readonly trees: SwayTree[] = []
  private readonly foam: Foam[] = []
  private time = 0
  private current = CONFIG.run.startSpeed
  private readonly endZ = CONFIG.world.endZ

  constructor() {
    this.scene.background = new THREE.Color('#9ab9b0')
    this.scene.fog = new THREE.FogExp2('#9ab9b0', 0.0053)

    const hemisphere = new THREE.HemisphereLight('#e7f4e9', '#344737', 1.55)
    this.scene.add(hemisphere)
    const sun = new THREE.DirectionalLight('#fff1d0', 2.35)
    sun.position.set(-34, 56, 22)
    sun.castShadow = true
    sun.shadow.mapSize.set(1536, 1536)
    sun.shadow.camera.left = -48
    sun.shadow.camera.right = 48
    sun.shadow.camera.top = 60
    sun.shadow.camera.bottom = -60
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 210
    this.scene.add(sun)
    const fill = new THREE.DirectionalLight('#8bb6c5', 0.55)
    fill.position.set(35, 14, -35)
    this.scene.add(fill)

    this.addDistantRidges()
    this.addBanks()
    const waterMaterial = this.makeWaterMaterial()
    this.water = new THREE.Mesh(this.makeRiverGeometry(), waterMaterial)
    this.water.receiveShadow = true
    this.water.renderOrder = 1
    this.scene.add(this.water)
    this.addCascade()
    this.addForest()
    this.addRiversideDetails()
    this.addFoam()
  }

  /** World-space centerline position plus a lateral offset, sampled at the requested river z. */
  riverPoint(z: number, offset = 0, lift = 0): THREE.Vector3 {
    return new THREE.Vector3(this.riverCenterX(z) + offset, this.waterHeight(z) + lift, z)
  }

  /** Slope-aware downstream tangent; the flow axis is positive z. */
  riverTangent(z: number): THREE.Vector3 {
    const h = 0.7
    const dx = this.riverCenterX(z + h) - this.riverCenterX(z - h)
    const dy = this.waterHeight(z + h) - this.waterHeight(z - h)
    return new THREE.Vector3(dx, dy, h * 2).normalize()
  }

  /** A safe walkable strip on the right bank. Offset is measured out from the river edge. */
  bankPoint(z: number, side = 1, offset = 1.1): THREE.Vector3 {
    const outward = this.riverWidth * 0.5 + offset
    const x = this.riverCenterX(z) + side * outward
    const y = this.waterHeight(z) + this.bankRise(z, offset)
    return new THREE.Vector3(x, y, z)
  }

  waterHeight(z: number): number {
    return 0.16 + Math.sin(z * 0.035 + 0.7) * 0.26 + Math.sin(z * 0.089 - 0.8) * 0.09
  }

  riverCenterX(z: number): number {
    return 3.45 * Math.sin(z * 0.037) + 1.15 * Math.sin(z * 0.083 + 0.7) + 0.35 * Math.sin(z * 0.017 + 1.3)
  }

  update(dt: number, speed = this.current): void {
    this.time += dt
    this.current = speed
    if (this.waterTime) this.waterTime.value = this.time
    for (const tree of this.trees) {
      tree.root.rotation.z = Math.sin(this.time * 0.68 + tree.phase) * tree.amount
      tree.root.rotation.x = Math.cos(this.time * 0.44 + tree.phase * 1.7) * tree.amount * 0.32
    }
    for (const streak of this.foam) {
      streak.z += speed * streak.pace * dt
      if (streak.z > this.endZ) streak.z = CONFIG.world.startZ + ((streak.phase * 17) % 26)
      const p = this.riverPoint(streak.z, streak.offset, 0.105 + Math.sin(this.time * 2.2 + streak.phase) * 0.035)
      streak.mesh.position.copy(p)
      const tangent = this.riverTangent(streak.z)
      streak.mesh.rotation.set(Math.atan2(-tangent.y, Math.hypot(tangent.x, tangent.z)), Math.atan2(tangent.x, tangent.z), 0)
      streak.mesh.scale.x = 0.75 + 0.35 * Math.sin(this.time * 2.8 + streak.phase)
    }
  }

  private bankRise(z: number, offset: number): number {
    return 0.24 + Math.min(2.5, offset * 0.42) + Math.sin(z * 0.15 + offset * 0.55) * 0.09
  }

  private makeWaterMaterial(): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      color: '#287f88', roughness: 0.22, metalness: 0.1, clearcoat: 0.58, clearcoatRoughness: 0.24,
      side: THREE.DoubleSide, vertexColors: true,
    })
    material.onBeforeCompile = shader => {
      shader.uniforms.uRiverTime = { value: 0 }
      this.waterTime = shader.uniforms.uRiverTime
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uRiverTime;')
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float riverWaveA = sin(position.x * 1.25 + position.z * 0.12 + uRiverTime * 2.3);
        float riverWaveB = sin(position.x * 2.4 - position.z * 0.19 - uRiverTime * 1.45);
        transformed.y += riverWaveA * 0.045 + riverWaveB * 0.025;`)
    }
    material.customProgramCacheKey = () => 'bear-rush-river-waves-v2'
    return material
  }

  private makeRiverGeometry(): THREE.BufferGeometry {
    const segments = CONFIG.world.riverSegments
    const across = 14
    const start = CONFIG.world.startZ
    const end = CONFIG.world.endZ
    const positions: number[] = []
    const colors: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    const deep = new THREE.Color('#1e747d')
    const shallows = new THREE.Color('#4c9b95')
    for (let i = 0; i <= segments; i += 1) {
      const z = start + (i / segments) * (end - start)
      const center = this.riverCenterX(z)
      const surface = this.waterHeight(z)
      for (let j = 0; j <= across; j += 1) {
        const u = j / across
        const lateral = (u - 0.5) * this.riverWidth
        positions.push(center + lateral, surface + Math.sin(u * Math.PI) * 0.035, z)
        const shade = Math.pow(Math.abs(u - 0.5) * 2, 1.8)
        const color = deep.clone().lerp(shallows, shade * 0.66)
        colors.push(color.r, color.g, color.b)
        uvs.push(u, i / segments)
        if (i < segments && j < across) {
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
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }

  private makeBank(side: number): THREE.Mesh {
    const segments = 220
    const across = 12
    const start = CONFIG.world.startZ
    const end = CONFIG.world.endZ
    const depth = CONFIG.world.bankDepth
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const shoreline = new THREE.Color('#7d8063')
    const moss = new THREE.Color('#55724b')
    const canopyShade = new THREE.Color('#314f3a')
    for (let i = 0; i <= segments; i += 1) {
      const z = start + (i / segments) * (end - start)
      const center = this.riverCenterX(z)
      const waterY = this.waterHeight(z)
      for (let j = 0; j <= across; j += 1) {
        const t = j / across
        const offset = 0.08 + t * depth
        const ridge = Math.sin(z * 0.11 + t * 7.2 + side) * 0.22 + Math.sin(z * 0.037 - t * 12) * 0.3
        const h = this.bankRise(z, offset) + ridge * (0.3 + t)
        positions.push(center + side * (this.riverWidth * 0.5 + offset), waterY + h, z)
        const color = t < 0.08 ? shoreline.clone().lerp(moss, t / 0.08) : moss.clone().lerp(canopyShade, Math.max(0, t - 0.68) * 1.7)
        const noise = 0.88 + 0.12 * (0.5 + 0.5 * Math.sin(z * 0.21 + t * 13.4))
        colors.push(color.r * noise, color.g * noise, color.b * noise)
        if (i < segments && j < across) {
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
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    return mesh
  }

  private addBanks(): void {
    this.scene.add(this.makeBank(-1), this.makeBank(1))
    const pathMat = new THREE.MeshStandardMaterial({ color: '#8a7957', roughness: 1, side: THREE.DoubleSide })
    for (let side of [-1, 1]) {
      const points: THREE.Vector3[] = []
      for (let z = CONFIG.world.startZ; z <= CONFIG.world.endZ; z += 2.4) {
        const p = this.bankPoint(z, side, 1.2)
        points.push(new THREE.Vector3(p.x, p.y + 0.04, z))
      }
      const curve = new THREE.CatmullRomCurve3(points)
      const verts: number[] = []
      const inds: number[] = []
      for (let i = 0; i <= 220; i += 1) {
        const z = CONFIG.world.startZ + (i / 220) * (CONFIG.world.endZ - CONFIG.world.startZ)
        const p = curve.getPoint(i / 220)
        const bankTangent = this.riverTangent(z)
        const widthX = bankTangent.z * 0.95
        const widthZ = -bankTangent.x * 0.95
        verts.push(p.x - widthX, p.y, p.z - widthZ, p.x + widthX, p.y + 0.02, p.z + widthZ)
        if (i < 220) {
          const a = i * 2
          inds.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
        }
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
      geometry.setIndex(inds)
      geometry.computeVertexNormals()
      const mesh = new THREE.Mesh(geometry, pathMat)
      mesh.receiveShadow = true
      this.scene.add(mesh)
    }
  }

  private addDistantRidges(): void {
    const ridgeMats = ['#70867a', '#7c9383', '#8ca093'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, fog: true }))
    for (let i = 0; i < 13; i += 1) {
      const h = 22 + (i % 5) * 5
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(14 + (i % 3) * 4, h, 7, 2), ridgeMats[i % ridgeMats.length])
      ridge.position.set(-80 + i * 13.5, h * 0.34 - 4, -190 - (i % 4) * 5)
      ridge.rotation.z = (i % 2 ? 1 : -1) * 0.11
      this.scene.add(ridge)
    }
  }

  private addCascade(): void {
    const z = CONFIG.world.startZ + 15
    const centerX = this.riverCenterX(z)
    const rock = new THREE.MeshStandardMaterial({ color: '#6f7668', roughness: 0.96, flatShading: true })
    const cliff = new THREE.Mesh(new THREE.DodecahedronGeometry(16, 1), rock)
    cliff.scale.set(1.8, 0.95, 0.42)
    cliff.position.set(centerX, 5.6, z - 7)
    this.scene.add(cliff)
    const falls = new THREE.Group()
    const waterMat = new THREE.MeshPhysicalMaterial({ color: '#cce9e4', transparent: true, opacity: 0.77, roughness: 0.14, metalness: 0.05, side: THREE.DoubleSide })
    for (let i = -1; i <= 1; i += 1) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.4 + (i === 0 ? 1.2 : 0), 8.5), waterMat)
      sheet.position.set(centerX + i * 2.5, 3.9, z - 2.4)
      sheet.rotation.z = Math.sin(i * 0.6) * 0.06
      falls.add(sheet)
    }
    const foam = new THREE.Mesh(new THREE.SphereGeometry(4.8, 20, 12), new THREE.MeshBasicMaterial({ color: '#d8eee4', transparent: true, opacity: 0.33 }))
    foam.scale.set(1.3, 0.12, 1.2)
    foam.position.set(centerX, 0.34, z + 1.7)
    falls.add(foam)
    this.scene.add(falls)
    const spray = new THREE.PointLight('#d5f5ee', 1.1, 24)
    spray.position.set(centerX, 3.2, z + 1)
    this.scene.add(spray)
  }

  private addForest(): void {
    const bark = new THREE.MeshStandardMaterial({ color: '#4b3327', roughness: 1, flatShading: true })
    const barkLight = new THREE.MeshStandardMaterial({ color: '#76503a', roughness: 1, flatShading: true })
    const leafMats = ['#234c38', '#2c5a3e', '#386748', '#476f4e'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }))
    const broadMats = ['#38614a', '#4a7050', '#5b7950'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.98, flatShading: true }))
    const trunkGeo = new THREE.CylinderGeometry(0.19, 0.42, 1, 7)
    const pineGeo = [new THREE.ConeGeometry(1.45, 2.15, 8, 2), new THREE.ConeGeometry(1.18, 2.05, 8, 2), new THREE.ConeGeometry(0.9, 1.75, 8, 2)]
    const broadGeo = new THREE.SphereGeometry(1, 9, 7)
    const rng = random(615477)
    for (let z = CONFIG.world.startZ + 22; z < CONFIG.world.endZ + 18; z += 7.5) {
      for (const side of [-1, 1]) {
        const count = 1 + (rng() > 0.42 ? 1 : 0)
        for (let n = 0; n < count; n += 1) {
          const offset = 6.5 + rng() * 18
          const p = this.bankPoint(z + (rng() - 0.5) * 5, side, offset)
          const h = 5.7 + rng() * 5.8
          const root = new THREE.Group()
          const trunk = new THREE.Mesh(trunkGeo, rng() < 0.24 ? barkLight : bark)
          trunk.position.y = h * 0.34
          trunk.scale.set(1, h * 0.68, 1)
          trunk.castShadow = true
          root.add(trunk)
          if (rng() < 0.18) {
            for (let c = 0; c < 4; c += 1) {
              const crown = new THREE.Mesh(broadGeo, broadMats[Math.floor(rng() * broadMats.length)])
              crown.position.set((rng() - 0.5) * 1.1, h * (0.57 + rng() * 0.2), (rng() - 0.5) * 0.8)
              crown.scale.set(1.15 + rng() * 0.55, 0.85 + rng() * 0.5, 1.05 + rng() * 0.5)
              crown.castShadow = true
              root.add(crown)
            }
          } else {
            for (let tier = 0; tier < 3; tier += 1) {
              const crown = new THREE.Mesh(pineGeo[tier], leafMats[Math.floor(rng() * leafMats.length)])
              crown.position.y = h * (0.36 + tier * 0.17)
              crown.scale.setScalar(0.74 + rng() * 0.36)
              crown.rotation.y = rng() * 0.8
              crown.castShadow = true
              root.add(crown)
            }
          }
          root.position.set(p.x, p.y, p.z)
          root.rotation.y = rng() * Math.PI
          this.scene.add(root)
          this.trees.push({ root, phase: rng() * Math.PI * 2, amount: 0.012 + rng() * 0.023 })
        }
      }
    }
    this.addFarGroundTrees(rng, trunkGeo, pineGeo, bark, leafMats)
  }

  private addFarGroundTrees(rng: () => number, trunkGeo: THREE.BufferGeometry, pineGeo: THREE.BufferGeometry[], bark: THREE.Material, leafMats: THREE.Material[]): void {
    for (let side of [-1, 1]) {
      for (let i = 0; i < 32; i += 1) {
        const z = CONFIG.world.startZ + 10 + rng() * 195
        const offset = 18 + rng() * 42
        const p = this.bankPoint(z, side, offset)
        const height = 7 + rng() * 9
        const root = new THREE.Group()
        const trunk = new THREE.Mesh(trunkGeo, bark)
        trunk.scale.set(0.9, height * 0.72, 0.9)
        trunk.position.y = height * 0.36
        root.add(trunk)
        for (let tier = 0; tier < 3; tier += 1) {
          const crown = new THREE.Mesh(pineGeo[tier], leafMats[Math.floor(rng() * leafMats.length)])
          crown.position.y = height * (0.34 + tier * 0.18)
          crown.scale.setScalar(1.2 + rng() * 0.7)
          root.add(crown)
        }
        root.position.copy(p)
        root.rotation.y = rng() * Math.PI
        this.scene.add(root)
        this.trees.push({ root, phase: rng() * Math.PI * 2, amount: 0.007 + rng() * 0.012 })
      }
    }
  }

  private addRiversideDetails(): void {
    const rng = random(9931)
    const rockGeo = new THREE.DodecahedronGeometry(0.58, 1)
    const rockMats = ['#5d6656', '#697362', '#777968', '#827d69'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.97, flatShading: true }))
    const fernMats = ['#315c40', '#47734d', '#61804c'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }))
    const stemGeo = new THREE.ConeGeometry(0.085, 0.9, 5, 1)
    for (let i = 0; i < 132; i += 1) {
      const z = CONFIG.world.startZ + 7 + rng() * (CONFIG.world.endZ - CONFIG.world.startZ - 8)
      const side = rng() < 0.5 ? -1 : 1
      const offset = 0.25 + rng() * 3.8
      const p = this.bankPoint(z, side, offset)
      if (rng() < 0.66) {
        const rock = new THREE.Mesh(rockGeo, rockMats[Math.floor(rng() * rockMats.length)])
        rock.position.copy(p)
        rock.position.y -= 0.18
        rock.scale.set(0.8 + rng() * 1.4, 0.45 + rng() * 0.6, 0.8 + rng() * 1.35)
        rock.rotation.set(rng() * 0.25, rng() * Math.PI, rng() * 0.2)
        rock.castShadow = true
        rock.receiveShadow = true
        this.scene.add(rock)
      } else {
        const fern = new THREE.Group()
        for (let leaf = 0; leaf < 5; leaf += 1) {
          const blade = new THREE.Mesh(stemGeo, fernMats[Math.floor(rng() * fernMats.length)])
          blade.position.set(Math.cos(leaf * 1.25) * 0.36, 0.35, Math.sin(leaf * 1.25) * 0.36)
          blade.rotation.z = -0.45 - rng() * 0.55
          blade.rotation.y = leaf * 1.25
          blade.scale.y = 0.8 + rng() * 0.9
          fern.add(blade)
        }
        fern.position.copy(p)
        fern.rotation.y = rng() * Math.PI
        this.scene.add(fern)
      }
    }
  }

  private addFoam(): void {
    const mat = new THREE.MeshBasicMaterial({ color: '#d3eee4', transparent: true, opacity: 0.72, depthWrite: false })
    const rng = random(1148)
    for (let i = 0; i < 58; i += 1) {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.72 + rng() * 1.1, 2, 5), mat)
      this.scene.add(mesh)
      this.foam.push({ mesh, z: CONFIG.world.startZ + rng() * (CONFIG.world.endZ - CONFIG.world.startZ), offset: (rng() - 0.5) * this.riverWidth * 0.72, pace: 0.68 + rng() * 0.55, phase: rng() * Math.PI * 10 })
    }
  }
}

function random(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
