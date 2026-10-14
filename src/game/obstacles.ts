import * as THREE from 'three'

type Hazard = { root: THREE.Group; x: number }

/** Fallen tree/log blockers. Each pattern leaves at least one of the three lanes open. */
export class Obstacles {
  readonly group = new THREE.Group()
  private hazards: Hazard[] = []
  private readonly bark = new THREE.MeshStandardMaterial({ color: '#67422e', roughness: 0.96, flatShading: true })
  private readonly cut = new THREE.MeshStandardMaterial({ color: '#bb8558', roughness: 0.94, flatShading: true })
  private readonly logGeo = new THREE.CylinderGeometry(0.38, 0.46, 2.5, 9)
  private readonly knotGeo = new THREE.SphereGeometry(0.19, 8, 6)

  spawn(lanes: number[], z: number): void {
    for (const lane of lanes.slice(0, 2)) {
      const x = (lane - 1) * 3
      const root = new THREE.Group()
      const log = new THREE.Mesh(this.logGeo, this.bark)
      log.rotation.z = Math.PI / 2
      log.position.y = 0.38
      log.castShadow = true
      root.add(log)
      for (const side of [-1, 1]) {
        const end = new THREE.Mesh(new THREE.CircleGeometry(0.27, 10), this.cut)
        end.position.set(side * 1.24, 0.38, 0)
        end.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2
        root.add(end)
      }
      const knot = new THREE.Mesh(this.knotGeo, this.bark)
      knot.position.set(0.38, 0.67, 0)
      root.add(knot)
      root.position.set(x, 0, z)
      this.group.add(root)
      this.hazards.push({ root, x })
    }
  }

  step(dt: number, speed: number): void {
    const keep: Hazard[] = []
    for (const h of this.hazards) {
      h.root.position.z += speed * dt
      h.root.rotation.z = Math.sin(h.root.position.z * 0.08) * 0.025
      if (h.root.position.z < 12) keep.push(h)
      else this.group.remove(h.root)
    }
    this.hazards = keep
  }

  collides(playerX: number, playerZ = 0): boolean {
    return this.hazards.some(h => Math.abs(h.x - playerX) < 1.3 && Math.abs(h.root.position.z - playerZ) < 1.15)
  }

  reset(): void {
    for (const h of this.hazards) this.group.remove(h.root)
    this.hazards = []
  }
}
