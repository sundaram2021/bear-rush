import * as THREE from 'three'
import { CONFIG, type FoodKind } from './config'
import { seededRandom } from './noise'
import { createHoney, createPrey, createSalmon, type AnimalRig } from './models'
import type { Terrain } from './terrain'

export type FoodContact = { kind: FoodKind; position: THREE.Vector3 }
export type WildlifeTrack = { id: number; kind: FoodKind; x: number; z: number; age: number; state: 'fresh' | 'fading'; confidence: number }
type PreyKind = Extract<FoodKind, 'rabbit' | 'coyote' | 'fawn' | 'deer' | 'elk' | 'moose'>
type PreyState = 'roaming' | 'alert' | 'fleeing' | 'exhausted'
type FoodActor = {
  id: number
  kind: FoodKind
  root: THREE.Group
  rig?: AnimalRig
  velocity: THREE.Vector3
  phase: number
  swimZ: number
  age: number
  state: PreyState
  stamina: number
  alertTimer: number
  exhaustedTimer: number
  missedTimer: number
  trackAge: number
  trackRefresh: number
  lastKnown?: THREE.Vector3
}

const isPrey = (kind: FoodKind): kind is PreyKind => kind !== 'salmon' && kind !== 'honey'

/** Sparse wildlife field with aging tracks and distinct, stamina-gated hunt styles. */
export class FoodField {
  readonly group = new THREE.Group()
  private actors: FoodActor[] = []
  private random = seededRandom(71027)
  private nextId = 1
  private missedHunt: FoodKind | null = null
  private alertEvent: FoodKind | null = null

  get count(): number { return this.actors.length }
  get kinds(): FoodKind[] { return this.actors.map(actor => actor.kind) }

  spawn(kind: FoodKind, point: THREE.Vector3, terrain: Terrain): void {
    const rig = isPrey(kind) ? createPrey(kind) : undefined
    const root = rig?.root ?? (kind === 'salmon' ? createSalmon() : createHoney())
    root.position.copy(point)
    if (kind !== 'salmon') root.position.y = terrain.heightAt(point.x, point.z)
    if (kind === 'salmon') root.rotation.y = Math.PI
    this.group.add(root)
    this.actors.push({
      id: this.nextId++, kind, root, rig, velocity: new THREE.Vector3(), phase: this.random() * Math.PI * 2,
      swimZ: point.z, age: 0, state: 'roaming', stamina: 1, alertTimer: 0.5,
      exhaustedTimer: 0, missedTimer: 0, trackAge: Number.POSITIVE_INFINITY, trackRefresh: 0,
    })
  }

  /** Put every food/hunt type on the first local map instead of waiting on a spawn lottery. */
  spawnInitial(bear: THREE.Vector3, terrain: Terrain): void {
    this.reset()
    if (!this.spawnAround('salmon', bear, terrain)) this.spawnFallback('salmon', bear, terrain, 52)
    if (!this.spawnAround('honey', bear, terrain, -Math.PI / 2, 0.82)) this.spawnFallback('honey', bear, terrain, 54)
    const species: PreyKind[] = ['rabbit', 'coyote', 'fawn', 'deer', 'elk', 'moose']
    const center = -Math.PI / 2
    species.forEach((kind, index) => {
      const spread = (index / (species.length - 1) * 2 - 1) * CONFIG.hunt.initialPreyFanHalfAngle
      if (!this.spawnAround(kind, bear, terrain, center + spread, CONFIG.hunt.initialPreyRadiusScale)) {
        this.spawnFallback(kind, bear, terrain, 52 + index * 5, center + spread)
      }
    })
  }

