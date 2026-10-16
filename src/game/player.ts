import * as THREE from 'three'
import { CONFIG } from './config'
import type { Terrain } from './terrain'

/**
 * Free-roaming grizzly. The bear accelerates in any camera-relative direction, gathers speed while
 * it keeps hunting, wades the river and loses footing on steep mountain slopes.
 */
export class Player {
  readonly root = new THREE.Group()
  private readonly body = new THREE.Group()
  private readonly head = new THREE.Group()
  private readonly legs: THREE.Group[] = []
  private readonly frontPaws: THREE.Group[] = []
  private readonly velocity = new THREE.Vector3()
  private yaw = Math.PI
  private runPhase = 0
  private stamina = 100
  private pounceTimer = 0
  private pounceCooldown = 0
  private eatPulse = 0
  private hurtPulse = 0
  private roarPulse = 0
  sliding = false

  constructor(private readonly terrain: Terrain) {
    this.root.add(this.body)
    this.body.add(this.head)
    this.buildBear()
    this.reset()
  }

  get position(): THREE.Vector3 { return this.root.position }
  get speed(): number { return this.velocity.length() }
  get heading(): number { return this.yaw }
  get staminaFraction(): number { return this.stamina / 100 }
  get pounceReady(): boolean { return this.pounceCooldown <= 0 }

