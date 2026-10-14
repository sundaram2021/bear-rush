import * as THREE from 'three'
import { CONFIG } from './config'

/**
 * Lightweight blockout bear used while approved Hybrid 3D model sourcing is blocked by the
 * unbound catalog session. Replace this mesh only after catalog-first asset integration succeeds.
 */
export class Player {
  readonly root = new THREE.Group()
  private readonly body = new THREE.Group()
  private readonly legs: THREE.Group[] = []
  private runPhase = 0
  private hitPulse = 0
  private targetX = 0

  constructor() {
    this.root.position.set(0, 0, 0)
    this.root.add(this.body)
    this.buildBear()
  }

  get position(): THREE.Vector3 {
    return this.root.position
  }

  get x(): number {
    return this.root.position.x
  }

  step(dt: number, steer: number): void {
    const maxX = CONFIG.player.maxX
    this.targetX = THREE.MathUtils.clamp(this.targetX + steer * CONFIG.player.moveSpeed * dt, -maxX, maxX)
    this.root.position.x = THREE.MathUtils.damp(this.root.position.x, this.targetX, 13, dt)
    this.body.rotation.z = THREE.MathUtils.damp(this.body.rotation.z, -steer * 0.12, 9, dt)
    this.hitPulse = Math.max(0, this.hitPulse - dt)
  }

  hit(): void {
    this.hitPulse = 0.45
  }

  reset(): void {
    this.targetX = 0
    this.root.position.set(0, 0, 0)
    this.body.rotation.set(0, 0, 0)
    this.hitPulse = 0
    this.runPhase = 0
  }

  animate(dt: number, time: number, invulnerable: boolean): void {
    this.runPhase += dt * 10
    this.body.position.y = 0.04 + Math.abs(Math.sin(this.runPhase)) * 0.055
    this.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(this.runPhase + (i % 2 ? Math.PI : 0)) * 0.28
    })
    const flash = invulnerable && Math.floor(time * 14) % 2 === 0
    this.body.visible = !flash
    if (this.hitPulse > 0) {
      this.body.rotation.x = Math.sin(time * 38) * this.hitPulse * 0.22
      this.body.scale.setScalar(1 + this.hitPulse * 0.06)
    } else {
      this.body.rotation.x = 0
      this.body.scale.setScalar(1)
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
    add(sphere, fur, [0, 1.7, -0.63], [0.47, 0.45, 0.47])
    add(sphere, lightFur, [0, 1.53, -0.97], [0.31, 0.22, 0.29])
    add(sphere, dark, [0, 1.59, -1.2], [0.13, 0.105, 0.12])
    for (const side of [-1, 1]) {
      add(sphere, fur, [side * 0.34, 2.04, -0.69], [0.16, 0.18, 0.15])
      add(sphere, lightFur, [side * 0.34, 2.04, -0.72], [0.09, 0.105, 0.08])
      add(sphere, eye, [side * 0.2, 1.79, -1.02], [0.045, 0.055, 0.035])
      add(sphere, fur, [side * 0.51, 0.44, -0.48], [0.25, 0.42, 0.28])
      add(sphere, fur, [side * 0.51, 0.44, 0.56], [0.27, 0.43, 0.3])
    }
    add(sphere, fur, [0, 1.0, 1.0], [0.18, 0.18, 0.2])
    const legGeo = new THREE.CapsuleGeometry(0.17, 0.25, 4, 8)
    for (const [x, z] of [[-0.5, -0.48], [0.5, -0.48], [-0.5, 0.56], [0.5, 0.56]]) {
      const pivot = new THREE.Group()
      pivot.position.set(x, 0.58, z)
      const leg = new THREE.Mesh(legGeo, fur)
      leg.position.y = -0.18
      leg.castShadow = true
      pivot.add(leg)
      this.body.add(pivot)
      this.legs.push(pivot)
    }
  }
}
