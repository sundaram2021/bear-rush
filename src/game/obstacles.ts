import * as THREE from 'three'
import type { World } from './world'

export type HazardKind = 'block' | 'algae'
type Hazard = { root: THREE.Group; kind: HazardKind; z: number; offset: number; phase: number; hit: boolean }
export type HazardContact = { kind: HazardKind; position: THREE.Vector3 }

/** Small wood and dangerous algae float with river bends, current and grade; no large log blocker remains. */
export class Obstacles {
  readonly group = new THREE.Group()
  private hazards: Hazard[] = []
  private readonly wood = new THREE.MeshStandardMaterial({ color: '#745139', roughness: 0.92, flatShading: true })
  private readonly cut = new THREE.MeshStandardMaterial({ color: '#c18c5c', roughness: 0.91, flatShading: true })
  private readonly algaeMats = ['#71a84d', '#91c654', '#446f3c'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.84, flatShading: true, side: THREE.DoubleSide }))
  private readonly blockGeo = new THREE.BoxGeometry(0.58, 0.4, 0.7)
  private readonly knotGeo = new THREE.SphereGeometry(0.09, 7, 6)
  private nextPhase = 0

  spawn(kind: HazardKind, z: number, offset: number): void {
    const root = new THREE.Group()
    if (kind === 'block') this.makeBlock(root)
    else this.makeAlgae(root)
    this.group.add(root)
    this.hazards.push({ root, kind, z, offset, phase: this.nextPhase++ * 1.71, hit: false })
  }

  step(dt: number, current: number, world: World, bearZ: number): void {
    const keep: Hazard[] = []
    for (const h of this.hazards) {
      h.z += current * dt * (h.kind === 'algae' ? 0.86 : 0.94)
      const p = world.riverPoint(h.z, h.offset, h.kind === 'algae' ? 0.16 : 0.21 + Math.sin(h.phase + h.z * 0.6) * 0.05)
      h.root.position.copy(p)
      const tangent = world.riverTangent(h.z)
      h.root.rotation.set(-Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z)), Math.atan2(tangent.x, tangent.z), Math.sin(h.phase + h.z * 0.12) * (h.kind === 'block' ? 0.12 : 0.04))
      if (h.kind === 'algae') h.root.rotation.y += Math.sin(h.phase + h.z * 0.1) * 0.1
      if (h.z < bearZ + 9) keep.push(h)
      else this.group.remove(h.root)
    }
    this.hazards = keep
  }

  /** Remove the item on first touch so a single object can never apply repeated damage. */
  collisions(bear: THREE.Vector3): HazardContact[] {
    const hit: HazardContact[] = []
    const keep: Hazard[] = []
    for (const h of this.hazards) {
      const position = h.root.position
      const reach = h.kind === 'algae' ? 1.35 : 1.05
      const horizontal = Math.hypot(position.x - bear.x, position.z - bear.z)
      const vertical = Math.abs(position.y - (bear.y + 0.32))
      if (!h.hit && horizontal < reach && vertical < 1.0) {
        h.hit = true
        hit.push({ kind: h.kind, position: position.clone() })
        this.group.remove(h.root)
      } else {
        keep.push(h)
      }
    }
    this.hazards = keep
    return hit
  }

  reset(): void {
    for (const h of this.hazards) this.group.remove(h.root)
    this.hazards = []
  }

  private makeBlock(root: THREE.Group): void {
    const block = new THREE.Mesh(this.blockGeo, this.wood)
    block.castShadow = true
    block.rotation.set(0.13, Math.random() * Math.PI, 0.17)
    root.add(block)
    const knot = new THREE.Mesh(this.knotGeo, this.cut)
    knot.position.set(0.12, 0.16, 0.36)
    root.add(knot)
    const splinter = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 4), this.cut)
    splinter.position.set(-0.28, 0.13, -0.1)
    splinter.rotation.z = Math.PI / 2
    root.add(splinter)
  }

  private makeAlgae(root: THREE.Group): void {
    const leaf = new THREE.ConeGeometry(0.15, 0.72, 5, 1)
    for (let i = 0; i < 7; i += 1) {
      const blade = new THREE.Mesh(leaf, this.algaeMats[i % this.algaeMats.length])
      const angle = (i / 7) * Math.PI * 2
      blade.position.set(Math.cos(angle) * 0.28, 0.13 + (i % 3) * 0.03, Math.sin(angle) * 0.27)
      blade.rotation.set(0.16 + (i % 2) * 0.22, angle, Math.cos(angle) * 0.54)
      blade.scale.set(0.8 + (i % 3) * 0.15, 0.78 + (i % 2) * 0.22, 0.75)
      root.add(blade)
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.31, 8, 6), this.algaeMats[1])
    center.position.y = 0.08
    center.scale.y = 0.38
    root.add(center)
  }
}
