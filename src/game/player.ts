import * as THREE from 'three'
import { CONFIG } from './config'
import { createBear, type AnimalRig } from './models'
import type { World } from './world'

/** Camera-relative grizzly controller with momentum and reduced control on steep ground. */
export class Player {
  readonly rig: AnimalRig
  readonly root: THREE.Group
  readonly position = new THREE.Vector3()
  readonly velocity = new THREE.Vector3()
  private pounceTimer = 0
  private pounceCooldown = 0
  private hitTimer = 0
  private gait = 0
  private readonly lastSafe = new THREE.Vector3(-5, 0, 5)
  private speedValue = 0

  constructor(private readonly world: World) {
    this.rig = createBear()
    this.root = this.rig.root
    this.reset()
  }

  get speed(): number { return this.speedValue }
  get pouncing(): boolean { return this.pounceTimer > 0 }
  get safePosition(): THREE.Vector3 { return this.lastSafe.clone() }

  step(dt: number, x: number, y: number, speedLimit: number, sprint: boolean, cameraYaw: number, pounce: boolean): boolean {
    this.pounceCooldown = Math.max(0, this.pounceCooldown - dt)
    this.pounceTimer = Math.max(0, this.pounceTimer - dt)
    this.hitTimer = Math.max(0, this.hitTimer - dt)
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw))
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw))
    const intent = right.multiplyScalar(x).add(forward.multiplyScalar(y))
    if (intent.lengthSq() > 1) intent.normalize()
    const oldGround = this.world.terrain.sample(this.position.x, this.position.z)
    const slopeControl = THREE.MathUtils.clamp(1 - oldGround.slope * CONFIG.player.slopeControlLoss, 0.34, 1)
    const tunedSpeed = speedLimit * (CONFIG.player.moveSpeed / 5.8)
    const limit = Math.min(CONFIG.run.maxSpeed * 1.22, tunedSpeed * (sprint ? CONFIG.run.sprintMultiplier : 1))
    const goal = intent.multiplyScalar(limit * slopeControl)
    const smoothing = 1 - Math.exp(-CONFIG.player.acceleration * dt * (intent.lengthSq() > 0 ? 1 : 0.58))
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, goal.x, smoothing)
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, goal.z, smoothing)

    const downhill = new THREE.Vector3(oldGround.normal.x, 0, oldGround.normal.z)
    const slideGate = THREE.MathUtils.clamp((this.speedValue - speedLimit * 0.48) / 6.2, 0, 1)
      * THREE.MathUtils.clamp((oldGround.slope - 0.42) / 0.5, 0, 1)
    if (slideGate > 0 && downhill.lengthSq() > 0.0001) {
      this.velocity.addScaledVector(downhill.normalize(), slideGate * 9 * dt)
    }
    const maxVelocity = limit + slideGate * 4
    const velocityLength = Math.hypot(this.velocity.x, this.velocity.z)
    if (velocityLength > maxVelocity && velocityLength > 0) {
      const scale = maxVelocity / velocityLength
      this.velocity.x *= scale
      this.velocity.z *= scale
    }

    let pounceStarted = false
    if (pounce && this.pounceCooldown <= 0) {
      const facing = this.velocity.lengthSq() > 0.15 ? this.velocity.clone().setY(0).normalize() : forward
      this.velocity.addScaledVector(facing, CONFIG.player.pounceBoost)
      this.pounceTimer = 0.44
      this.pounceCooldown = CONFIG.player.pounceCooldown
      pounceStarted = true
    }
    this.position.x += this.velocity.x * dt
    this.position.z += this.velocity.z * dt
    const edge = this.world.terrain.halfSize - 4
    this.position.x = THREE.MathUtils.clamp(this.position.x, -edge, edge)
    this.position.z = THREE.MathUtils.clamp(this.position.z, -edge, edge)
    const ground = this.world.terrain.sample(this.position.x, this.position.z)
    this.position.y = ground.height
    this.root.position.copy(this.position)
    this.speedValue = Math.hypot(this.velocity.x, this.velocity.z)
    if (this.speedValue > 0.16) {
      const wantedYaw = Math.atan2(-this.velocity.x, -this.velocity.z)
      this.root.rotation.y = THREE.MathUtils.damp(this.root.rotation.y, wantedYaw, 8 * slopeControl, dt)
    }
    const sideLean = THREE.MathUtils.clamp(x * this.speedValue * 0.012, -0.23, 0.23)
    this.rig.body.rotation.z = THREE.MathUtils.damp(this.rig.body.rotation.z, -sideLean, 5, dt)
    if (this.world.terrain.isSafeSurface(this.position.x, this.position.z)) this.lastSafe.copy(this.position)
    return pounceStarted
  }

  animate(dt: number, time: number): void {
    const moving = Math.min(1, this.speedValue / 8)
    this.gait += dt * (2.2 + this.speedValue * 1.4)
    this.rig.body.position.y = Math.sin(time * 1.35) * 0.025 + Math.abs(Math.sin(this.gait * 2)) * moving * 0.045
    this.rig.body.rotation.x = this.pounceTimer > 0 ? -Math.sin((1 - this.pounceTimer / 0.44) * Math.PI) * 0.16 : 0
    this.rig.head.rotation.x = Math.sin(time * 1.2) * 0.025 - (this.pounceTimer > 0 ? 0.14 : 0)
    this.rig.legs.forEach((leg, i) => {
      const phase = this.gait + (i % 2 === 0 ? 0 : Math.PI)
      leg.rotation.x = Math.sin(phase) * moving * (i < 2 ? 0.62 : 0.5)
      if (this.pounceTimer > 0 && i < 2) leg.rotation.x -= 0.45
    })
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

  respawn(): void {
    this.position.copy(this.lastSafe)
    this.root.position.copy(this.position)
    this.velocity.set(0, 0, 0)
    this.root.visible = true
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
    this.pounceTimer = 0
    this.pounceCooldown = 0
    this.hitTimer = 0
    this.gait = 0
    this.speedValue = 0
  }
}
