import * as THREE from 'three'
import { CONFIG, FOOD_KINDS, type FoodKind } from './config'
import { seededRandom } from './noise'
import { createHoney, createPrey, createSalmon, type AnimalRig } from './models'
import type { Terrain } from './terrain'

export type FoodContact = { kind: FoodKind; position: THREE.Vector3 }
type FoodActor = {
  kind: FoodKind
  root: THREE.Group
  rig?: AnimalRig
  velocity: THREE.Vector3
  phase: number
  swimZ: number
  age: number
}

/** Score food in the world; larger wildlife flee, salmon follow the stream, honey remains forage. */
export class FoodField {
  readonly group = new THREE.Group()
  private actors: FoodActor[] = []
  private elapsed = 0
  private readonly random = seededRandom(71027)

  get count(): number { return this.actors.length }
  get kinds(): FoodKind[] { return this.actors.map(actor => actor.kind) }

  spawn(kind: FoodKind, point: THREE.Vector3, terrain: Terrain): void {
    const rig = kind === 'fawn' || kind === 'deer' || kind === 'elk' || kind === 'moose' ? createPrey(kind) : undefined
    const root = rig?.root ?? (kind === 'salmon' ? createSalmon() : createHoney())
    root.position.copy(point)
    if (kind !== 'salmon') root.position.y = terrain.heightAt(point.x, point.z)
    if (kind === 'salmon') root.rotation.y = Math.PI
    this.group.add(root)
    const actor: FoodActor = {
      kind, root, rig, velocity: new THREE.Vector3(), phase: this.random() * Math.PI * 2,
      swimZ: point.z, age: 0,
    }
    this.actors.push(actor)
  }

  spawnInitial(bear: THREE.Vector3, terrain: Terrain): void {
    this.reset()
    for (const kind of FOOD_KINDS) this.spawnAround(kind, bear, terrain)
    for (let i = 0; i < 3; i += 1) this.spawnAround(this.randomLandFood(), bear, terrain)
  }

  spawnAround(kind: FoodKind, bear: THREE.Vector3, terrain: Terrain): boolean {
    for (let attempt = 0; attempt < 28; attempt += 1) {
      const angle = this.random() * Math.PI * 2
      const radius = 17 + this.random() * CONFIG.run.spawnRadius
      let x = bear.x + Math.cos(angle) * radius
      let z = bear.z + Math.sin(angle) * radius
      x = THREE.MathUtils.clamp(x, -terrain.halfSize + 12, terrain.halfSize - 12)
      z = THREE.MathUtils.clamp(z, -terrain.halfSize + 12, terrain.halfSize - 12)
      if (kind === 'salmon') {
        x = terrain.riverX(z)
        const point = new THREE.Vector3(x, terrain.waterY(z) + 0.18, z)
        this.spawn(kind, point, terrain)
        return true
      }
      if (terrain.isSafeSurface(x, z) && Math.abs(x - terrain.riverX(z)) > 6) {
        this.spawn(kind, new THREE.Vector3(x, terrain.heightAt(x, z), z), terrain)
        return true
      }
    }
    return false
  }

