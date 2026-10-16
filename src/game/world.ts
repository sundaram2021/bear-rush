import * as THREE from 'three'
import { makeRng } from './noise'
import { Terrain } from './terrain'

const SKY_CLEAR = new THREE.Color('#93b2c4')
const SKY_SNOW = new THREE.Color('#cdd6da')
const FOLIAGE_CLEAR = new THREE.Color('#2f5138')
const FOLIAGE_SNOW = new THREE.Color('#d7e2e6')

/** The full living mountain valley: heightfield, river, forest, rocks, weather and snow. */
export class World {
  readonly scene = new THREE.Scene()
  readonly terrain = new Terrain()
  private readonly sun: THREE.DirectionalLight
  private readonly hemi: THREE.HemisphereLight
  private readonly foliageMaterials: THREE.MeshStandardMaterial[] = []
  private readonly snow: THREE.Points
  private readonly snowMaterial: THREE.PointsMaterial
  private readonly snowLocal: Float32Array
  private time = 0
  private winter = 0
  private readonly snowBox = 120

  constructor() {
    this.scene.background = SKY_CLEAR.clone()
    this.scene.fog = new THREE.FogExp2(SKY_CLEAR.getHex(), 0.0052)

    this.hemi = new THREE.HemisphereLight('#eaf2f6', '#3a4a32', 1.35)
    this.scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight('#fff0d2', 2.2)
    this.sun.position.set(-40, 70, 34)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1536, 1536)
    const sc = this.sun.shadow.camera
    sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 220
    this.scene.add(this.sun)
    this.scene.add(this.sun.target)
    const fill = new THREE.DirectionalLight('#9fbcd0', 0.5)
    fill.position.set(48, 20, -40)
    this.scene.add(fill)

    const ground = this.terrain.buildMesh()
    this.scene.add(ground)
    this.scene.add(this.terrain.buildWater())

    this.addForest()
    this.addRocks()

