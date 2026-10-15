import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import type { Input } from '../engine/input'
import type { Renderer } from '../engine/renderer'
import type { Quality } from '../engine/save'
import { CONFIG } from './config'
import { Collectibles } from './collectibles'
import { Effects } from './fx'
import { Obstacles, type HazardContact } from './obstacles'
import { Player } from './player'
import { collect, createRun, eatAlgae, fishInterval, hazardInterval, hitSmallBlock, riverSpeed, tick, type RunState } from './rules'
import { tuning } from './tuning'
import { World } from './world'

export type Mode = 'attract' | 'playing' | 'paused' | 'ended'
export type Hint = 'move' | 'catch' | 'hazards' | null
export type GameHooks = {
  popup(text: string, screen: { x: number; y: number }, kind: 'score' | 'hurt'): void
  hurt(): void
  hint(hint: Hint): void
  catchReady(ready: boolean): void
  tutorialDone(): void
  end(run: RunState): void
}

/** A bear hunts from a riverbank; fish/leaves follow the actual curved, uneven stream. */
export class Game {
  mode: Mode = 'attract'
  run: RunState
  reducedMotion = false
  readonly world = new World()
  readonly player = new Player(this.world)
  readonly camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 280)
  private readonly fish = new Collectibles()
  private readonly obstacles = new Obstacles()
  private readonly fx = new Effects()
  private time = 0
  private nextFish = 0.75
  private nextHazard = CONFIG.run.firstHazardAt
  private gruntTimer = 4.5
  private tutorialTimer = 0
  private cameraShake = 0
  private catchReadyState = false

  constructor(
    private readonly renderer: Renderer,
    private readonly input: Input,
    private readonly audio: Audio,
    private readonly hooks: GameHooks,
  ) {
    this.world.scene.add(this.player.root, this.fish.group, this.obstacles.group, this.fx.mesh)
    this.run = createRun()
    this.setCamera(true)
  }

  get speed(): number { return riverSpeed(this.run.elapsed) }

  start(tutorial: boolean): void {
    tuning.activate('run')
    this.player.reset()
    this.fish.reset()
    this.obstacles.reset()
    this.fx.clear()
    this.run = { ...createRun(), unranked: tuning.unranked }
    this.nextFish = 0.65
    this.nextHazard = CONFIG.run.firstHazardAt
    this.gruntTimer = 3 + Math.random() * 2
    this.tutorialTimer = tutorial ? 11 : 0
    this.mode = 'playing'
    this.catchReadyState = false
    this.hooks.catchReady(false)
    this.input.endFrame()
    this.audio.unlock()
    this.audio.startRiver()
    this.hooks.hint(tutorial ? 'move' : null)
  }

  pause(): void {
    if (this.mode !== 'playing') return
    this.mode = 'paused'
    this.audio.pauseRiver()
    this.hooks.catchReady(false)
  }

  resume(): void {
    if (this.mode !== 'paused') return
    this.mode = 'playing'
    this.audio.unlock()
    this.audio.resumeRiver()
    this.input.endFrame()
  }

  toTitle(): void {
    this.mode = 'attract'
    this.audio.stopRiver()
    this.catchReadyState = false
    this.hooks.catchReady(false)
    this.hooks.hint(null)
  }

  setQuality(quality: Quality): void { this.renderer.applyQuality(quality) }

  step(dt: number): void {
    if (this.mode !== 'playing') return
    const current = riverSpeed(this.run.elapsed)
    this.player.step(dt, this.input.move.x, this.input.move.y)
    this.fish.step(dt, current * (1 + Math.min(0.35, this.run.elapsed / 170)), this.world, this.player.z)
    this.obstacles.step(dt, current, this.world, this.player.z)

    this.nextFish -= dt
    if (this.nextFish <= 0) {
      const nearBank = Math.random() < 0.78
      const offset = nearBank ? 2.8 + Math.random() * 1.15 : (Math.random() - 0.5) * 5.6
      this.fish.spawn(this.player.z - CONFIG.run.spawnDistance, offset, 1)
      if (this.run.elapsed > 20 && Math.random() < 0.24) {
        this.fish.spawn(this.player.z - CONFIG.run.spawnDistance - 4.5, offset + (Math.random() < 0.5 ? -1.3 : 1.3), 1.04)
      }
      this.nextFish = fishInterval(this.run.elapsed) * (0.88 + Math.random() * 0.24)
    }

    this.nextHazard -= dt
    if (this.run.elapsed >= CONFIG.run.firstHazardAt && this.nextHazard <= 0) {
      const kind = Math.random() < 0.27 ? 'algae' : 'block'
      const nearBank = Math.random() < 0.62
      const offset = nearBank ? 3.4 + Math.random() * 1.15 : (Math.random() - 0.5) * 7.2
      const z = this.player.z - CONFIG.run.spawnDistance * 0.82
      this.obstacles.spawn(kind, z, offset)
      if (kind === 'block' && this.run.elapsed > 24 && Math.random() < 0.22) {
        this.obstacles.spawn('block', z - 5.5, offset + (Math.random() < 0.5 ? -0.55 : 0.55))
      }
      this.nextHazard = hazardInterval(this.run.elapsed) * (0.9 + Math.random() * 0.2)
    }

    const ready = this.fish.isCatchReady(this.player.position)
    if (ready !== this.catchReadyState) {
      this.catchReadyState = ready
      this.hooks.catchReady(ready)
    }
    if (this.input.consume('catch')) this.tryCatch()

    for (const contact of this.obstacles.collisions(this.player.position)) {
      this.resolveHazard(contact)
      if (this.run.phase === 'lost') break
    }

    this.run = tick(this.run, dt, current)
    this.gruntTimer -= dt
    if (this.gruntTimer <= 0) {
      this.audio.play('bear-grunt')
      this.gruntTimer = 7.5 + Math.random() * 5
    }
    if (this.tutorialTimer > 0) {
      this.tutorialTimer -= dt
      if (this.tutorialTimer <= 7.2) this.hooks.hint('catch')
      if (this.tutorialTimer <= 3.6) this.hooks.hint('hazards')
      if (this.tutorialTimer <= 0) {
        this.hooks.hint(null)
        this.hooks.tutorialDone()
      }
    }
  }

  render(_alpha: number, frameSeconds: number): void {
    this.time += frameSeconds
    this.world.update(frameSeconds, this.speed)
    this.fx.update(frameSeconds)
    this.player.animate(frameSeconds, this.time)
    this.setCamera(this.mode === 'attract', frameSeconds)
    this.renderer.render(this.world.scene, this.camera)
  }

  private tryCatch(): void {
    this.player.catch()
    const at = this.fish.catchNearest(this.player.position)
    if (!at) {
      this.audio.play('miss')
      return
    }
    const result = collect(this.run)
    this.run = result.state
    this.audio.play('fish-catch')
    this.audio.play('bear-catch')
    this.fx.burst(at, '#f07b45', 18, 4.2)
    this.hooks.popup(`+${result.points}`, this.project(at), 'score')
  }

  private resolveHazard(contact: HazardContact): void {
    this.player.hit()
    this.hooks.hurt()
    if (contact.kind === 'block') {
      const result = hitSmallBlock(this.run)
      this.run = result.state
      this.audio.play('block-hit')
      this.fx.burst(contact.position, '#bd895f', 12, 3.2)
      if (result.lifeLost) {
        this.audio.play('life-loss')
        this.audio.play('bear-hit')
        this.hooks.popup(`−1 LIFE · ${this.run.lives} LEFT`, this.project(contact.position), 'hurt')
      } else {
        this.hooks.popup(`WOOD · ${result.strike}/2`, this.project(contact.position), 'hurt')
      }
    } else {
      const result = eatAlgae(this.run)
      this.run = result.state
      this.audio.play('algae')
      this.audio.play('life-loss')
      this.audio.play('bear-hit')
      this.fx.burst(contact.position, '#84bb50', 20, 3.8)
      this.hooks.popup(`HARMFUL ALGAE · −1 LIFE`, this.project(contact.position), 'hurt')
    }
    this.cameraShake = 0.34
    if (this.run.phase === 'lost') this.finishRun()
  }

  private finishRun(): void {
    if (this.mode === 'ended') return
    this.mode = 'ended'
    this.audio.stopRiver()
    this.audio.play('lose')
    this.catchReadyState = false
    this.hooks.catchReady(false)
    this.hooks.hint(null)
    this.hooks.end(this.run)
  }

  private setCamera(snap: boolean, dt = 1 / 60): void {
    const fov = CONFIG.camera.fov
    if (this.camera.fov !== fov) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
    const p = this.player.position
    const orbit = Math.sin(this.time * 0.12) * 0.32
    const wanted = new THREE.Vector3(p.x + 8.6 + orbit, p.y + CONFIG.camera.height, p.z + CONFIG.camera.distance)
    if (snap) this.camera.position.copy(wanted)
    else this.camera.position.lerp(wanted, 1 - Math.exp(-CONFIG.camera.follow * dt))
    const aim = this.world.riverPoint(p.z - 17, 0, 1.15)
    this.camera.lookAt(aim)
    if (this.cameraShake > 0 && !this.reducedMotion) {
      const s = this.cameraShake * this.cameraShake * 0.22
      this.camera.position.x += Math.sin(this.time * 50) * s
      this.camera.position.y += Math.cos(this.time * 43) * s * 0.55
    }
    this.cameraShake = Math.max(0, this.cameraShake - dt * 2.8)
  }

  private project(world: THREE.Vector3): { x: number; y: number } {
    const v = world.clone().project(this.camera)
    const canvas = this.renderer.canvas
    return { x: ((v.x + 1) / 2) * canvas.clientWidth, y: ((1 - v.y) / 2) * canvas.clientHeight }
  }
}