  spawnAround(kind: FoodKind, bear: THREE.Vector3, terrain: Terrain, preferredBearing?: number, radiusScale = 1): boolean {
    if (kind === 'salmon') {
      for (let attempt = 0; attempt < 36; attempt += 1) {
        const z = bear.z + 28 + this.random() * 78
        const x = terrain.riverX(z)
        this.spawn(kind, new THREE.Vector3(x, terrain.waterY(z) + 0.25, z), terrain)
        return true
      }
      return false
    }
    const min = (kind === 'honey' ? CONFIG.hunt.spawnMinRadius * 0.82 : CONFIG.hunt.spawnMinRadius) * radiusScale
    const max = (kind === 'honey' ? CONFIG.hunt.spawnMaxRadius * 0.78 : CONFIG.hunt.spawnMaxRadius) * radiusScale
    for (let attempt = 0; attempt < 96; attempt += 1) {
      const angle = preferredBearing === undefined
        ? this.random() * Math.PI * 2
        : preferredBearing + (this.random() - 0.5) * 0.25
      const radius = min + this.random() * (max - min)
      const x = bear.x + Math.cos(angle) * radius
      const z = bear.z + Math.sin(angle) * radius
      if (!terrain.isSafeSurface(x, z) || Math.abs(x - terrain.riverX(z)) < 8) continue
      this.spawn(kind, new THREE.Vector3(x, terrain.heightAt(x, z), z), terrain)
      return true
    }
    if (preferredBearing !== undefined) {
      for (let attempt = 0; attempt < 96; attempt += 1) {
        const angle = this.random() * Math.PI * 2
        const radius = min + this.random() * (max - min)
        const x = bear.x + Math.cos(angle) * radius
        const z = bear.z + Math.sin(angle) * radius
        if (!terrain.isSafeSurface(x, z) || Math.abs(x - terrain.riverX(z)) < 8) continue
        this.spawn(kind, new THREE.Vector3(x, terrain.heightAt(x, z), z), terrain)
        return true
      }
    }
    return false
  }

