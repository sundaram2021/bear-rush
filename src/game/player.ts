import * as THREE from 'three'
import { CONFIG } from './config'
import { createBear, type AnimalRig } from './models'
import type { World } from './world'

/** Momentum-driven grizzly locomotion with walk/trot/gallop cycles and short sprint reserves. */
export class Player {
  readonly rig: AnimalRig
  readonly root: THREE.Group
  readonly position = new THREE.Vector3()
  readonly velocity = new THREE.Vector3()
  private pounceTimer = 0
  private pounceCooldown = 0
  private captureTimer = 0
  private hitTimer = 0
  private gait = 0
  private strideBlend = 0
  private readonly lastFootCycle = [-1, -1, -1, -1]
  private pendingFootfalls = 0
  private readonly lastSafe = new THREE.Vector3(-5, 0, 5)
  private speedValue = 0
  private staminaValue = 1
  private sprintingValue = false
  private stalkingValue = false
  private wadingValue = false

  constructor(private readonly world: World) {
    this.rig = createBear()
    this.root = this.rig.root
    this.reset()
  }

  get speed(): number { return this.speedValue }
  get pouncing(): boolean { return this.pounceTimer > 0 }
  get safePosition(): THREE.Vector3 { return this.lastSafe.clone() }
  get stamina(): number { return this.staminaValue }
  get sprinting(): boolean { return this.sprintingValue }
  get stalking(): boolean { return this.stalkingValue }
  get wading(): boolean { return this.wadingValue }
  get forward(): THREE.Vector3 { return new THREE.Vector3(0, 0, -1).applyQuaternion(this.root.quaternion).setY(0).normalize() }

  consumeFootfalls(): number {
    const count = this.pendingFootfalls
    this.pendingFootfalls = 0
    return count
  }

