import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import type { Input } from '../engine/input'
import type { Renderer } from '../engine/renderer'
import type { Quality } from '../engine/save'
import { CONFIG, type FoodKind } from './config'
import { FoodField } from './food'
import { Effects } from './fx'
import { HazardField } from './hazards'
import { Player } from './player'
import { createRun, eatFood, loseLife, speedCap, tick, type LoseReason, type RunState } from './rules'
import { tuning } from './tuning'
import { World } from './world'

export type Mode = 'attract' | 'playing' | 'paused' | 'ended'
export type Hint = 'move' | 'sprint' | 'hunt' | 'hazards' | null
export type GameHooks = {
  popup(text: string, screen: { x: number; y: number }, kind: 'score' | 'hurt'): void
  hurt(): void
  hint(hint: Hint): void
  tutorialDone(): void
  end(run: RunState): void
}

const FOOD_WEIGHTS: Array<[FoodKind, number]> = [
  ['salmon', 0.24], ['honey', 0.12], ['fawn', 0.2], ['deer', 0.2], ['elk', 0.14], ['moose', 0.1],
]
const FOOD_COLOR: Record<FoodKind, string> = {
  salmon: '#f07b45', honey: '#f2bf4a', fawn: '#c79a5c', deer: '#b07c46', elk: '#d3ac72', moose: '#6b4a30',
}

