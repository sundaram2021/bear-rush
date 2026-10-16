import * as THREE from 'three'
import type { FoodKind } from './config'
import type { Terrain } from './terrain'

type Stats = { flee: number; speed: number; wander: number; catchR: number; elevated: boolean }
const STATS: Record<FoodKind, Stats> = {
  salmon: { flee: 0, speed: 0, wander: 0, catchR: 2.7, elevated: true },
  honey: { flee: 0, speed: 0, wander: 0, catchR: 2.4, elevated: false },
  fawn: { flee: 11, speed: 3.4, wander: 1.6, catchR: 2.6, elevated: false },
  deer: { flee: 16, speed: 5.2, wander: 2.2, catchR: 2.7, elevated: false },
  elk: { flee: 20, speed: 6.4, wander: 2.6, catchR: 2.9, elevated: false },
  moose: { flee: 22, speed: 6.8, wander: 3, catchR: 3.1, elevated: false },
}

type Food = { kind: FoodKind; root: THREE.Group; z: number; dir: number; phase: number; wander: number; alarm: number; bob: number }
export type FoodContact = { kind: FoodKind; position: THREE.Vector3 }

/** Huntable wildlife and forage that spawn around the bear and scatter when it gets close. */
export class FoodField {
  readonly group = new THREE.Group()
  private items: Food[] = []
  private time = 0
  private readonly geoms: Record<string, THREE.BufferGeometry> = {}
  private readonly mats: Record<string, THREE.Material> = {}

