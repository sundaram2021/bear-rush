import { afterEach, describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { Player } from '../src/game/player'
import { createRun, speedCap } from '../src/game/rules'
import { Terrain } from '../src/game/terrain'
import { tuning } from '../src/game/tuning'

const defaults = Object.fromEntries(tuning.controls.map(control => [control.id, control.default]))
afterEach(() => {
  tuning.apply(defaults)
  tuning.activate('run')
})

describe('mountain hunt tuning', () => {
  it('validates complete patches before committing and preserves source defaults', () => {
    const before = tuning.read()
    for (const patch of [{ 'run.maxSpeed': 4, 'camera.fov': 999 }, { 'run.speedRamp': 0.111 }, { 'player.accel': '20' }, { unknown: 4 }]) {
      expect(() => tuning.apply(patch)).toThrow()
      expect(tuning.read()).toEqual(before)
    }
    tuning.apply({ 'player.accel': 22 })
    expect(CONFIG.player.accel).toBe(22)
    expect(tuning.controls.find(c => c.id === 'player.accel')!.default).toBe(20)
  })

  it('holds next-run life and speed values until a new hunt starts', () => {
    tuning.apply({ 'run.lives': 4, 'run.baseSpeed': 6 })
    expect(CONFIG.run.lives).toBe(3)
    expect(createRun().lives).toBe(3)
    tuning.activate('run')
    expect(CONFIG.run.lives).toBe(4)
    expect(CONFIG.run.baseSpeed).toBe(6)
    expect(createRun().lives).toBe(4)
  })

  it('drives the bear across the terrain in the requested camera-relative direction', () => {
    const terrain = new Terrain()
    const player = new Player(terrain)
    const start = player.position.clone()
    for (let i = 0; i < 20; i += 1) player.step(1 / 60, { x: 0, y: 1 }, 0, false, speedCap(0))
    expect(player.position.z).toBeGreaterThan(start.z + 1)
    expect(Math.abs(player.position.y - terrain.height(player.position.x, player.position.z))).toBeLessThan(1.2)
  })

  it('requires the speed cap to be at least the base speed', () => {
    expect(() => tuning.apply({ 'run.baseSpeed': 10, 'run.maxSpeed': 10 })).not.toThrow()
    expect(() => tuning.apply({ 'run.baseSpeed': 12, 'run.maxSpeed': 10 })).toThrow()
  })
})

describe('hunt score eligibility', () => {
  it('ignores camera changes but marks gameplay changes when activated', () => {
    tuning.activate('run')
    tuning.apply({ 'camera.fov': 66 })
    expect(tuning.unranked).toBe(false)
    tuning.apply({ 'player.accel': 24 })
    expect(tuning.unranked).toBe(true)
    tuning.apply(defaults)
    expect(tuning.unranked).toBe(true)
    tuning.activate('run')
    expect(tuning.unranked).toBe(false)
  })
})