  step(dt: number, bear: THREE.Vector3, terrain: Terrain): void {
    this.elapsed += dt
    for (const actor of this.actors) {
      actor.age += dt
      actor.phase += dt
      if (actor.kind === 'salmon') {
        actor.swimZ += dt * (1.2 + Math.sin(actor.phase * 0.17) * 0.25)
        if (actor.swimZ > terrain.halfSize - 8) actor.swimZ = -terrain.halfSize + 9
        const z = actor.swimZ
        const x = terrain.riverX(z) + Math.sin(actor.phase * 0.38) * 0.55
        const near = Math.hypot(x - bear.x, z - bear.z)
        const leap = near < 9 ? Math.max(0, 1 - near / 9) * Math.abs(Math.sin(actor.phase * 2.4)) : 0
        actor.root.position.set(x, terrain.waterY(z) + 0.14 + leap * 0.7, z)
        actor.root.rotation.y = Math.PI + Math.sin(actor.phase * 0.45) * 0.16
        actor.root.rotation.x = leap * 0.42
        const tail = actor.root.children[2]
        if (tail) tail.rotation.x = Math.sin(actor.phase * 10) * 0.25
        continue
      }
      if (actor.kind === 'honey') {
        actor.root.rotation.y = Math.sin(actor.phase * 0.26) * 0.09
        actor.root.position.y = terrain.heightAt(actor.root.position.x, actor.root.position.z) + Math.sin(actor.phase * 2.2) * 0.035
        continue
      }
      const distanceX = bear.x - actor.root.position.x
      const distanceZ = bear.z - actor.root.position.z
      const distance = Math.hypot(distanceX, distanceZ)
      const flee = distance < 23 && distance > 0.01
      if (flee) {
        const speed = actor.kind === 'fawn' ? 3.2 : actor.kind === 'moose' ? 2.65 : actor.kind === 'elk' ? 3.05 : 2.8
        const targetX = -distanceX / distance * speed
        const targetZ = -distanceZ / distance * speed
        actor.velocity.x = THREE.MathUtils.damp(actor.velocity.x, targetX, 3.4, dt)
        actor.velocity.z = THREE.MathUtils.damp(actor.velocity.z, targetZ, 3.4, dt)
      } else {
        actor.velocity.x = THREE.MathUtils.damp(actor.velocity.x, Math.sin(actor.phase * 0.34) * 0.38, 0.8, dt)
        actor.velocity.z = THREE.MathUtils.damp(actor.velocity.z, Math.cos(actor.phase * 0.24) * 0.3, 0.8, dt)
      }
      const nextX = actor.root.position.x + actor.velocity.x * dt
      const nextZ = actor.root.position.z + actor.velocity.z * dt
      if (terrain.isSafeSurface(nextX, nextZ)) {
        actor.root.position.x = nextX
        actor.root.position.z = nextZ
      } else {
        actor.velocity.multiplyScalar(-0.55)
      }
      actor.root.position.y = terrain.heightAt(actor.root.position.x, actor.root.position.z)
      if (actor.velocity.lengthSq() > 0.06) actor.root.rotation.y = Math.atan2(-actor.velocity.x, -actor.velocity.z)
      if (actor.rig) {
        const stride = Math.min(1, actor.velocity.length() / 3)
        actor.rig.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(actor.phase * 9 + (i % 2) * Math.PI) * stride * 0.45 })
        actor.rig.head.rotation.x = flee ? Math.sin(actor.phase * 2.6) * 0.035 : 0
        actor.rig.body.position.y = Math.abs(Math.sin(actor.phase * 7)) * stride * 0.025
      }
    }
  }

  collectNearby(bear: THREE.Vector3, pouncing: boolean): FoodContact | null {
    const range = pouncing ? 4.5 : 2.15
    let nearest = -1
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < this.actors.length; i += 1) {
      const actor = this.actors[i]
      const dx = actor.root.position.x - bear.x
      const dz = actor.root.position.z - bear.z
      const dy = actor.root.position.y - (bear.y + 0.6)
      const distance = dx * dx + dz * dz + dy * dy * 0.12
      if (distance < range * range && distance < best) { nearest = i; best = distance }
    }
    if (nearest < 0) return null
    const actor = this.actors[nearest]
    const contact = { kind: actor.kind, position: actor.root.position.clone() }
    this.group.remove(actor.root)
    this.actors.splice(nearest, 1)
    return contact
  }

  reset(): void {
    for (const actor of this.actors) this.group.remove(actor.root)
    this.actors = []
    this.elapsed = 0
  }

  private randomLandFood(): FoodKind {
    const choices: FoodKind[] = ['honey', 'fawn', 'deer', 'elk', 'moose']
    return choices[Math.floor(this.random() * choices.length)]
  }
}