  /** `direction` is camera-relative movement intent (x right, y forward). */
  step(dt: number, direction: { x: number; y: number }, cameraYaw: number, sprint: boolean, cap: number): void {
    const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw))
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw))
    const desired = forward.multiplyScalar(direction.y).addScaledVector(right, direction.x)
    const intent = Math.hypot(desired.x, desired.z) > 0.01
    if (intent) desired.normalize()

    const canSprint = sprint && this.stamina > 3 && intent
    if (canSprint) this.stamina = Math.max(0, this.stamina - CONFIG.player.staminaDrain * dt)
    else this.stamina = Math.min(100, this.stamina + CONFIG.player.staminaRecover * dt)

    const base = canSprint ? CONFIG.run.sprintSpeed : CONFIG.run.baseSpeed
    const targetSpeed = Math.min(base, cap)

    const slope = this.terrain.slope(this.position.x, this.position.z)
    this.sliding = slope > CONFIG.player.slideSlope

    const accel = this.sliding ? CONFIG.player.accel * 0.35 : CONFIG.player.accel
    const targetVel = desired.multiplyScalar(targetSpeed)
    if (intent) {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVel.x, accel, dt)
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVel.z, accel, dt)
    } else {
      const drag = this.sliding ? 1 : 4.5
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, drag, dt)
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, drag, dt)
    }

    if (this.sliding) {
      const e = 1.4
      const gx = (this.terrain.height(this.position.x + e, this.position.z) - this.terrain.height(this.position.x - e, this.position.z)) / (2 * e)
      const gz = (this.terrain.height(this.position.x, this.position.z + e) - this.terrain.height(this.position.x, this.position.z - e)) / (2 * e)
      const len = Math.hypot(gx, gz) || 1
      const strength = CONFIG.player.slideGravity * (slope - CONFIG.player.slideSlope) * dt
      this.velocity.x -= (gx / len) * strength
      this.velocity.z -= (gz / len) * strength
    }

    if (this.pounceTimer > 0) {
      this.pounceTimer -= dt
      const dir = Math.hypot(this.velocity.x, this.velocity.z) > 0.4
        ? new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize()
        : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw))
      this.velocity.addScaledVector(dir, CONFIG.player.pounceBoost * dt * 6)
    }
    this.pounceCooldown = Math.max(0, this.pounceCooldown - dt)

    this.position.x += this.velocity.x * dt
    this.position.z += this.velocity.z * dt
    this.terrain.clampToBounds(this.position)

    const ground = this.terrain.height(this.position.x, this.position.z)
    const surface = this.terrain.isWater(this.position.x, this.position.z)
      ? Math.max(ground, this.terrain.waterY(this.position.z) - 0.45)
      : ground
    this.position.y = THREE.MathUtils.damp(this.position.y, surface, 16, dt)

    const moving = this.speed
    if (moving > 0.4) {
      const wanted = Math.atan2(-this.velocity.x, -this.velocity.z)
      this.yaw = dampAngle(this.yaw, wanted, CONFIG.player.turnRate, dt)
      this.root.rotation.y = this.yaw
    }
    this.body.rotation.z = THREE.MathUtils.damp(this.body.rotation.z, 0, 6, dt)

    this.eatPulse = Math.max(0, this.eatPulse - dt)
    this.hurtPulse = Math.max(0, this.hurtPulse - dt)
    this.roarPulse = Math.max(0, this.roarPulse - dt)
  }

  startPounce(): boolean {
    if (this.pounceCooldown > 0) return false
    this.pounceCooldown = CONFIG.player.pounceCooldown
    this.pounceTimer = 0.32
    return true
  }

  eat(): void { this.eatPulse = 0.55 }
  hurt(): void { this.hurtPulse = 0.6 }
  roar(): void { this.roarPulse = 0.9 }

  /** Drop the bear at a fresh, safe spot after a fall. */
  teleport(x: number, z: number): void {
    this.velocity.set(0, 0, 0)
    this.position.set(x, this.terrain.height(x, z), z)
  }

  reset(): void {
    this.velocity.set(0, 0, 0)
    this.position.set(6, this.terrain.height(6, 0), 0)
    this.yaw = Math.PI
    this.root.rotation.y = this.yaw
    this.body.rotation.set(0, 0, 0)
    this.head.rotation.set(0, 0, 0)
    this.stamina = 100
    this.pounceTimer = 0
    this.pounceCooldown = 0
    this.eatPulse = 0
    this.hurtPulse = 0
    this.roarPulse = 0
    this.runPhase = 0
    this.sliding = false
  }

  animate(dt: number, time: number): void {
    const speed = this.speed
    this.runPhase += dt * (2.4 + speed * 0.85)
    const stride = Math.min(1, speed / 9)
    const breath = Math.sin(time * 1.3) * 0.02
    this.body.position.y = breath + Math.abs(Math.sin(this.runPhase)) * 0.05 * stride
    this.legs.forEach((leg, i) => {
      const offset = (i % 2 === 0 ? 0 : Math.PI) + (i < 2 ? 0 : 0.35)
      leg.rotation.x = Math.sin(this.runPhase + offset) * 0.5 * stride
    })

    const eatT = this.eatPulse > 0 ? this.eatPulse / 0.55 : 0
    const pounceT = this.pounceTimer > 0 ? this.pounceTimer / 0.32 : 0
    const reach = Math.sin((1 - pounceT) * Math.PI)
    this.head.rotation.x = -eatT * 0.5 - reach * 0.3 - this.roarPulse * 0.5
    this.head.position.y = 0.72 + Math.sin(time * 1.3) * 0.01
    this.frontPaws.forEach((paw, i) => {
      paw.rotation.x = -reach * (i === 0 ? 1 : 0.82)
      paw.position.y = 0.55 + reach * 0.32
    })

    if (this.hurtPulse > 0) {
      this.body.rotation.x = Math.sin(time * 36) * this.hurtPulse * 0.16
      this.body.scale.setScalar(1 + this.hurtPulse * 0.03)
      this.body.visible = Math.floor(time * 18) % 2 === 0
    } else {
      this.body.rotation.x = THREE.MathUtils.damp(this.body.rotation.x, 0, 10, dt)
      this.body.scale.setScalar(1)
      this.body.visible = true
    }
  }

  private buildBear(): void {
    const fur = new THREE.MeshStandardMaterial({ color: '#7a4a2e', roughness: 0.95, flatShading: true })
    const lightFur = new THREE.MeshStandardMaterial({ color: '#a9744a', roughness: 0.9, flatShading: true })
    const dark = new THREE.MeshStandardMaterial({ color: '#241a14', roughness: 0.8 })
    const eye = new THREE.MeshStandardMaterial({ color: '#0d0b09', roughness: 0.25 })
    const claw = new THREE.MeshStandardMaterial({ color: '#e8e2d2', roughness: 0.6 })
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, pos: [number, number, number], scale: [number, number, number], parent: THREE.Object3D = this.body) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...pos)
      mesh.scale.set(...scale)
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }
    const sphere = new THREE.SphereGeometry(1, 18, 14)
    add(sphere, fur, [0, 1.05, 0.05], [0.72, 0.62, 1.02])
    add(sphere, lightFur, [0, 1.16, -0.62], [0.6, 0.55, 0.58])
    add(sphere, fur, [0, 1.72, -0.7], [0.5, 0.47, 0.5], this.head)
    add(sphere, lightFur, [0, 1.54, -1.06], [0.32, 0.24, 0.3], this.head)
    add(sphere, dark, [0, 1.6, -1.3], [0.14, 0.11, 0.13], this.head)
    for (const side of [-1, 1]) {
      add(sphere, fur, [side * 0.36, 2.08, -0.76], [0.17, 0.19, 0.16], this.head)
      add(sphere, lightFur, [side * 0.36, 2.07, -0.79], [0.09, 0.11, 0.085], this.head)
      add(sphere, eye, [side * 0.21, 1.8, -1.12], [0.05, 0.06, 0.04], this.head)
      add(sphere, fur, [side * 0.54, 0.46, -0.56], [0.26, 0.44, 0.3])
      add(sphere, fur, [side * 0.54, 0.46, 0.64], [0.28, 0.45, 0.32])
      for (let c = 0; c < 3; c += 1) {
        add(new THREE.ConeGeometry(0.045, 0.16, 5), claw, [side * 0.54 + (c - 1) * 0.09, 0.06, -0.74], [1, 1, 1])
      }
    }
    add(sphere, fur, [0, 1.02, 1.06], [0.19, 0.19, 0.22])
    const legGeo = new THREE.CapsuleGeometry(0.18, 0.26, 4, 8)
    const joints: Array<[number, number]> = [[-0.52, -0.56], [0.52, -0.56], [-0.52, 0.64], [0.52, 0.64]]
    joints.forEach(([x, z], i) => {
      const pivot = new THREE.Group()
      pivot.position.set(x, 0.58, z)
      const leg = new THREE.Mesh(legGeo, fur)
      leg.position.y = -0.2
      leg.castShadow = true
      pivot.add(leg)
      this.body.add(pivot)
      this.legs.push(pivot)
      if (i < 2) this.frontPaws.push(pivot)
    })
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI
  if (delta < -Math.PI) delta += Math.PI * 2
  return current + delta * (1 - Math.exp(-lambda * dt))
}