  step(dt: number, bear: THREE.Vector3, terrain: Terrain, wind = new THREE.Vector3(0, 0, 1), bearSpeed = 0, stalking = false, bearForward?: THREE.Vector3): void {
    const windDirection = wind.clone().setY(0).normalize()
    const remove: FoodActor[] = []
    for (const actor of this.actors) {
      actor.age += dt
      actor.phase += dt
      actor.trackAge += dt
      actor.missedTimer = Math.max(0, actor.missedTimer - dt)
      actor.trackRefresh -= dt
      const dx = bear.x - actor.root.position.x
      const dz = bear.z - actor.root.position.z
      const distance = Math.hypot(dx, dz)
      if (distance > CONFIG.hunt.trackingRadius * 2.2) {
        remove.push(actor)
        continue
      }

      if (actor.kind === 'salmon') {
        const close = distance < CONFIG.hunt.fishFleeRadius
        const swimRate = close ? CONFIG.hunt.fishEscapeSpeed : -CONFIG.hunt.fishUpstreamSpeed
        actor.swimZ += dt * swimRate
        const z = actor.swimZ
        const x = terrain.riverX(z) + Math.sin(actor.phase * 0.38) * 0.48
        const near = Math.hypot(x - bear.x, z - bear.z)
        const leap = near < 8 ? Math.max(0, 1 - near / 8) * Math.abs(Math.sin(actor.phase * 2.4)) : 0
        actor.root.position.set(x, terrain.waterY(z) + 0.23 + leap * 0.58, z)
        actor.root.rotation.y = close ? 0 : Math.PI
        actor.root.rotation.x = leap * 0.4
        const tail = actor.root.children[2]
        if (tail) tail.rotation.x = Math.sin(actor.phase * 10) * 0.25
        this.updateTrack(actor, distance)
        continue
      }
      if (actor.kind === 'honey') {
        actor.root.rotation.y = Math.sin(actor.phase * 0.26) * 0.09
        actor.root.position.y = terrain.heightAt(actor.root.position.x, actor.root.position.z) + Math.sin(actor.phase * 2.2) * 0.035
        this.updateTrack(actor, distance)
        continue
      }

      const kind = actor.kind
      const downwind = new THREE.Vector2(actor.root.position.x - bear.x, actor.root.position.z - bear.z)
        .normalize().dot(new THREE.Vector2(windDirection.x, windDirection.z))
      const scentBoost = downwind > 0.45 ? 20 : downwind < -0.45 ? -7 : 0
      const noiseBoost = THREE.MathUtils.clamp(bearSpeed * (stalking ? 0.42 : 1.25), 0, 24)
      const visualAwareness = CONFIG.hunt.awareness[kind] * (stalking ? CONFIG.hunt.stalkAwarenessMultiplier : 1)
      const detection = visualAwareness + scentBoost + noiseBoost

      if (actor.state === 'roaming' && distance < detection) {
        actor.state = 'alert'
        actor.alertTimer = CONFIG.hunt.alertLag[kind] + this.random() * 0.24
        this.alertEvent = kind
      }
      if (actor.state === 'alert') {
        actor.alertTimer -= dt
        if (actor.alertTimer <= 0) actor.state = 'fleeing'
      }

      const pursuitHeading = bearForward && new THREE.Vector2(bearForward.x, bearForward.z).normalize()
      const toPrey = new THREE.Vector2(actor.root.position.x - bear.x, actor.root.position.z - bear.z).normalize()
      const bearingTowardPrey = !!pursuitHeading && pursuitHeading.dot(toPrey) > 0.2
      const chased = distance < CONFIG.hunt.pursuitRadius[kind] && bearSpeed > 0.75 && bearingTowardPrey
      if (actor.state === 'fleeing') {
        if (chased) actor.stamina = Math.max(0, actor.stamina - dt / CONFIG.hunt.chaseDuration[kind])
        else actor.stamina = Math.min(1, actor.stamina + dt * (kind === 'coyote' ? 0.075 : 0.035))
        if (distance > CONFIG.hunt.escapeRadius[kind] && actor.stamina > 0.72) {
          actor.state = 'roaming'
          actor.stamina = Math.min(1, actor.stamina + dt * 0.08)
        }
        if (actor.stamina <= CONFIG.hunt.exhaustionThreshold) {
          actor.state = 'exhausted'
          actor.stamina = CONFIG.hunt.exhaustionThreshold
          actor.exhaustedTimer = CONFIG.hunt.exhaustedWindow[kind]
        }
      } else if (actor.state === 'exhausted') {
        actor.exhaustedTimer -= dt
        if (actor.exhaustedTimer <= 0) {
          actor.state = 'fleeing'
          actor.stamina = 0.22
        }
      } else if (actor.state === 'roaming' && distance > CONFIG.hunt.pursuitRadius[kind]) {
        actor.stamina = Math.min(1, actor.stamina + dt * 0.06)
      }

      const away = new THREE.Vector2(-dx, -dz)
      if (away.lengthSq() < 0.01) away.set(Math.cos(actor.phase), Math.sin(actor.phase))
      away.normalize()
      const frequency = kind === 'rabbit' ? 2.5 : kind === 'coyote' ? 0.48 : kind === 'moose' ? 0.4 : 0.72
      const rabbitDistantFlight = kind === 'rabbit' && distance > CONFIG.hunt.rabbitTightEvasionRange
      const evasive = Math.sin(actor.phase * frequency + actor.id * 2.3)
        * CONFIG.hunt.evasion[kind] * (rabbitDistantFlight ? 0.08 : 1)
      const side = new THREE.Vector2(-away.y, away.x).multiplyScalar(evasive)
      let speed = 0
      if (actor.state === 'alert') speed = kind === 'rabbit' ? 0.04 : 0.7
      else if (actor.state === 'fleeing') {
        const burst = kind === 'rabbit' ? 0.78 + Math.abs(Math.sin(actor.age * 3.2)) * 0.22 : 1
        speed = CONFIG.hunt.fleeSpeed[kind] * (0.9 + actor.stamina * 0.1) * burst
      } else if (actor.state === 'exhausted') speed = 0.46
      else speed = kind === 'rabbit' ? 0.12 : 0.22
      const targetX = actor.state === 'roaming' ? Math.sin(actor.phase * 0.34) * speed : away.x * speed + side.x * speed
      const targetZ = actor.state === 'roaming' ? Math.cos(actor.phase * 0.24) * speed : away.y * speed + side.y * speed
      const response = actor.state === 'fleeing'
        ? kind === 'rabbit' ? 8.2 : kind === 'coyote' ? 5.1 : kind === 'moose' ? 2.8 : 3.8
        : 1.1
      actor.velocity.x = THREE.MathUtils.damp(actor.velocity.x, targetX, response, dt)
      actor.velocity.z = THREE.MathUtils.damp(actor.velocity.z, targetZ, response, dt)
      const nextX = actor.root.position.x + actor.velocity.x * dt
      const nextZ = actor.root.position.z + actor.velocity.z * dt
      if (terrain.isSafeSurface(nextX, nextZ)) {
        actor.root.position.x = nextX
        actor.root.position.z = nextZ
      } else {
        const vx = actor.velocity.x
        actor.velocity.x = -actor.velocity.z * 0.55
        actor.velocity.z = vx * 0.55
      }
      actor.root.position.y = terrain.heightAt(actor.root.position.x, actor.root.position.z)
      if (actor.velocity.lengthSq() > 0.06) actor.root.rotation.y = Math.atan2(-actor.velocity.x, -actor.velocity.z)
      if (actor.rig) this.animatePrey(actor, dt)
      this.updateTrack(actor, distance)
    }
    if (remove.length) {
      remove.forEach(actor => this.group.remove(actor.root))
      const departed = new Set(remove)
      this.actors = this.actors.filter(actor => !departed.has(actor))
    }
  }

