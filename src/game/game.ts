import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import type { Input } from '../engine/input'
import type { Renderer } from '../engine/renderer'
import type { Quality } from '../engine/save'
import { CONFIG, FOOD_LABELS } from './config'
import { Effects } from './fx'
import { FoodField, type WildlifeTrack } from './food'
import { HazardField } from './hazards'
import { Player } from './player'
import { createRun, eatFood, loseLife, speedCap, tick, type LoseReason, type RunState } from './rules'
import { tuning } from './tuning'
import { World } from './world'
import type { Terrain } from './terrain'

export type Mode = 'attract' | 'playing' | 'paused' | 'ended'
export type Hint = 'move' | 'hunt' | 'dangers' | null
export type MapSnapshot = { x: number; z: number; heading: number; radius: number; wind: { x: number; z: number }; terrain: Terrain; tracks: WildlifeTrack[] }
export type GameHooks = {
  popup(text: string, screen: { x: number; y: number }, kind: 'score' | 'hurt'): void
  hurt(): void
  hint(hint: Hint): void
  tutorialDone(): void
  end(run: RunState): void
}

/** Third-person mountain hunter. The global world can be traversed without a board edge. */
export class Game {
  mode: Mode = 'attract'
  run: RunState
  reducedMotion = false
  readonly world = new World()
  readonly player = new Player(this.world)
  readonly camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 520)
  readonly food = new FoodField()
  readonly hazards = new HazardField()
  private readonly fx = new Effects()
  private time = 0
  private nextFood = CONFIG.hunt.foodSpawnMinSeconds
  private nextHazard = 7
  private tutorialTimer = 0
  private recoveryTimer = 0
  private invulnerabilityTimer = 0
  private pantTimer = 0
  private cameraShake = 0
  private cameraYaw = 0
  private cameraPitch = CONFIG.camera.pitch

  constructor(
    private readonly renderer: Renderer,
    private readonly input: Input,
    private readonly audio: Audio,
    private readonly hooks: GameHooks,
  ) {
    this.world.scene.add(this.player.root, this.food.group, this.hazards.group, this.fx.mesh)
    this.run = createRun()
    this.food.spawnInitial(this.player.position, this.world.terrain)
    this.setCamera(true)
  }

  get speed(): number { return this.player.speed }
  get stamina(): number { return this.player.stamina }
  get speedLimit(): number { return speedCap(this.run.elapsed) }
  get weather(): 'Clear' | 'Changing' | 'Snowing' { return this.world.weatherLabel }
  get mapSnapshot(): MapSnapshot {
    const wind = this.world.windVector()
    return { x: this.player.position.x, z: this.player.position.z, heading: this.player.root.rotation.y,
      radius: CONFIG.hunt.trackingRadius, wind: { x: wind.x, z: wind.z }, terrain: this.world.terrain, tracks: this.food.tracks(this.player.position) }
  }

  start(tutorial: boolean): void {
    tuning.activate('run')
    this.player.reset()
    this.world.update(0, this.player.position)
    this.food.reset()
    this.hazards.reset()
    this.fx.clear()
    this.run = { ...createRun(), unranked: tuning.unranked }
    this.food.spawnInitial(this.player.position, this.world.terrain)
    this.nextFood = 8 + Math.random() * 5
    this.nextHazard = 9
    this.tutorialTimer = tutorial ? 15 : 0
    this.recoveryTimer = 0
    this.invulnerabilityTimer = 0
    this.pantTimer = 0
    this.cameraYaw = 0
    this.cameraPitch = CONFIG.camera.pitch
    this.mode = 'playing'
    this.input.endFrame()
    this.audio.unlock()
    this.audio.startForest()
    this.hooks.hint(tutorial ? 'move' : null)
  }

  pause(): void {
    if (this.mode !== 'playing') return
    this.mode = 'paused'
    this.audio.pauseForest()
  }

  resume(): void {
    if (this.mode !== 'paused') return
    this.mode = 'playing'
    this.audio.unlock()
    this.audio.resumeForest()
    this.input.endFrame()
  }

  toTitle(): void {
    this.mode = 'attract'
    this.audio.stopForest()
    this.hooks.hint(null)
  }

  setQuality(quality: Quality): void { this.renderer.applyQuality(quality) }

  step(dt: number): void {
    if (this.mode !== 'playing') return
    const look = this.input.takeLook()
    this.cameraYaw -= look.x
    this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch + look.y, 0.04, 0.52)
    this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - dt)
    if (this.recoveryTimer > 0) {
      this.recoveryTimer -= dt
      this.player.animate(dt, this.time)
      if (this.recoveryTimer <= 0 && this.run.phase === 'playing') this.player.respawn()
      this.run = tick(this.run, dt, 0)
      return
    }

    const pounce = this.input.consume('catch')
    const pounceStarted = this.player.step(
      dt, this.input.move.x, this.input.move.y, this.speedLimit,
      this.input.held('sprint'), this.cameraYaw, pounce, this.input.held('stalk'),
    )
    this.pantTimer -= dt
    if (this.player.sprinting && this.player.stamina < 0.43 && this.pantTimer <= 0) {
      this.audio.play('pant')
      this.pantTimer = 2.25
    }
    if (pounceStarted) {
      this.audio.play('hunt')
      this.fx.burst(this.player.position.clone().add(new THREE.Vector3(0, 0.8, -0.4)), '#d6b57a', 7, 1.4)
    }
    this.player.animate(dt, this.time)
    this.playFootfalls()
    this.food.step(dt, this.player.position, this.world.terrain, this.world.windVector(), this.player.speed, this.player.stalking, this.player.forward)
    if (this.food.consumeAlert()) this.audio.play('wildlife-alert')
    this.hazards.step(dt, this.world.terrain, this.player.position)
    this.run = tick(this.run, dt, this.player.speed)

    const contact = this.food.collectNearby(this.player.position, this.player.pouncing, this.player.forward, this.player.speed)
    if (contact) this.collectFood(contact.kind, contact.position)
    const missed = this.food.consumeMissedHunt()
    if (missed) this.audio.play('hunt-miss')

    this.nextFood -= dt
    if (this.nextFood <= 0 && this.food.count < CONFIG.run.maxFood) {
      this.food.spawnAround(this.pickFood(), this.player.position, this.world.terrain)
      this.nextFood = CONFIG.hunt.foodSpawnMinSeconds + Math.random() * (CONFIG.hunt.foodSpawnMaxSeconds - CONFIG.hunt.foodSpawnMinSeconds)
    }

    this.nextHazard -= dt
    if (this.nextHazard <= 0 && this.hazards.count < CONFIG.run.maxHazards) {
      const kind = Math.random() < 0.56 ? 'poison' : 'trap'
      const point = this.findSafePoint(34 + Math.random() * 47)
      if (point) this.hazards.spawn(kind, point, this.world.terrain)
      this.nextHazard = 12 + Math.random() * 9
    }

    const hazard = this.hazards.collisions(this.player.position)[0]
    if (hazard) this.resolveDanger(hazard.kind, hazard.position)
    else if (this.world.terrain.isInTrench(this.player.position.x, this.player.position.z)) {
      this.resolveDanger('fall', this.player.position.clone())
    }

    if (this.tutorialTimer > 0) {
      this.tutorialTimer -= dt
      if (this.tutorialTimer <= 10) this.hooks.hint('hunt')
      if (this.tutorialTimer <= 4.5) this.hooks.hint('dangers')
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
    if (this.mode !== 'playing') this.player.animate(frameSeconds, this.time)
    this.setCamera(this.mode === 'attract', frameSeconds)
    this.renderer.render(this.world.scene, this.camera)
  }

  private playFootfalls(): void {
    const count = this.player.consumeFootfalls()
    if (this.player.speed < 0.8) return
    const sample = this.world.terrain.sample(this.player.position.x, this.player.position.z)
    const sound = sample.snowMask + this.world.weatherIntensity > 0.94 ? 'snow-step' : 'footstep'
    for (let i = 0; i < Math.min(count, 2); i += 1) this.audio.play(sound)
  }

  private collectFood(kind: keyof typeof FOOD_LABELS, at: THREE.Vector3): void {
    const result = eatFood(this.run, kind)
    this.run = result.state
    this.audio.play(kind === 'honey' ? 'forage' : kind === 'salmon' ? 'fish-catch' : 'bear-catch')
    if (kind !== 'honey') this.audio.play('bear-grunt')
    const color = kind === 'honey' ? '#e6b84e' : kind === 'salmon' ? '#e88c68' : '#c9a87b'
    this.fx.burst(at, color, kind === 'honey' ? 12 : 18, 3.3)
    this.hooks.popup(`+${result.points} · ${FOOD_LABELS[kind].toUpperCase()}`, this.project(at), 'score')
  }

  private resolveDanger(reason: LoseReason, at: THREE.Vector3): void {
    if (this.invulnerabilityTimer > 0 || this.run.phase !== 'playing') return
    const result = loseLife(this.run, reason)
    if (!result.lifeLost) return
    this.run = result.state
    this.player.hit()
    if (reason === 'fall') this.player.root.position.y = at.y - 1.1
    this.invulnerabilityTimer = CONFIG.run.invulnerabilitySeconds
    this.recoveryTimer = this.run.phase === 'playing' ? CONFIG.run.recoverySeconds : 0
    this.hooks.hurt()
    this.cameraShake = 0.38
    const copy = reason === 'poison' ? 'POISONOUS FOOD · −1 LIFE'
      : reason === 'trap' ? 'BEAR TRAP · −1 LIFE' : 'SLIPPED INTO THE TRENCH · −1 LIFE'
    this.audio.play(reason === 'poison' ? 'poison' : reason === 'trap' ? 'trap' : 'fall')
    this.audio.play('life-loss')
    this.audio.play('bear-hit')
    this.fx.burst(at, reason === 'poison' ? '#954d72' : reason === 'trap' ? '#a9aa9b' : '#8b8174', 16, 3.2)
    this.hooks.popup(copy, this.project(at), 'hurt')
    if (this.run.phase === 'lost') this.finishRun()
  }

  private finishRun(): void {
    if (this.mode === 'ended') return
    this.mode = 'ended'
    this.audio.stopForest()
    this.audio.play('lose')
    this.hooks.hint(null)
    this.hooks.end(this.run)
  }

  private pickFood(): keyof typeof FOOD_LABELS {
    const roll = Math.random()
    if (roll < 0.19) return 'salmon'
    if (roll < 0.33) return 'honey'
    if (roll < 0.53) return 'fawn'
    if (roll < 0.78) return 'deer'
    if (roll < 0.94) return 'elk'
    return 'moose'
  }

  private findSafePoint(distance: number): THREE.Vector3 | null {
    for (let attempt = 0; attempt < 42; attempt += 1) {
      const angle = Math.random() * Math.PI * 2
      const x = this.player.position.x + Math.cos(angle) * distance
      const z = this.player.position.z + Math.sin(angle) * distance
      if (this.world.terrain.isSafeSurface(x, z) && Math.abs(x - this.world.terrain.riverX(z)) > 8) {
        return new THREE.Vector3(x, this.world.terrain.heightAt(x, z), z)
      }
    }
    return null
  }

  private setCamera(snap: boolean, dt = 1 / 60): void {
    if (this.camera.fov !== CONFIG.camera.fov) {
      this.camera.fov = CONFIG.camera.fov
      this.camera.updateProjectionMatrix()
    }
    const p = this.player.position
    const orbit = this.mode === 'attract' ? Math.sin(this.time * 0.12) * 0.18 : 0
    const distance = CONFIG.camera.distance
    const backX = Math.sin(this.cameraYaw) * distance
    const backZ = Math.cos(this.cameraYaw) * distance
    const height = CONFIG.camera.height + Math.sin(this.cameraPitch) * 2.5
    const wanted = new THREE.Vector3(p.x + backX + orbit, p.y + height, p.z + backZ)
    if (snap) this.camera.position.copy(wanted)
    else this.camera.position.lerp(wanted, 1 - Math.exp(-CONFIG.camera.follow * dt))
    const aimX = p.x - Math.sin(this.cameraYaw) * 3.4
    const aimZ = p.z - Math.cos(this.cameraYaw) * 3.4
    this.camera.lookAt(aimX, p.y + 1.35, aimZ)
    if (this.cameraShake > 0 && !this.reducedMotion) {
      const s = this.cameraShake * this.cameraShake * 0.19
      this.camera.position.x += Math.sin(this.time * 48) * s
      this.camera.position.y += Math.cos(this.time * 41) * s * 0.48
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.8)
    }
  }

  private project(world: THREE.Vector3): { x: number; y: number } {
    const v = world.clone().project(this.camera)
    return { x: ((v.x + 1) / 2) * this.renderer.canvas.clientWidth, y: ((1 - v.y) / 2) * this.renderer.canvas.clientHeight }
  }
}
