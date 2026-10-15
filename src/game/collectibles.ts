import * as THREE from 'three'
import { CONFIG } from './config'
import type { World } from './world'

type Salmon = { root: THREE.Group; z: number; offset: number; pace: number; phase: number; leap: number }

/** Salmon swim along the sampled river and leap into an explicit, short player catch window. */
export class Collectibles {
  readonly group = new THREE.Group()
  private fish: Salmon[] = []
  private time = 0
  private readonly bodyGeo = new THREE.SphereGeometry(0.55, 16, 12)
  private readonly bodyMat = new THREE.MeshStandardMaterial({ color: '#ef7d49', roughness: 0.52, metalness: 0.06, flatShading: true })
  private readonly finMat = new THREE.MeshStandardMaterial({ color: '#f4b46d', roughness: 0.72, flatShading: true })
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: '#241d18' })

  spawn(z: number, offset = 3.35, pace = 1): void {
    const root = new THREE.Group()
    const body = new THREE.Mesh(this.bodyGeo, this.bodyMat)
    body.scale.set(0.42, 0.28, 1)
    body.castShadow = true
    root.add(body)
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.58, 4), this.finMat)
    tail.rotation.x = -Math.PI / 2
    tail.position.z = -0.64
    tail.scale.set(0.78, 1, 0.8)
    root.add(tail)
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.33, 4), this.finMat)
    dorsal.rotation.z = Math.PI
    dorsal.position.set(0, 0.25, 0.08)
    root.add(dorsal)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), this.eyeMat)
    eye.position.set(0.16, 0.06, 0.32)
    root.add(eye)
    root.position.set(0, 0, z)
    this.group.add(root)
    this.fish.push({ root, z, offset, pace, phase: Math.random() * Math.PI * 2, leap: 0 })
  }

  reset(): void {
    for (const f of this.fish) this.group.remove(f.root)
    this.fish = []
    this.time = 0
  }

  step(dt: number, current: number, world: World, bearZ: number): void {
    this.time += dt
    const keep: Salmon[] = []
    for (const f of this.fish) {
      f.z += current * f.pace * dt
      const distance = Math.abs(f.z - bearZ)
      f.leap = distance < 4.2 ? Math.sin(Math.max(0, 1 - distance / 4.2) * Math.PI * 0.5) : 0
      const p = world.riverPoint(f.z, f.offset, 0.18 + f.leap * 1.28 + Math.sin(this.time * 5 + f.phase) * 0.035)
      f.root.position.copy(p)
      const tangent = world.riverTangent(f.z)
      f.root.rotation.set(-f.leap * 0.55 - Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z)), Math.atan2(tangent.x, tangent.z), Math.sin(this.time * 4.2 + f.phase) * 0.12)
      f.root.children[1].rotation.x = -Math.PI / 2 + Math.sin(this.time * 12 + f.phase) * 0.38
      if (f.z < bearZ + 11) keep.push(f)
      else this.group.remove(f.root)
    }
    this.fish = keep
  }

  isCatchReady(bear: THREE.Vector3): boolean {
    return this.fish.some(f => this.inReach(f, bear))
  }

  catchNearest(bear: THREE.Vector3): THREE.Vector3 | null {
    const candidates = this.fish.filter(f => this.inReach(f, bear)).sort((a, b) => a.root.position.distanceToSquared(bear) - b.root.position.distanceToSquared(bear))
    const target = candidates[0]
    if (!target) return null
    this.fish = this.fish.filter(f => f !== target)
    const position = target.root.position.clone()
    this.group.remove(target.root)
    return position
  }

  private inReach(f: Salmon, bear: THREE.Vector3): boolean {
    return f.leap > 0.55
      && Math.abs(f.root.position.z - bear.z) <= CONFIG.player.catchRangeZ
      && Math.abs(f.root.position.x - bear.x) <= CONFIG.player.catchRangeX
  }
}