/** The bear roams a whole mountain valley, hunting wildlife and dodging poison, traps and the crevasse. */
export class Game {
  mode: Mode = 'attract'
  run: RunState = createRun()
  reducedMotion = false
  readonly world = new World()
  readonly player = new Player(this.world.terrain)
  readonly camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 900)
  private readonly food = new FoodField()
  private readonly hazards = new HazardField()
  private readonly fx = new Effects()
  private time = 0
  private winter = 0
  private foodTimer = 0
  private hazardTimer = CONFIG.run.firstHazardAt
  private roarTimer = 8
  private stepPhase = 0
  private tutorialTimer = 0
  private cameraShake = 0
  private camYaw = Math.PI
  private camPitch = 0
  private lookIdle = 0
  private readonly safePoint = new THREE.Vector3(6, 0, 0)
  private readonly rng = mulberry(90210)

  constructor(
    private readonly renderer: Renderer,
    private readonly input: Input,
    private readonly audio: Audio,
    private readonly hooks: GameHooks,
  ) {
    this.world.scene.add(this.player.root, this.food.group, this.hazards.group, this.fx.mesh)
    this.setCamera(true)
  }

  get speed(): number { return this.player.speed }
  get snowfall(): number { return this.winter }

  start(tutorial: boolean): void {
    tuning.activate('run')
    this.player.reset()
    this.food.reset()
    this.hazards.reset()
    this.fx.clear()
    this.run = { ...createRun(), unranked: tuning.unranked }
    this.winter = 0
    this.world.setWinter(0)
    this.foodTimer = 0
    this.hazardTimer = CONFIG.run.firstHazardAt
    this.roarTimer = 6 + Math.random() * 4
    this.stepPhase = 0
    this.tutorialTimer = tutorial ? 12 : 0
    this.safePoint.copy(this.player.position)
    this.camYaw = this.player.heading
    this.camPitch = 0
    this.lookIdle = 0
    this.mode = 'playing'
    this.input.endFrame()
    this.audio.unlock()
    this.audio.startAmbience()
    this.seed()
    this.hooks.hint(tutorial ? 'move' : null)
  }

  pause(): void {
    if (this.mode !== 'playing') return
    this.mode = 'paused'
    this.audio.pauseAmbience()
  }

  resume(): void {
    if (this.mode !== 'paused') return
    this.mode = 'playing'
    this.audio.unlock()
    this.audio.resumeAmbience()
    this.input.endFrame()
  }

  toTitle(): void {
    this.mode = 'attract'
    this.audio.stopAmbience()
    this.hooks.hint(null)
  }

  setQuality(quality: Quality): void { this.renderer.applyQuality(quality) }

  step(dt: number): void {
    if (this.mode !== 'playing') return
    const terrain = this.world.terrain
    const cap = speedCap(this.run.elapsed)
    const sprint = this.input.held('sprint')
    this.player.step(dt, this.input.move, this.camYaw, sprint, cap)
    this.food.step(dt, this.player.position, terrain)
    this.hazards.step(dt, terrain)

    if (this.input.consume('eat') && this.player.startPounce()) {
      this.audio.play('dash')
      this.fx.puff(this.player.position.clone().setY(this.player.position.y + 0.2), 0.5)
    }

    const beforeSpawn = this.run.elapsed
    this.foodTimer -= dt
    if (this.foodTimer <= 0 && this.food.count < 26) {
      const kind = this.pickFood()
      this.food.spawn(kind, terrain, this.player.position, this.rng, CONFIG.run.spawnRadius)
      if (this.run.elapsed > 12 && Math.random() < 0.5) {
        this.food.spawn(this.pickFood(), terrain, this.player.position, this.rng, CONFIG.run.spawnRadius * 1.2)
      }
      this.foodTimer = Math.max(1.6, 4.2 - beforeSpawn * 0.02)
    }
    this.hazardTimer -= dt
    if (beforeSpawn >= CONFIG.run.firstHazardAt && this.hazardTimer <= 0) {
      const kind = Math.random() < 0.55 ? 'trap' : 'poison'
      this.hazards.spawn(kind, terrain, this.player.position, this.rng, 55)
      this.hazardTimer = Math.max(2.4, 6.5 - beforeSpawn * 0.02)
    }
    this.food.cull(this.player.position, CONFIG.run.despawnRadius)
    this.hazards.cull(this.player.position, CONFIG.run.despawnRadius)

    this.resolveEating()
    if (this.run.phase === 'playing') this.resolveHazards()
    if (this.run.phase === 'playing') this.updateSafeGround(dt)

    const current = this.player.speed
    this.run = tick(this.run, dt, current)
    this.winter = 0.5 - 0.5 * Math.cos((this.run.elapsed / CONFIG.world.seasonPeriod) * Math.PI * 2)
    this.world.setWinter(this.winter)

    this.stepPhase += current * dt
    if (current > 1.2 && this.stepPhase > 0.62) {
      this.stepPhase = 0
      this.audio.play('step')
    }
    this.roarTimer -= dt
    if (this.roarTimer <= 0) {
      this.player.roar()
      this.audio.play('roar')
      this.roarTimer = 9 + Math.random() * 8
    }

    if (this.tutorialTimer > 0) {
      this.tutorialTimer -= dt
      if (this.tutorialTimer <= 9) this.hooks.hint('sprint')
      if (this.tutorialTimer <= 6) this.hooks.hint('hunt')
      if (this.tutorialTimer <= 3) this.hooks.hint('hazards')
      if (this.tutorialTimer <= 0) {
        this.hooks.hint(null)
        this.hooks.tutorialDone()
      }
    }
  }

  render(_alpha: number, frameSeconds: number): void {
    this.time += frameSeconds
    this.world.update(frameSeconds, this.player.position)
    this.fx.update(frameSeconds)
    this.player.animate(frameSeconds, this.time)
    this.setCamera(this.mode === 'attract', frameSeconds)
    this.renderer.render(this.world.scene, this.camera)
  }

  private resolveEating(): void {
    const contact = this.food.collect(this.player.position)
    if (!contact) return
    const result = eatFood(this.run, contact.kind)
    this.run = result.state
    this.player.eat()
    this.audio.play(eatSound(contact.kind))
    this.fx.burst(contact.position, FOOD_COLOR[contact.kind], 16, 3.6)
    this.hooks.popup(`+${result.points}  ${contact.kind.toUpperCase()}`, this.project(contact.position), 'score')
  }

  private resolveHazards(): void {
    const terrain = this.world.terrain
    const p = this.player.position
    if (terrain.trenchDepth(p.x, p.z) > 4.5) {
      this.damage('fall', 'FELL INTO THE CREVASSE', p)
      return
    }
    const contact = this.hazards.contact(p)
    if (contact) {
      const reason: LoseReason = contact.kind === 'trap' ? 'trap' : 'poison'
      this.damage(reason, contact.kind === 'trap' ? 'SNAPPED IN A TRAP' : 'ATE POISONOUS FORAGE', contact.position)
    }
  }

  private damage(reason: LoseReason, label: string, at: THREE.Vector3): void {
    this.player.hurt()
    this.hooks.hurt()
    this.cameraShake = 0.42
    const result = loseLife(this.run, reason)
    this.run = result.state
    this.audio.play(reason === 'fall' ? 'slip' : reason === 'trap' ? 'trap' : 'poison')
    this.audio.play('life-loss')
    this.audio.play('bear-hit')
    this.fx.burst(at, reason === 'poison' ? '#b0416f' : '#b8865a', 22, 4)
    this.hooks.popup(`${label} · −1 LIFE`, this.project(at), 'hurt')
    if (reason === 'fall') this.player.teleport(this.safePoint.x, this.safePoint.z)
    if (this.run.phase === 'lost') this.finishRun()
  }

  private updateSafeGround(dt: number): void {
    void dt
    const p = this.player.position
    const t = this.world.terrain
    if (t.trenchDepth(p.x, p.z) < 0.5 && t.slope(p.x, p.z) < 0.85 && !t.isWater(p.x, p.z)) {
      this.safePoint.copy(p)
    }
  }

  private pickFood(): FoodKind {
    const roll = Math.random()
    let acc = 0
    for (const [kind, weight] of FOOD_WEIGHTS) {
      acc += weight
      if (roll <= acc) return kind
    }
    return 'deer'
  }

  private seed(): void {
    const terrain = this.world.terrain
    for (let i = 0; i < 22; i += 1) this.food.spawn(this.pickFood(), terrain, this.player.position, this.rng, CONFIG.run.spawnRadius)
    for (let i = 0; i < 6; i += 1) this.hazards.spawn(i % 2 === 0 ? 'trap' : 'poison', terrain, this.player.position, this.rng, 70)
  }

  private finishRun(): void {
    if (this.mode === 'ended') return
    this.mode = 'ended'
    this.audio.stopAmbience()
    this.audio.play('lose')
    this.player.hurt()
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
    const terrain = this.world.terrain

    const look = this.input.takeLook()
    if (Math.abs(look.x) > 0.0001 || Math.abs(look.y) > 0.0001) {
      this.camYaw -= look.x
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + look.y, -0.25, 0.85)
      this.lookIdle = 0
    } else {
      this.lookIdle += dt
    }
    if (this.player.speed > 1.2 && this.lookIdle > 0.8 && this.mode === 'playing') {
      this.camYaw = dampAngle(this.camYaw, this.player.heading, 1.6, dt)
    }

    const forward = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw))
    const distance = CONFIG.camera.distance * (this.mode === 'attract' ? 1.35 : 1)
    const target = new THREE.Vector3(p.x, p.y + 1.5, p.z)
    const wanted = target.clone()
      .addScaledVector(forward, -distance)
      .add(new THREE.Vector3(0, CONFIG.camera.height + this.camPitch * distance * 1.4, 0))
    const minY = terrain.height(wanted.x, wanted.z) + 0.9
    if (wanted.y < minY) wanted.y = minY
    if (snap) this.camera.position.copy(wanted)
    else this.camera.position.lerp(wanted, 1 - Math.exp(-CONFIG.camera.follow * dt))
    this.camera.lookAt(target)
    if (this.cameraShake > 0 && !this.reducedMotion) {
      const s = this.cameraShake * this.cameraShake * 0.24
      this.camera.position.x += Math.sin(this.time * 52) * s
      this.camera.position.y += Math.cos(this.time * 45) * s * 0.55
    }
    this.cameraShake = Math.max(0, this.cameraShake - dt * 2.6)
  }

  private project(world: THREE.Vector3): { x: number; y: number } {
    const v = world.clone().project(this.camera)
    const canvas = this.renderer.canvas
    return { x: ((v.x + 1) / 2) * canvas.clientWidth, y: ((1 - v.y) / 2) * canvas.clientHeight }
  }
}

function eatSound(kind: FoodKind): 'fish-catch' | 'eat-honey' | 'eat-meat' {
  if (kind === 'salmon') return 'fish-catch'
  if (kind === 'honey') return 'eat-honey'
  return 'eat-meat'
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI
  if (delta < -Math.PI) delta += Math.PI * 2
  return current + delta * (1 - Math.exp(-lambda * dt))
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
