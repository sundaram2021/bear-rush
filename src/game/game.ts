import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import type { Input } from '../engine/input'
import type { Renderer } from '../engine/renderer'
import type { Quality } from '../engine/save'
import { CONFIG } from './config'
import { Collectibles } from './collectibles'
import { Effects } from './fx'
import { Obstacles } from './obstacles'
import { Player } from './player'
import { collect, createRun, damage, fishInterval, obstacleInterval, riverSpeed, tick, type RunState } from './rules'
import { tuning } from './tuning'
import { World } from './world'

export type Mode = 'attract' | 'playing' | 'paused' | 'ended'
export type Hint = 'move' | 'avoid' | 'lives' | null
export type GameHooks = {
  popup(text: string, screen: { x: number; y: number }, kind: 'score' | 'hurt'): void
  hurt(): void
  hint(hint: Hint): void
  tutorialDone(): void
  end(run: RunState): void
}

/** One endless run: river speed and incoming fish rise over time; three tree hits exhaust the run. */
export class Game {
  mode: Mode = 'attract'
  run: RunState
  reducedMotion = false
  readonly player = new Player()
  readonly world = new World()
  readonly camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 240)
  private readonly fish = new Collectibles()
  private readonly obstacles = new Obstacles()
  private readonly fx = new Effects()
  private time = 0
  private nextFish = 0.8
  private nextObstacle = CONFIG.run.firstObstacleAt
  private gruntTimer = 2.4
  private tutorialTimer = 0
  private cameraShake = 0

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

  get speed(): number {
    return riverSpeed(this.run.elapsed)
  }

  start(tutorial: boolean): void {
    tuning.activate('run')
    this.player.reset()
    this.fish.reset()
    this.obstacles.reset()
    this.fx.clear()
    this.run = { ...createRun(), unranked: tuning.unranked }
    this.nextFish = 0.7
    this.nextObstacle = CONFIG.run.firstObstacleAt
    this.gruntTimer = 2.2
    this.tutorialTimer = tutorial ? 7 : 0
    this.mode = 'playing'
    this.input.endFrame()
    this.audio.unlock()
    this.audio.startRiver()
    this.hooks.hint(tutorial ? 'move' : null)
  }

  pause(): void {
    if (this.mode !== 'playing') return
    this.mode = 'paused'
    this.audio.pauseRiver()
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
    this.hooks.hint(null)
  }

  setQuality(quality: Quality): void {
    this.renderer.applyQuality(quality)
  }

  step(dt: number): void {
    if (this.mode !== 'playing') return
    const runSpeed = riverSpeed(this.run.elapsed)
    this.world.step(dt, runSpeed)
    this.player.step(dt, this.input.move.x)
    this.obstacles.step(dt, runSpeed)

    this.nextFish -= dt
    if (this.nextFish <= 0) {
      const lane = Math.floor(Math.random() * 3)
      const x = (lane - 1) * CONFIG.player.laneGap
      const faster = 1 + Math.min(0.42, this.run.elapsed / 170)
      this.fish.spawn(x, -CONFIG.run.spawnDistance, faster)
      if (this.run.elapsed > 24 && Math.random() < 0.28) {
        const secondLane = (lane + (Math.random() < 0.5 ? 1 : 2)) % 3
        this.fish.spawn((secondLane - 1) * CONFIG.player.laneGap, -CONFIG.run.spawnDistance - 7, faster)
      }
      this.nextFish = fishInterval(this.run.elapsed) * (0.88 + Math.random() * 0.24)
    }
    for (const at of this.fish.step(dt, runSpeed, this.player.x)) {
      const result = collect(this.run)
      this.run = result.state
      this.audio.play('eat')
      this.fx.burst(at, '#f07b45', 16, 4.5)
      this.hooks.popup(`+${result.points}`, this.project(at), 'score')
    }

    this.nextObstacle -= dt
    if (this.run.elapsed >= CONFIG.run.firstObstacleAt && this.nextObstacle <= 0) {
      const lanes = [0, 1, 2].sort(() => Math.random() - 0.5)
      const count = this.run.elapsed < 12 ? 1 : Math.random() < 0.5 ? 2 : 1
      this.obstacles.spawn(lanes.slice(0, count), -CONFIG.run.spawnDistance)
      this.nextObstacle = obstacleInterval(this.run.elapsed) * (0.92 + Math.random() * 0.16)
    }

    if (this.run.invulnerable <= 0 && this.obstacles.collides(this.player.x)) this.handleTreeCollision()
    this.run = tick(this.run, dt, runSpeed)
    this.gruntTimer -= dt
    if (this.gruntTimer <= 0) {
      this.audio.play('bear-grunt')
      this.gruntTimer = 5.5 + Math.random() * 4
    }
    if (this.tutorialTimer > 0) {
      this.tutorialTimer -= dt
      if (this.tutorialTimer <= 3.5) this.hooks.hint('avoid')
      if (this.tutorialTimer <= 0) {
        this.hooks.hint(null)
        this.hooks.tutorialDone()
      }
    }
  }

  render(_alpha: number, frameSeconds: number): void {
    this.time += frameSeconds
    this.world.update(frameSeconds)
    this.fx.update(frameSeconds)
    this.player.animate(frameSeconds, this.time, this.run.invulnerable > 0 && this.mode === 'playing')
    if (this.mode === 'attract') {
      this.camera.position.set(10 + Math.sin(this.time * 0.08) * 1.5, 7.5, 15)
      this.camera.lookAt(0, 0.7, -26)
    } else {
      this.setCamera(false, frameSeconds)
    }
    this.renderer.render(this.world.scene, this.camera)
  }

  private handleTreeCollision(): void {
    const result = damage(this.run)
    if (!result.hurt) return
    this.run = result.state
    this.player.hit()
    this.cameraShake = 0.55
    this.audio.play('collision')
    this.audio.play('life-loss')
    this.audio.play('bear-hit')
    this.hooks.hurt()
    this.hooks.popup(`−1 LIFE · ${this.run.lives} LEFT`, this.project(this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0))), 'hurt')
    this.fx.burst(this.player.position.clone().add(new THREE.Vector3(0, 0.8, -0.3)), '#d4a46e', 22, 6)
    if (this.run.phase === 'lost') {
      this.mode = 'ended'
      this.audio.stopRiver()
      this.audio.play('lose')
      this.hooks.hint(null)
      this.hooks.end(this.run)
    }
  }

  private setCamera(snap: boolean, dt = 1 / 60): void {
    const fov = CONFIG.camera.fov
    if (this.camera.fov !== fov) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
    const x = this.player.x * 0.42
    const wanted = new THREE.Vector3(x, CONFIG.camera.height, CONFIG.camera.distance)
    if (snap) this.camera.position.copy(wanted)
    else this.camera.position.lerp(wanted, 1 - Math.exp(-CONFIG.camera.follow * dt))
    const aim = new THREE.Vector3(this.player.x * 0.2, 0.75, -18)
    this.camera.lookAt(aim)
    if (this.cameraShake > 0 && !this.reducedMotion) {
      const s = this.cameraShake * this.cameraShake * 0.28
      this.camera.position.x += (Math.random() - 0.5) * s
      this.camera.position.y += (Math.random() - 0.5) * s
    }
    this.cameraShake = Math.max(0, this.cameraShake - dt * 2.4)
  }

  private project(world: THREE.Vector3): { x: number; y: number } {
    const v = world.clone().project(this.camera)
    const canvas = this.renderer.canvas
    return { x: ((v.x + 1) / 2) * canvas.clientWidth, y: ((1 - v.y) / 2) * canvas.clientHeight }
  }
}
