import * as THREE from 'three'
import { CONFIG } from './config'
import type { World } from './world'

/** Bank-side bear controller using the existing prototype geometry until approved models are available. */
export class Player {
  readonly root = new THREE.Group()
  private readonly body = new THREE.Group()
  private readonly head = new THREE.Group()
  private readonly legs: THREE.Group[] = []
  private readonly frontPaws: THREE.Group[] = []
  private runPhase = 0
  private hitPulse = 0
  private catchPulse = 0
  private targetZ = 0
  private targetOffset = 1.1
  private bankSide = 1

  constructor(private readonly world: World) {
    this.root.add(this.body)
    this.body.add(this.head)
    this.buildBear()
    this.reset()
  }

  get position(): THREE.Vector3 { return this.root.position }
  get x(): number { return this.root.position.x }
  get z(): number { return this.root.position.z }
  get bankOffset(): number { return this.targetOffset }

  step(dt: number, acrossBank: number, alongBank: number): void {
    this.targetOffset = THREE.MathUtils.clamp(this.targetOffset + acrossBank * CONFIG.player.moveSpeed * dt, CONFIG.player.bankNear, CONFIG.player.bankFar)
    this.targetZ = THREE.MathUtils.clamp(this.targetZ - alongBank * CONFIG.player.moveSpeed * dt, -13, 12)
    const target = this.world.bankPoint(this.targetZ, this.bankSide, this.targetOffset)
    this.root.position.lerp(target, 1 - Math.exp(-11 * dt))
    const tangent = this.world.riverTangent(this.targetZ)
    const inward = new THREE.Vector3(-tangent.z * this.bankSide, 0, tangent.x * this.bankSide).normalize()
    const wantedYaw = Math.atan2(-inward.x, -inward.z)
    this.root.rotation.y = THREE.MathUtils.damp(this.root.rotation.y, wantedYaw, 8, dt)
    this.body.rotation.z = THREE.MathUtils.damp(this.body.rotation.z, -acrossBank * 0.07, 8, dt)
    this.hitPulse = Math.max(0, this.hitPulse - dt)
    this.catchPulse = Math.max(0, this.catchPulse - dt)
  }

  catch(): void { this.catchPulse = 0.62 }
  hit(): void { this.hitPulse = 0.55 }

  reset(): void {
    this.targetZ = 0
    this.targetOffset = 1.1
    this.root.position.copy(this.world.bankPoint(this.targetZ, this.bankSide, this.targetOffset))
    this.root.rotation.y = Math.PI / 2
    this.body.rotation.set(0, 0, 0)
    this.head.rotation.set(0, 0, 0)
    this.hitPulse = 0
    this.catchPulse = 0
    this.runPhase = 0
  }

  animate(dt: number, time: number): void {
    this.runPhase += dt * 3.1
    const breath = Math.sin(time * 1.45) * 0.022
    this.body.position.y = breath + Math.sin(this.runPhase) * 0.015
    this.legs.forEach((leg, i) => {
      const offset = i < 2 ? 0 : Math.PI
      leg.rotation.x = Math.sin(this.runPhase + offset) * 0.08
    })
    const catchT = this.catchPulse > 0 ? this.catchPulse / 0.62 : 0
    const reach = Math.sin((1 - catchT) * Math.PI) * 0.95
    this.head.rotation.x = -catchT * 0.19
    this.head.position.set(-0.12, catchT * 0.02, -catchT * 0.08)
    this.frontPaws.forEach((paw, i) => {
      paw.rotation.x = -reach * (i === 0 ? 1 : 0.78)
      paw.position.y = 0.57 + reach * 0.1
    })
    if (this.hitPulse > 0) {
      this.body.rotation.x = Math.sin(time * 34) * this.hitPulse * 0.18
      this.body.scale.setScalar(1 + this.hitPulse * 0.035)
      this.body.visible = Math.floor(time * 16) % 2 === 0
    } else {
      this.body.rotation.x = 0
      this.body.scale.setScalar(1)
      this.body.visible = true
    }
  }

  private buildBear(): void {
    const fur = new THREE.MeshStandardMaterial({ color: '#895438', roughness: 0.92, flatShading: true })
    const lightFur = new THREE.MeshStandardMaterial({ color: '#b27a4f', roughness: 0.88, flatShading: true })
    const dark = new THREE.MeshStandardMaterial({ color: '#30231d', roughness: 0.75 })
    const eye = new THREE.MeshStandardMaterial({ color: '#17120f', roughness: 0.3 })
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, pos: [number, number, number], scale: [number, number, number], parent = this.body) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...pos)
      mesh.scale.set(...scale)
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }
    const sphere = new THREE.SphereGeometry(1, 18, 14)
    add(sphere, fur, [0, 1.05, 0.12], [0.68, 0.59, 0.94])
    add(sphere, lightFur, [0, 1.13, -0.52], [0.57, 0.52, 0.55])
    add(sphere, fur, [0, 1.7, -0.63], [0.47, 0.45, 0.47], this.head)
    add(sphere, lightFur, [0, 1.53, -0.97], [0.31, 0.22, 0.29], this.head)
    add(sphere, dark, [0, 1.59, -1.2], [0.13, 0.105, 0.12], this.head)
    for (const side of [-1, 1]) {
      add(sphere, fur, [side * 0.34, 2.04, -0.69], [0.16, 0.18, 0.15], this.head)
      add(sphere, lightFur, [side * 0.34, 2.04, -0.72], [0.09, 0.105, 0.08], this.head)
      add(sphere, eye, [side * 0.2, 1.79, -1.02], [0.045, 0.055, 0.035], this.head)
      add(sphere, fur, [side * 0.51, 0.44, -0.48], [0.25, 0.42, 0.28])
      add(sphere, fur, [side * 0.51, 0.44, 0.56], [0.27, 0.43, 0.3])
    }
    add(sphere, fur, [0, 1.0, 1.0], [0.18, 0.18, 0.2])
    const legGeo = new THREE.CapsuleGeometry(0.17, 0.25, 4, 8)
    for (const [i, [x, z]] of [[-0.5, -0.48], [0.5, -0.48], [-0.5, 0.56], [0.5, 0.56]].entries()) {
      const pivot = new THREE.Group()
      pivot.position.set(x, 0.58, z)
      const leg = new THREE.Mesh(legGeo, fur)
      leg.position.y = -0.18
      leg.castShadow = true
      pivot.add(leg)
      this.body.add(pivot)
      this.legs.push(pivot)
      if (i < 2) this.frontPaws.push(pivot)
    }
  }
}