  /** Land prey need a tired, aligned pounce. Salmon need a slow strike from inside the river. */
  collectNearby(
    bear: THREE.Vector3,
    pouncing: boolean,
    bearForward = new THREE.Vector3(0, 0, -1),
    bearSpeed = 0,
    sweepStart = bear,
    fishStrike = false,
  ): FoodContact | null {
    let nearest: FoodActor | undefined
    let best = Number.POSITIVE_INFINITY
    const moveX = bear.x - sweepStart.x
    const moveY = bear.y - sweepStart.y
    const moveZ = bear.z - sweepStart.z
    const moveLengthSq = moveX * moveX + moveY * moveY + moveZ * moveZ
    for (const actor of this.actors) {
      const along = moveLengthSq > 0.0001
        ? THREE.MathUtils.clamp(((actor.root.position.x - sweepStart.x) * moveX
          + (actor.root.position.y - sweepStart.y) * moveY
          + (actor.root.position.z - sweepStart.z) * moveZ) / moveLengthSq, 0, 1)
        : 1
      const closestX = sweepStart.x + moveX * along
      const closestY = sweepStart.y + moveY * along
      const closestZ = sweepStart.z + moveZ * along
      const dx = actor.root.position.x - closestX
      const dz = actor.root.position.z - closestZ
      const dy = actor.root.position.y - (closestY + 0.6)
      const distanceSq = dx * dx + dz * dz + dy * dy * 0.12
      const range = actor.kind === 'honey' ? 2.15
        : actor.kind === 'salmon' ? CONFIG.hunt.fishStrikeRange
          : CONFIG.hunt.captureRadius[actor.kind]
      if (distanceSq >= range * range || distanceSq >= best) continue
      const approach = moveLengthSq > 0.0001
        ? new THREE.Vector3(moveX, 0, moveZ)
        : new THREE.Vector3(actor.root.position.x - bear.x, 0, actor.root.position.z - bear.z)
      const facing = approach.lengthSq() > 0.0001 && approach.normalize().dot(bearForward) >= CONFIG.player.pounceFacingDot
      const committedPounce = pouncing && bearSpeed >= CONFIG.player.pounceMinSpeed && facing
      if (isPrey(actor.kind)) {
        if (!pouncing) continue
        if (actor.state !== 'exhausted' || actor.exhaustedTimer <= 0 || !committedPounce) {
          if (actor.missedTimer <= 0) {
            actor.missedTimer = 1.8
            actor.state = 'fleeing'
            actor.stamina = Math.min(1, actor.stamina + 0.28)
            actor.exhaustedTimer = 0
            actor.velocity.add(new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(2.7))
            this.missedHunt = actor.kind
          }
          continue
        }
      }
      if (actor.kind === 'salmon' && (!fishStrike || bearSpeed > CONFIG.hunt.fishStrikeMaxSpeed || !facing)) continue
      nearest = actor
      best = distanceSq
    }
    if (!nearest) return null
    const contact = { kind: nearest.kind, position: nearest.root.position.clone() }
    this.group.remove(nearest.root)
    this.actors = this.actors.filter(actor => actor !== nearest)
    return contact
  }

  /** Surface a concise prompt when a winded land animal is near enough to finish the hunt. */
  huntOpportunity(bear: THREE.Vector3): PreyKind | null {
    let candidate: FoodActor | undefined
    let best = CONFIG.hunt.huntReadyRadius
    for (const actor of this.actors) {
      if (!isPrey(actor.kind) || actor.state !== 'exhausted' || actor.exhaustedTimer <= 0) continue
      const distance = Math.hypot(actor.root.position.x - bear.x, actor.root.position.z - bear.z)
      if (distance <= best) { candidate = actor; best = distance }
    }
    return candidate && isPrey(candidate.kind) ? candidate.kind : null
  }

