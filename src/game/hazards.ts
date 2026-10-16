import * as THREE from 'three'
import { createBearTrap, createPoison } from './models'
import type { Terrain } from './terrain'

export type HazardKind = 'poison' | 'trap'
export type HazardContact = { kind: HazardKind; position: THREE.Vector3 }
type Hazard = { kind: HazardKind; root: THREE.Group; phase: number; used: boolean }

/** The only discrete threats: toxic forage and a steel bear trap. Trench danger is terrain. */
export class HazardField {
  readonly group = new THREE.Group()
  private hazards: Hazard[] = []
  private sequence = 0

  get count(): number { return this.hazards.length }

  spawn(kind: HazardKind, point: THREE.Vector3, terrain: Terrain): boolean {
    if (!terrain.isSafeSurface(point.x, point.z)) return false
    const root = kind === 'poison' ? createPoison() : createBearTrap()
    root.position.set(point.x, terrain.heightAt(point.x, point.z), point.z)
    this.group.add(root)
    this.hazards.push({ kind, root, phase: this.sequence++ * 1.77, used: false })
    return true
  }

  collisions(bear: THREE.Vector3): HazardContact[] {
    const contacts: HazardContact[] = []
    const keep: Hazard[] = []
    for (const hazard of this.hazards) {
      const dx = hazard.root.position.x - bear.x
      const dz = hazard.root.position.z - bear.z
      const radius = hazard.kind === 'trap' ? 1.48 : 1.68
      if (!hazard.used && dx * dx + dz * dz < radius * radius && Math.abs(hazard.root.position.y - bear.y) < 2.6) {
        hazard.used = true
        contacts.push({ kind: hazard.kind, position: hazard.root.position.clone() })
        this.group.remove(hazard.root)
      } else {
        keep.push(hazard)
      }
    }
    this.hazards = keep
    return contacts.slice(0, 1)
  }

  step(dt: number, terrain: Terrain, bear?: THREE.Vector3): void {
    const keep: Hazard[] = []
    for (const hazard of this.hazards) {
      if (bear && Math.hypot(hazard.root.position.x - bear.x, hazard.root.position.z - bear.z) > 260) {
        this.group.remove(hazard.root)
        continue
      }
      hazard.phase += dt
      if (hazard.kind === 'poison') {
        hazard.root.rotation.y = Math.sin(hazard.phase * 0.6) * 0.045
        hazard.root.position.y = terrain.heightAt(hazard.root.position.x, hazard.root.position.z) + Math.sin(hazard.phase * 1.8) * 0.035
      }
      keep.push(hazard)
    }
    this.hazards = keep
  }

  reset(): void {
    for (const hazard of this.hazards) this.group.remove(hazard.root)
    this.hazards = []
  }
}
