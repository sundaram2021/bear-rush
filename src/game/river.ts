import * as THREE from 'three'
import { CONFIG } from './config'
import { seededRandom } from './noise'
import type { Terrain } from './terrain'

export type DriftwoodContact = { id: number; position: THREE.Vector3 }
export type RiverMarker = { id: number; x: number; z: number }
type DriftLog = { id: number; root: THREE.Group; previous: THREE.Vector3; speed: number; phase: number }

const logBark = new THREE.MeshStandardMaterial({ color: '#725840', roughness: 0.97 })
const endGrain = new THREE.MeshStandardMaterial({ color: '#ae8a62', roughness: 0.96 })
const logGeometry = new THREE.CylinderGeometry(0.48, 0.58, 6.05, 14, 1)
const endGeometry = new THREE.CylinderGeometry(0.46, 0.46, 0.045, 14, 1)
const knotGeometry = new THREE.SphereGeometry(0.15, 10, 8)

/** A bounded log pool follows the infinite river; logs move with the modeled downstream current. */
export class RiverHazardField {
  readonly group = new THREE.Group()
  private readonly logs: DriftLog[] = []
  private random = seededRandom(34191)
  private nextId = 1

  constructor() {
    for (let i = 0; i < CONFIG.river.logCount; i += 1) {
      const root = new THREE.Group()
      const body = new THREE.Mesh(logGeometry, logBark)
      body.rotation.z = Math.PI / 2
      body.castShadow = true
      body.receiveShadow = true
      root.add(body)
      for (const side of [-1, 1]) {
        const end = new THREE.Mesh(endGeometry, endGrain)
        end.rotation.z = Math.PI / 2
        end.position.x = side * 2.91
        end.castShadow = true
        root.add(end)
      }
      const knot = new THREE.Mesh(knotGeometry, endGrain)
      knot.position.set(-0.7, 0.38, 0)
      knot.scale.set(1.35, 0.45, 0.6)
      root.add(knot)
      this.group.add(root)
      this.logs.push({ id: this.nextId++, root, previous: new THREE.Vector3(), speed: 2, phase: this.random() * Math.PI * 2 })
    }
  }

  get count(): number { return this.logs.length }

  reset(bear: THREE.Vector3, terrain: Terrain): void {
    this.random = seededRandom(34191)
    this.logs.forEach((log, index) => {
      log.speed = CONFIG.river.logSpeedMin + this.random() * (CONFIG.river.logSpeedMax - CONFIG.river.logSpeedMin)
      log.phase = this.random() * Math.PI * 2
      const spacing = (CONFIG.river.maxLogDistance - CONFIG.river.minLogDistance) / Math.max(1, this.logs.length)
      const z = bear.z + CONFIG.river.minLogDistance + index * spacing + this.random() * 8
      this.place(log, z, terrain)
      log.previous.copy(log.root.position)
    })
  }

  step(dt: number, bear: THREE.Vector3, terrain: Terrain): void {
    for (const log of this.logs) {
      log.previous.copy(log.root.position)
      log.phase += dt
      let z = log.root.position.z + log.speed * dt
      if (z < bear.z - 42 || z > bear.z + CONFIG.river.maxLogDistance + 22) {
        z = bear.z + CONFIG.river.minLogDistance + this.random() * 52
      }
      this.place(log, z, terrain)
      const body = log.root.children[0]
      if (body) body.rotation.x = Math.sin(log.phase * 0.8) * 0.025
    }
  }

  /** Sample the shared bear/log motion segment so a fast crossing cannot skip a floating log. */
  collisions(start: THREE.Vector3, end: THREE.Vector3, terrain: Terrain): DriftwoodContact | null {
    const playerDistance = start.distanceTo(end)
    const samples = Math.max(2, Math.ceil(playerDistance / 0.4))
    let best: DriftwoodContact | null = null
    let bestDistanceSq = Infinity
    for (const log of this.logs) {
      for (let step = 0; step <= samples; step += 1) {
        const t = step / samples
        const bearX = THREE.MathUtils.lerp(start.x, end.x, t)
        const bearZ = THREE.MathUtils.lerp(start.z, end.z, t)
        if (!terrain.isInRiver(bearX, bearZ)) continue
        const logX = THREE.MathUtils.lerp(log.previous.x, log.root.position.x, t)
        const logZ = THREE.MathUtils.lerp(log.previous.z, log.root.position.z, t)
        const relativeX = bearX - logX
        const relativeZ = bearZ - logZ
        const slope = (terrain.riverX(logZ + 1) - terrain.riverX(logZ - 1)) * 0.5
        const axisLength = Math.hypot(1, slope)
        const axisX = 1 / axisLength
        const axisZ = -slope / axisLength
        const along = THREE.MathUtils.clamp(relativeX * axisX + relativeZ * axisZ, -2.88, 2.88)
        const dx = relativeX - axisX * along
        const dz = relativeZ - axisZ * along
        const distanceSq = dx * dx + dz * dz
        if (distanceSq < CONFIG.river.logHitRadius ** 2 && distanceSq < bestDistanceSq) {
          bestDistanceSq = distanceSq
          best = { id: log.id, position: new THREE.Vector3(logX, terrain.waterY(logZ) + 0.36, logZ) }
        }
      }
    }
    return best
  }

  /** Push struck wood farther downstream to make a hit visibly resolve instead of sticking. */
  deflect(id: number, terrain: Terrain): void {
    const log = this.logs.find(entry => entry.id === id)
    if (!log) return
    this.place(log, log.root.position.z + 8, terrain)
    log.previous.copy(log.root.position)
  }

  markers(): RiverMarker[] {
    return this.logs.map(log => ({ id: log.id, x: log.root.position.x, z: log.root.position.z }))
  }

  private place(log: DriftLog, z: number, terrain: Terrain): void {
    const x = terrain.riverX(z)
    log.root.position.set(x, terrain.waterY(z) + 0.34, z)
    const riverSlope = (terrain.riverX(z + 1) - terrain.riverX(z - 1)) * 0.5
    log.root.rotation.set(0, Math.atan(riverSlope), Math.sin(log.phase) * 0.018)
  }
}