  tracks(bear: THREE.Vector3): WildlifeTrack[] {
    const limit = CONFIG.hunt.trackingRadius + 24
    return this.actors.flatMap(actor => {
      if (!actor.lastKnown || actor.trackAge > CONFIG.hunt.trackLifetime) return []
      const distance = Math.hypot(actor.lastKnown.x - bear.x, actor.lastKnown.z - bear.z)
      if (distance > limit) return []
      const confidence = THREE.MathUtils.clamp(1 - actor.trackAge / CONFIG.hunt.trackLifetime, 0, 1)
      return [{ id: actor.id, kind: actor.kind, x: actor.lastKnown.x, z: actor.lastKnown.z, age: actor.trackAge,
        state: actor.trackAge < 5 ? 'fresh' as const : 'fading' as const, confidence }]
    })
  }

  consumeMissedHunt(): FoodKind | null {
    const kind = this.missedHunt
    this.missedHunt = null
    return kind
  }

  consumeAlert(): FoodKind | null {
    const kind = this.alertEvent
    this.alertEvent = null
    return kind
  }

  reset(): void {
    for (const actor of this.actors) this.group.remove(actor.root)
    this.actors = []
    this.random = seededRandom(71027)
    this.nextId = 1
    this.missedHunt = null
    this.alertEvent = null
  }

  private spawnFallback(kind: FoodKind, bear: THREE.Vector3, terrain: Terrain, minRadius: number, bearing = -Math.PI / 2): void {
    for (let ring = 0; ring < 18; ring += 1) {
      const radius = minRadius + ring * 5
      for (let spoke = 0; spoke < 18; spoke += 1) {
        const angle = bearing + spoke / 18 * Math.PI * 2
        const x = bear.x + Math.cos(angle) * radius
        const z = bear.z + Math.sin(angle) * radius
        if (!terrain.isSafeSurface(x, z) || Math.abs(x - terrain.riverX(z)) < 8) continue
        this.spawn(kind, new THREE.Vector3(x, terrain.heightAt(x, z), z), terrain)
        return
      }
    }
  }

  private updateTrack(actor: FoodActor, distance: number): void {
    if (distance > CONFIG.hunt.trackingRadius) return
    if (actor.trackRefresh > 0 && actor.lastKnown) return
    actor.lastKnown = actor.root.position.clone()
    actor.trackAge = 0
    actor.trackRefresh = CONFIG.hunt.trackRefreshSeconds
  }

  private animatePrey(actor: FoodActor, dt: number): void {
    if (!actor.rig) return
    const speed = actor.velocity.length()
    const kind = actor.kind as PreyKind
    const stride = THREE.MathUtils.clamp(speed / CONFIG.hunt.fleeSpeed[kind], 0, 1)
    const phase = actor.phase * (2.2 + speed * 1.25)
    const phases = actor.state === 'roaming' || actor.state === 'alert'
      ? [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5]
      : [Math.PI * 1.55, Math.PI * 1.75, 0, 0.18]
    actor.rig.legs.forEach((leg, index) => {
      leg.rotation.x = Math.sin(phase + phases[index]) * stride * (actor.state === 'exhausted' ? 0.18 : kind === 'rabbit' ? 0.82 : 0.54)
    })
    actor.rig.head.rotation.x = actor.state === 'alert' ? -0.1 : actor.state === 'exhausted' ? 0.19 : Math.sin(actor.phase * 2.6) * 0.025
    const rabbitHop = kind === 'rabbit' && actor.state === 'fleeing' ? Math.abs(Math.sin(phase * 0.72)) * stride * 0.14 : 0
    actor.rig.body.position.y = Math.abs(Math.sin(phase * 2)) * stride * (kind === 'rabbit' ? 0.06 : 0.032) + rabbitHop
      - (actor.state === 'exhausted' ? 0.075 : 0)
    actor.rig.body.rotation.z = actor.state === 'exhausted' ? Math.sin(actor.phase * 4.1) * 0.035 : kind === 'rabbit' ? Math.sin(phase) * stride * 0.04 : 0
    actor.rig.body.rotation.x = actor.state === 'fleeing' ? -0.025 : 0
    if (actor.rig.tail) actor.rig.tail.rotation.x = Math.sin(phase * 0.35) * stride * (kind === 'coyote' ? 0.14 : 0.045)
    void dt
  }
}