    const count = 1600
    this.snowLocal = new Float32Array(count * 3)
    const rng = makeRng(4021)
    for (let i = 0; i < count; i += 1) {
      this.snowLocal[i * 3] = (rng() - 0.5) * this.snowBox
      this.snowLocal[i * 3 + 1] = rng() * this.snowBox
      this.snowLocal[i * 3 + 2] = (rng() - 0.5) * this.snowBox
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.snowLocal, 3))
    this.snowMaterial = new THREE.PointsMaterial({ color: '#ffffff', size: 0.32, transparent: true, opacity: 0, depthWrite: false, fog: false })
    this.snow = new THREE.Points(geo, this.snowMaterial)
    this.snow.frustumCulled = false
    this.scene.add(this.snow)
  }

  /** 0 = clear green summer, 1 = heavy snowfall. */
  get snowfall(): number { return this.winter }

  /** Smoothly drift between clear and snowy conditions and repaint sky, fog, light and foliage. */
  setWinter(value: number): void {
    this.winter = THREE.MathUtils.clamp(value, 0, 1)
    this.terrain.uniforms.uSnow.value = this.winter
    const sky = SKY_CLEAR.clone().lerp(SKY_SNOW, this.winter)
    ;(this.scene.background as THREE.Color).copy(sky)
    ;(this.scene.fog as THREE.FogExp2).color.copy(sky)
    ;(this.scene.fog as THREE.FogExp2).density = 0.0052 + this.winter * 0.0028
    this.sun.intensity = 2.2 - this.winter * 0.9
    this.sun.color.set('#fff0d2').lerp(new THREE.Color('#dbe6ea'), this.winter)
    this.hemi.intensity = 1.35 + this.winter * 0.25
    for (const material of this.foliageMaterials) material.color.copy(FOLIAGE_CLEAR).lerp(FOLIAGE_SNOW, this.winter * 0.72)
    this.snowMaterial.opacity = Math.max(0, this.winter - 0.18) * 1.05
  }

  update(dt: number, camera: THREE.Vector3): void {
    this.time += dt
    this.terrain.updateWater(dt)
    this.sun.position.set(camera.x - 40, camera.y + 70, camera.z + 34)
    this.sun.target.position.set(camera.x, camera.y - 4, camera.z)
    this.sun.target.updateMatrixWorld()

    const half = this.snowBox / 2
    for (let i = 0; i < this.snowLocal.length; i += 3) {
      this.snowLocal[i + 1] -= (5.5 + (i % 7) * 0.25) * dt
      this.snowLocal[i] += Math.sin(this.time * 1.3 + i) * dt * 0.8
      if (this.snowLocal[i + 1] < 0) {
        this.snowLocal[i + 1] = this.snowBox
        this.snowLocal[i] = (Math.random() - 0.5) * this.snowBox
        this.snowLocal[i + 2] = (Math.random() - 0.5) * this.snowBox
      } else {
        if (this.snowLocal[i] > half) this.snowLocal[i] -= this.snowBox
        else if (this.snowLocal[i] < -half) this.snowLocal[i] += this.snowBox
        if (this.snowLocal[i + 2] > half) this.snowLocal[i + 2] -= this.snowBox
        else if (this.snowLocal[i + 2] < -half) this.snowLocal[i + 2] += this.snowBox
      }
    }
    ;(this.snow.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    this.snow.position.set(camera.x, camera.y - 6, camera.z)
  }

  private addForest(): void {
    const rng = makeRng(615477)
    const trunks: THREE.Matrix4[] = []
    const foliage: THREE.Matrix4[] = []
    const dummy = new THREE.Object3D()
    const limit = this.terrain.half - 30
    let attempts = 0
    while (trunks.length < 620 && attempts < 12_000) {
      attempts += 1
      const x = (rng() * 2 - 1) * limit
      const z = (rng() * 2 - 1) * limit
      if (this.terrain.isWater(x, z)) continue
      if (this.terrain.trenchDepth(x, z) > 0.5) continue
      if (this.terrain.slope(x, z) > 1.25) continue
      const r = Math.hypot(x, z)
      const y = this.terrain.height(x, z)
      if (y < this.terrain.waterY(z) + 0.4) continue
      const scale = 0.75 + rng() * 0.9
      const h = (5.5 + rng() * 5) * scale
      const thin = r * 0.00055 + 0.55
      dummy.position.set(x, y + h * 0.34, z)
      dummy.rotation.set(0, rng() * Math.PI, 0)
      dummy.scale.set(thin * scale, h * 0.68, thin * scale)
      dummy.updateMatrix()
      trunks.push(dummy.matrix.clone())
      for (let tier = 0; tier < 3; tier += 1) {
        const fs = (1.5 - tier * 0.32) * scale * (0.9 + rng() * 0.25)
        dummy.position.set(x, y + h * (0.34 + tier * 0.2), z)
        dummy.rotation.set(0, rng() * Math.PI, 0)
        dummy.scale.set(fs, fs * 1.35, fs)
        dummy.updateMatrix()
        foliage.push(dummy.matrix.clone())
      }
    }
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.34, 1, 6)
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3527', roughness: 1, flatShading: true })
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, trunks.length)
    trunks.forEach((m, i) => trunkMesh.setMatrixAt(i, m))
    trunkMesh.castShadow = true
    trunkMesh.receiveShadow = true
    trunkMesh.instanceMatrix.needsUpdate = true
    this.scene.add(trunkMesh)

    const foliageGeo = new THREE.ConeGeometry(1, 1, 7, 2)
    const foliageMat = new THREE.MeshStandardMaterial({ color: FOLIAGE_CLEAR.clone(), roughness: 1, flatShading: true })
    this.foliageMaterials.push(foliageMat)
    const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, foliage.length)
    foliage.forEach((m, i) => foliageMesh.setMatrixAt(i, m))
    foliageMesh.castShadow = true
    foliageMesh.receiveShadow = true
    foliageMesh.instanceMatrix.needsUpdate = true
    this.scene.add(foliageMesh)
  }

  private addRocks(): void {
    const rng = makeRng(9931)
    const mats: THREE.Matrix4[] = []
    const dummy = new THREE.Object3D()
    const limit = this.terrain.half - 20
    for (let i = 0; i < 520; i += 1) {
      const x = (rng() * 2 - 1) * limit
      const z = (rng() * 2 - 1) * limit
      if (this.terrain.isWater(x, z)) continue
      const y = this.terrain.height(x, z)
      const s = 0.6 + rng() * 2.6
      dummy.position.set(x, y - s * 0.25, z)
      dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
      dummy.scale.set(s, s * (0.55 + rng() * 0.5), s * (0.85 + rng() * 0.4))
      dummy.updateMatrix()
      mats.push(dummy.matrix.clone())
    }
    const geo = new THREE.DodecahedronGeometry(0.7, 1)
    const mat = new THREE.MeshStandardMaterial({ color: '#6d6a62', roughness: 1, flatShading: true })
    const mesh = new THREE.InstancedMesh(geo, mat, mats.length)
    mats.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.instanceMatrix.needsUpdate = true
    this.scene.add(mesh)
  }
}