  constructor() {
    this.geoms.sphere = new THREE.SphereGeometry(1, 14, 10)
    this.geoms.box = new THREE.BoxGeometry(1, 1, 1)
    this.geoms.cone = new THREE.ConeGeometry(1, 1, 6)
    this.geoms.cyl = new THREE.CylinderGeometry(1, 1, 1, 8)
    this.geoms.dodeca = new THREE.DodecahedronGeometry(1, 0)
    const m = (name: string, color: string, roughness = 0.85, metalness = 0) => {
      this.mats[name] = new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true })
      return this.mats[name]
    }
    m('salmon', '#ef7d49', 0.55)
    m('salmonFin', '#f4b46d', 0.7)
    m('eye', '#171210', 0.3)
    m('honey', '#e2a52c', 0.6)
    m('honeyWax', '#8a5a1f', 0.8)
    m('bark', '#4a3527', 1)
    m('fawn', '#a9773f', 0.9)
    m('fawnSpot', '#efe4d0', 0.85)
    m('deer', '#8a5a30', 0.9)
    m('elk', '#b08a56', 0.9)
    m('moose', '#3f2c1f', 0.95)
    m('antler', '#cdbd93', 0.8)
    m('hoof', '#2a2018', 0.7)
  }

  reset(): void {
    for (const item of this.items) this.group.remove(item.root)
    this.items = []
    this.time = 0
  }

  get count(): number { return this.items.length }

  /** Drop wildlife that has wandered or been left far behind the bear. */
  cull(center: THREE.Vector3, radius: number): void {
    const keep: Food[] = []
    for (const item of this.items) {
      if (item.root.position.distanceTo(center) > radius) this.group.remove(item.root)
      else keep.push(item)
    }
    this.items = keep
  }

  spawn(kind: FoodKind, terrain: Terrain, around: THREE.Vector3, rng: () => number, distance = 60): boolean {
    const stats = STATS[kind]
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = rng() * Math.PI * 2
      const radius = distance * (0.55 + rng() * 0.6)
      let x = around.x + Math.cos(angle) * radius
      let z = around.z + Math.sin(angle) * radius
      if (stats.elevated) {
        z = around.z + (rng() - 0.5) * 90
        x = terrain.riverX(z) + (rng() - 0.5) * 7
      }
      if (!this.valid(stats, terrain, x, z)) continue
      const root = this.make(kind)
      const lift = stats.elevated ? terrain.waterY(z) : terrain.height(x, z)
      root.position.set(x, lift, z)
      this.group.add(root)
      this.items.push({ kind, root, z, dir: rng() * Math.PI * 2, phase: rng() * Math.PI * 2, wander: rng() * 2, alarm: 0, bob: 0 })
      return true
    }
    return false
  }

  step(dt: number, bear: THREE.Vector3, terrain: Terrain): void {
    this.time += dt
    for (const item of this.items) {
      const stats = STATS[item.kind]
      if (item.kind === 'salmon') {
        item.bob += dt
        const p = item.root.position
        p.y = terrain.waterY(item.z) + 0.15 + Math.abs(Math.sin(item.bob * 2.2 + item.phase)) * 0.55
        item.root.rotation.z = Math.sin(item.bob * 8 + item.phase) * 0.25
        item.root.rotation.y = Math.PI / 2
        continue
      }
      if (item.kind === 'honey') {
        item.root.rotation.y += dt * 0.05
        continue
      }
      const p = item.root.position
      const dx = p.x - bear.x
      const dz = p.z - bear.z
      const dist = Math.hypot(dx, dz)
      const fleeing = dist < stats.flee
      item.alarm = THREE.MathUtils.damp(item.alarm, fleeing ? 1 : 0, 4, dt)
      item.wander -= dt
      if (fleeing) {
        item.dir = Math.atan2(dx, dz)
      } else if (item.wander <= 0) {
        item.dir += (Math.random() - 0.5) * 2.4
        item.wander = stats.wander * (0.5 + Math.random())
      }
      const speed = fleeing ? stats.speed : stats.speed * 0.22
      const nx = p.x + Math.sin(item.dir) * speed * dt
      const nz = p.z + Math.cos(item.dir) * speed * dt
      if (this.valid(stats, terrain, nx, nz)) {
        p.x = nx
        p.z = nz
      } else {
        item.dir += Math.PI * (0.5 + Math.random() * 0.5)
      }
      p.y = terrain.height(p.x, p.z)
      item.root.rotation.y = item.dir
      const stride = this.time * (6 + speed) + item.phase
      const legs = item.root.userData.legs as THREE.Object3D[] | undefined
      if (legs) legs.forEach((leg, i) => { leg.rotation.x = Math.sin(stride + (i % 2) * Math.PI) * 0.5 * (speed > 0.6 ? 1 : 0.25) })
      void item.z
    }
  }

  /** Nearest reachable food within its catch radius. */
  collect(bear: THREE.Vector3): FoodContact | null {
    let best: Food | null = null
    let bestDist = Infinity
    for (const item of this.items) {
      const stats = STATS[item.kind]
      const d = item.root.position.distanceTo(bear)
      if (d < stats.catchR && d < bestDist) { best = item; bestDist = d }
    }
    if (!best) return null
    const position = best.root.position.clone()
    const kind = best.kind
    this.group.remove(best.root)
    this.items = this.items.filter(i => i !== best)
    return { kind, position }
  }

  private valid(stats: Stats, terrain: Terrain, x: number, z: number): boolean {
    if (Math.hypot(x, z) > terrain.half - 40) return false
    if (stats.elevated) return Math.abs(x - terrain.riverX(z)) < 5
    if (terrain.isWater(x, z)) return false
    if (terrain.trenchDepth(x, z) > 0.8) return false
    if (terrain.slope(x, z) > 1.15) return false
    return terrain.height(x, z) > terrain.waterY(z) + 0.6
  }

  private make(kind: FoodKind): THREE.Group {
    switch (kind) {
      case 'salmon': return this.makeSalmon()
      case 'honey': return this.makeHoney()
      case 'fawn': return this.makeAnimal('fawn', 0.62, 0.34, true)
      case 'deer': return this.makeAnimal('deer', 0.82, 0.42, true)
      case 'elk': return this.makeAnimal('elk', 0.92, 0.46, true)
      case 'moose': return this.makeAnimal('moose', 1.0, 0.58, true)
    }
  }

  private mesh(geo: string, mat: string, pos: [number, number, number], scale: [number, number, number], parent: THREE.Object3D): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geoms[geo], this.mats[mat])
    mesh.position.set(...pos)
    mesh.scale.set(...scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  private makeSalmon(): THREE.Group {
    const root = new THREE.Group()
    this.mesh('sphere', 'salmon', [0, 0.22, 0], [0.32, 0.24, 0.82], root)
    const tail = this.mesh('cone', 'salmonFin', [0, 0.22, -0.86], [0.3, 0.5, 0.3], root)
    tail.rotation.x = -Math.PI / 2
    const dorsal = this.mesh('cone', 'salmonFin', [0, 0.46, 0.04], [0.14, 0.3, 0.14], root)
    dorsal.rotation.z = Math.PI
    this.mesh('sphere', 'eye', [0.2, 0.28, 0.5], [0.05, 0.05, 0.04], root)
    return root
  }

  private makeHoney(): THREE.Group {
    const root = new THREE.Group()
    const log = this.mesh('cyl', 'bark', [0, 0.22, 0], [0.5, 0.44, 0.5], root)
    log.rotation.z = Math.PI / 2
    const hive = this.mesh('dodeca', 'honey', [0, 0.62, 0.05], [0.42, 0.5, 0.42], root)
    hive.scale.set(0.42, 0.55, 0.42)
    this.mesh('box', 'honeyWax', [0, 0.92, 0.05], [0.28, 0.1, 0.28], root)
    return root
  }

  private makeAnimal(kind: 'fawn' | 'deer' | 'elk' | 'moose', bodyH: number, legLen: number, antlers: boolean): THREE.Group {
    const root = new THREE.Group()
    const scale = kind === 'moose' ? 1.25 : kind === 'elk' ? 1.12 : kind === 'deer' ? 1 : 0.8
    const body = this.mesh('sphere', kind, [0, bodyH, 0], [0.42 * scale, 0.38 * scale, 0.95 * scale], root)
    void body
    this.mesh('sphere', kind, [0, bodyH + 0.3 * scale, -0.7 * scale], [0.26 * scale, 0.28 * scale, 0.36 * scale], root)
    this.mesh('cone', kind, [0, bodyH + 0.32 * scale, -1.0 * scale], [0.14 * scale, 0.22 * scale, 0.14 * scale], root)
    if (antlers) this.addAntlers(root, kind, bodyH + 0.5 * scale, -0.7 * scale, scale)
    if (kind === 'fawn') {
      for (let i = 0; i < 6; i += 1) {
        this.mesh('sphere', 'fawnSpot', [(Math.random() - 0.5) * 0.5, bodyH + (Math.random() - 0.3) * 0.3, (Math.random() - 0.5) * 1.1], [0.06, 0.06, 0.06], root)
      }
    }
    const legs: THREE.Object3D[] = []
    for (const [x, z] of [[-0.28, -0.5], [0.28, -0.5], [-0.28, 0.55], [0.28, 0.55]] as Array<[number, number]>) {
      const pivot = new THREE.Group()
      pivot.position.set(x * scale, bodyH - 0.15 * scale, z * scale)
      const leg = new THREE.Mesh(this.geoms.cyl, this.mats[kind])
      leg.scale.set(0.075 * scale, legLen, 0.075 * scale)
      leg.position.y = -legLen / 2
      leg.castShadow = true
      pivot.add(leg)
      this.mesh('box', 'hoof', [0, -legLen, 0], [0.12 * scale, 0.08, 0.16 * scale], pivot)
      root.add(pivot)
      legs.push(pivot)
    }
    root.userData.legs = legs
    return root
  }

  private addAntlers(root: THREE.Group, kind: FoodKind, y: number, z: number, scale: number): void {
    const spread = kind === 'moose' ? 0.55 : 0.35
    const branches = kind === 'moose' ? 4 : 3
    for (const side of [-1, 1]) {
      const base = new THREE.Group()
      base.position.set(side * 0.2 * scale, y, z)
      base.rotation.z = side * (kind === 'moose' ? 1.15 : 0.7)
      base.rotation.x = -0.2
      root.add(base)
      for (let i = 0; i < branches; i += 1) {
        const tine = new THREE.Mesh(this.geoms.cyl, this.mats.antler)
        tine.scale.set(0.045 * scale, spread, 0.045 * scale)
        tine.position.y = (i + 1) * spread * 0.42
        tine.rotation.z = side * (i - branches / 2) * 0.28
        tine.castShadow = true
        base.add(tine)
      }
    }
  }
}
