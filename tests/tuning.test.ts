import { afterEach, describe, expect, it } from 'vitest'
import { CONFIG, DEFAULT_CONFIG } from '../src/game/config'
import { Player } from '../src/game/player'
import { createRun } from '../src/game/rules'
import { tuning } from '../src/game/tuning'
import { World } from '../src/game/world'

const defaults = Object.fromEntries(tuning.controls.map(control => [control.id, control.default]))
afterEach(() => {
  tuning.apply(defaults)
  tuning.activate('run')
})

describe('river fishing tuning', () => {
  it('validates complete patches before committing and preserves source defaults', () => {
    const before = tuning.read()
    for (const patch of [{ 'run.maxSpeed': 7, 'camera.fov': 999 }, { 'run.speedRamp': 0.011 }, { 'player.moveSpeed': '8' }, { unknown: 4 }]) {
      expect(() => tuning.apply(patch)).toThrow()
      expect(tuning.read()).toEqual(before)
    }
    tuning.apply({ 'player.moveSpeed': 5.5 })
    expect(CONFIG.player.moveSpeed).toBe(5.5)
    expect(DEFAULT_CONFIG.player.moveSpeed).toBe(4.8)
  })

  it('holds next-run lives/current values until a new run starts', () => {
    tuning.apply({ 'run.lives': 4, 'run.startSpeed': 8 })
    expect(CONFIG.run.lives).toBe(3)
    expect(createRun().lives).toBe(3)
    tuning.activate('run')
    expect(CONFIG.run.lives).toBe(4)
    expect(CONFIG.run.startSpeed).toBe(8)
    expect(createRun().lives).toBe(4)
  })

  it('changes actual bank-side walking while keeping the bear on the shoreline', () => {
    const world = new World()
    const player = new Player(world)
    const initialOffset = player.bankOffset
    player.step(0.2, 1, 0)
    expect(player.bankOffset).toBeGreaterThan(initialOffset)
    for (let i = 0; i < 30; i += 1) player.step(0.1, 1, 0)
    expect(player.bankOffset).toBeLessThanOrEqual(CONFIG.player.bankFar)
    expect(player.position.y).toBeGreaterThan(world.waterHeight(player.z))
  })

  it('requires the current cap to be at least the starting current', () => {
    expect(() => tuning.apply({ 'run.startSpeed': 9, 'run.maxSpeed': 9 })).not.toThrow()
    expect(() => tuning.apply({ 'run.startSpeed': 10, 'run.maxSpeed': 9 })).toThrow()
  })
})

describe('fishing score eligibility', () => {
  it('ignores camera changes but marks gameplay changes when activated', () => {
    tuning.activate('run')
    tuning.apply({ 'camera.fov': 61 })
    expect(tuning.unranked).toBe(false)
    tuning.apply({ 'player.moveSpeed': 5.25 })
    expect(tuning.unranked).toBe(true)
    tuning.apply(defaults)
    expect(tuning.unranked).toBe(true)
    tuning.activate('run')
    expect(tuning.unranked).toBe(false)
  })
})