  step(dt: number, x: number, y: number, speedLimit: number, sprint: boolean, cameraYaw: number, pounce: boolean, stalk = false): boolean {
    this.pounceCooldown = Math.max(0, this.pounceCooldown - dt)
    this.pounceTimer = Math.max(0, this.pounceTimer - dt)
    this.captureTimer = Math.max(0, this.captureTimer - dt)
    this.hitTimer = Math.max(0, this.hitTimer - dt)
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw))
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw))
    const intent = right.multiplyScalar(x).add(forward.multiplyScalar(y))
    const movementStrength = intent.length()
    if (movementStrength > 1) intent.normalize()
    const oldGround = this.world.terrain.sample(this.position.x, this.position.z)
    const slopeControl = THREE.MathUtils.clamp(1 - oldGround.slope * CONFIG.player.slopeControlLoss, 0.3, 1)
    const moving = movementStrength > 0.001
    this.wadingValue = this.world.terrain.isInRiver(this.position.x, this.position.z)
    this.stalkingValue = moving && (stalk || movementStrength < CONFIG.player.analogStalkThreshold)
    this.sprintingValue = sprint && moving && this.staminaValue > 0.015 && !this.stalkingValue && !this.wadingValue
    if (this.sprintingValue) this.staminaValue = Math.max(0, this.staminaValue - dt / CONFIG.player.sprintCapacity)
    else this.staminaValue = Math.min(1, this.staminaValue + dt * CONFIG.player.sprintRecovery)
    const tunedSpeed = speedLimit * (CONFIG.player.moveSpeed / 6.6)
    const pace = this.stalkingValue ? CONFIG.player.stalkMultiplier : this.sprintingValue ? CONFIG.run.sprintMultiplier : 1
    const waterDrag = this.wadingValue ? CONFIG.player.riverMoveMultiplier : 1
    const limit = this.wadingValue
      ? Math.min(CONFIG.player.riverMaxSpeed, tunedSpeed * pace * waterDrag)
      : Math.min(CONFIG.run.maxSpeed * 1.12, tunedSpeed * pace)
    const goal = intent.multiplyScalar(limit * slopeControl)
    const response = moving ? CONFIG.player.acceleration : CONFIG.player.acceleration * 0.48
    const smoothing = 1 - Math.exp(-response * dt)
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, goal.x, smoothing)
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, goal.z, smoothing)

    const downhill = new THREE.Vector3(oldGround.normal.x, 0, oldGround.normal.z)
    const slideGate = THREE.MathUtils.clamp((this.speedValue - speedLimit * 0.52) / 6.2, 0, 1)
      * THREE.MathUtils.clamp((oldGround.slope - 0.4) / 0.53, 0, 1)
    if (slideGate > 0 && downhill.lengthSq() > 0.0001) this.velocity.addScaledVector(downhill.normalize(), slideGate * 8.5 * dt)
    const maxVelocity = limit + slideGate * 4.2
    const velocityLength = Math.hypot(this.velocity.x, this.velocity.z)
    if (velocityLength > maxVelocity && velocityLength > 0) {
      const scale = maxVelocity / velocityLength
      this.velocity.x *= scale
      this.velocity.z *= scale
    }

    let pounceStarted = false
    if (pounce && !this.wadingValue && this.pounceCooldown <= 0 && this.speedValue > CONFIG.player.pounceStartSpeed) {
      const facing = this.velocity.lengthSq() > 0.15 ? this.velocity.clone().setY(0).normalize() : forward
      this.velocity.addScaledVector(facing, CONFIG.player.pounceBoost)
      this.pounceTimer = CONFIG.player.pounceDuration
      this.pounceCooldown = CONFIG.player.pounceCooldown
      pounceStarted = true
    }
    this.position.x += this.velocity.x * dt
    this.position.z += this.velocity.z * dt
    const ground = this.world.terrain.sample(this.position.x, this.position.z)
    this.position.y = ground.height
    this.wadingValue = this.world.terrain.isInRiver(this.position.x, this.position.z)
    this.root.position.copy(this.position)
    this.speedValue = Math.hypot(this.velocity.x, this.velocity.z)
    if (this.speedValue > 0.16) {
      const wantedYaw = Math.atan2(-this.velocity.x, -this.velocity.z)
      this.root.rotation.y = THREE.MathUtils.damp(this.root.rotation.y, wantedYaw, 5.3 * slopeControl, dt)
    }
    const sideLean = THREE.MathUtils.clamp(x * this.speedValue * 0.014 + oldGround.normal.x * 0.08, -0.25, 0.25)
    this.rig.body.rotation.z = THREE.MathUtils.damp(this.rig.body.rotation.z, -sideLean, 4.4, dt)
    if (this.world.terrain.isSafeSurface(this.position.x, this.position.z)) this.lastSafe.copy(this.position)
    return pounceStarted
  }

  animate(dt: number, time: number): void {
    const moving = THREE.MathUtils.clamp(this.speedValue / 7.2, 0, 1)
    this.strideBlend = THREE.MathUtils.damp(this.strideBlend, moving, 7.5, dt)
    const cycleRate = 1.5 + this.speedValue * 1.2
    this.gait += dt * cycleRate
    const gait: 'walk' | 'trot' | 'gallop' = this.speedValue < 2.55 ? 'walk' : this.speedValue < 7.2 ? 'trot' : 'gallop'
    const phases = gait === 'walk'
      ? [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5]
      : gait === 'trot'
        ? [0, Math.PI, Math.PI, 0]
        : [Math.PI * 1.7, Math.PI * 1.88, 0, 0.2]
    const contactLegs = gait === 'walk' ? [0, 1, 2, 3] : [0, 1]
    for (const index of contactLegs) {
      const cycle = Math.floor((this.gait + phases[index]) / (Math.PI * 2))
      if (this.lastFootCycle[index] < 0) {
        this.lastFootCycle[index] = cycle
        continue
      }
      if (cycle > this.lastFootCycle[index]) {
        if (this.speedValue > 0.8) this.pendingFootfalls += 1
        this.lastFootCycle[index] = cycle
      }
    }
    const stride = gait === 'walk' ? 0.42 : gait === 'trot' ? 0.64 : 0.83
    this.rig.legs.forEach((leg, index) => {
      const phase = this.gait + phases[index]
      const swing = Math.sin(phase)
      const tuck = Math.max(0, Math.sin(phase + 0.6))
      leg.rotation.x = swing * stride * this.strideBlend
      leg.rotation.z = Math.sin(phase + (index % 2) * Math.PI) * 0.045 * this.strideBlend
      if (this.pounceTimer > 0 && index < 2) leg.rotation.x -= 0.48
      else if (gait === 'gallop' && index >= 2) leg.rotation.x += tuck * 0.1
    })
    const bounce = Math.abs(Math.sin(this.gait * (gait === 'walk' ? 1 : 2))) * this.strideBlend
    const impact = this.pounceTimer > 0 ? Math.sin((1 - this.pounceTimer / CONFIG.player.pounceDuration) * Math.PI) : 0
    const captureProgress = 1 - this.captureTimer / 0.62
    const captureDip = this.captureTimer > 0 ? Math.sin(captureProgress * Math.PI) : 0
    this.rig.body.position.y = Math.sin(time * 1.1) * 0.012 + bounce * (gait === 'gallop' ? 0.11 : 0.045) + impact * 0.055
    this.rig.body.rotation.x = this.captureTimer > 0 ? -captureDip * 0.3 : this.pounceTimer > 0 ? -impact * 0.22 : THREE.MathUtils.damp(this.rig.body.rotation.x, gait === 'gallop' ? -0.035 : 0, 4, dt)
    this.rig.head.rotation.x = -this.rig.body.rotation.x * 0.48 + Math.sin(this.gait * 0.5) * moving * 0.035 - impact * 0.1 - captureDip * 0.12
    this.rig.head.rotation.z = Math.sin(this.gait * 0.5 + 1) * moving * 0.024
    if (this.hitTimer > 0) {
      const blink = Math.floor(time * 13) % 2 === 0
      this.root.visible = blink
      this.rig.body.scale.setScalar(1 + this.hitTimer * 0.025)
    } else {
      this.root.visible = true
      this.rig.body.scale.setScalar(1)
    }
  }

  hit(): void { this.hitTimer = 0.68 }

  capture(): void {
    this.pounceTimer = 0
    this.captureTimer = 0.62
    this.velocity.multiplyScalar(0.24)
    this.speedValue = this.velocity.length()
  }

  respawn(): void {
    this.position.copy(this.lastSafe)
    this.root.position.copy(this.position)
    this.velocity.set(0, 0, 0)
    this.root.visible = true
    this.staminaValue = Math.max(this.staminaValue, 0.6)
  }

  reset(): void {
    const start = new THREE.Vector3(-5, this.world.terrain.heightAt(-5, 5), 5)
    this.position.copy(start)
    this.lastSafe.copy(start)
    this.root.position.copy(start)
    this.root.rotation.set(0, 0, 0)
    this.velocity.set(0, 0, 0)
    this.rig.body.rotation.set(0, 0, 0)
    this.rig.head.rotation.set(0, 0, 0)
    this.rig.body.position.set(0, 0, 0)
    this.rig.legs.forEach(leg => leg.rotation.set(0, 0, 0))
    this.pounceTimer = 0
    this.pounceCooldown = 0
    this.captureTimer = 0
    this.hitTimer = 0
    this.gait = 0
    this.lastFootCycle.fill(-1)
    this.pendingFootfalls = 0
    this.strideBlend = 0
    this.speedValue = 0
    this.staminaValue = 1
    this.sprintingValue = false
    this.stalkingValue = false
    this.wadingValue = false
  }
}
