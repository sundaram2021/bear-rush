import * as THREE from 'three'
import type { Terrain } from './terrain'

export type HazardKind = 'poison' | 'trap'
type Hazard = { kind: HazardKind; root: THREE.Group; phase: number; armed: boolean }
export type HazardContact = { kind: HazardKind; position: THREE.Vector3 }

const REACH: Record<HazardKind, number> = { poison: 1.9, trap: 1.7 }

/** Ground dangers the bear must avoid: toxic forage and steel leg-hold traps. */
export class HazardField {
  readonly group = new THREE.Group()
  private items: Hazard[] = []
  private time = 0
  private readonly geoms: Record<string, THREE.BufferGeometry> = {}
  private readonly mats: Record<string, THREE.Material> = {}

  constructor() {
    this.geoms.sphere = new THREE.SphereGeometry(1, 12, 9)
    this.geoms.cyl = new THREE.CylinderGeometry(1, 1, 1, 8)
    this.geoms.cone = new THREE.ConeGeometry(1, 1, 5)
    this.geoms.torus = new THREE.TorusGeometry(1, 0.16, 6, 14, Math.PI)
    this.mats.poisonCap = new THREE.MeshStandardMaterial({ color: '#b0416f', emissive: '#5a1030', emissiveIntensity: 0.9, roughness: 0.7, flatShading: true })
    this.mats.poisonStem = new THREE.MeshStandardMaterial({ color: '#e8e0cc', roughness: 0.85, flatShading: true })
    this.mats.poisonSpots = new THREE.MeshStandardMaterial({ color: '#f3e7ff', emissive: '#6b2a8a', emissiveIntensity: 0.6, roughness: 0.6, flatShading: true })
    this.mats.trapMetal = new THREE.MeshStandardMaterial({ color: '#8a5a3c', roughness: 0.55, metalness: 0.75, flatShading: true })
    this.mats.trapTeeth = new THREE.MeshStandardMaterial({ color: '#c9c3b4', roughness: 0.4, metalness: 0.85, flatShading: true })
    this.mats.trapBase = new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 0.9, flatShading: true })
  }

  reset(): void {
    for (const item of this.items) this.group.remove(item.root)
    this.items = []
  }

  cull(center: THREE.Vector3, radius: number): void {
    const keep: Hazard[] = []
    for (const item of this.items) {
      if (item.root.position.distanceTo(center) > radius) this.group.remove(item.root)
      else keep.push(item)
    }
    this.items = keep
  }

  spawn(kind: HazardKind, terrain: Terrain, around: THREE.Vector3, rng: () => number, distance = 55): boolean {
    for (let attempt = 0; attempt < 26; attempt += 1) {
      const angle = rng() * Math.PI * 2
      const radius = distance * (0.45 + rng() * 0.75)
      const x = around.x + Math.cos(angle) * radius
      const z = around.z + Math.sin(angle) * radius
      if (Math.hypot(x, z) > terrain.half - 40) continue
      if (terrain.isWater(x, z) || terrain.trenchDepth(x, z) > 0.6 || terrain.slope(x, z) > 1) continue
      const root = kind === 'poison' ? this.makePoison() : this.makeTrap()
      root.position.set(x, terrain.height(x, z), z)
      this.group.add(root)
      this.items.push({ kind, root, phase: rng() * Math.PI * 2, armed: true })
      return true
    }
    return false
  }

  step(dt: number, _terrain: Terrain): void {
    this.time += dt
    for (const item of this.items) {
      if (item.kind === 'poison') item.root.rotation.y += dt * 0.15
      else item.root.rotation.y = Math.sin(this.time * 0.4 + item.phase) * 0.05
    }
  }

  /** First-contact report; the item is consumed so it can never hit twice. */
  contact(bear: THREE.Vector3): HazardContact | null {
    let best: Hazard | null = null
    let bestDist = Infinity
    for (const item of this.items) {
      if (!item.armed) continue
      const d = item.root.position.distanceTo(bear)
      if (d < REACH[item.kind] && d < bestDist) { best = item; bestDist = d }
    }
    if (!best) return null
    best.armed = false
    const kind = best.kind
    const position = best.root.position.clone()
    this.group.remove(best.root)
    this.items = this.items.filter(i => i !== best)
    return { kind, position }
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

  private makePoison(): THREE.Group {
    const root = new THREE.Group()
    const count = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + Math.random()
      const r = 0.15 + Math.random() * 0.5
      const h = 0.3 + Math.random() * 0.45
      this.mesh('cyl', 'poisonStem', [Math.cos(a) * r, h / 2, Math.sin(a) * r], [0.06, h, 0.06], root)
      this.mesh('sphere', 'poisonCap', [Math.cos(a) * r, h, Math.sin(a) * r], [0.26, 0.18, 0.26], root)
      this.mesh('sphere', 'poisonSpots', [Math.cos(a) * r, h + 0.12, Math.sin(a) * r], [0.1, 0.06, 0.1], root)
    }
    return root
  }

  private makeTrap(): THREE.Group {
    const root = new THREE.Group()
    this.mesh('cyl', 'trapBase', [0, 0.05, 0], [0.9, 0.08, 0.9], root)
    for (const side of [-1, 1]) {
      const jaw = this.mesh('torus', 'trapMetal', [0, 0.24, side * 0.32], [0.72, 0.62, 0.62], root)
      jaw.rotation.x = side > 0 ? 0.5 : Math.PI - 0.5
      for (let t = 0; t < 5; t += 1) {
        this.mesh('cone', 'trapTeeth', [(t - 2) * 0.28, 0.3, side * 0.52], [0.06, 0.22, 0.06], root)
      }
    }
    this.mesh('cyl', 'trapMetal', [0, 0.12, 0], [0.14, 0.24, 0.14], root)
    return root
  }
}
