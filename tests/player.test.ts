import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { Player } from '../src/game/player'
import { World } from '../src/game/world'

describe('bear locomotion', () => {
  it('moves beyond the old board edge and streams through global terrain coordinates', () => {
    const world = new World()
    const player = new Player(world)
    player.position.set(126, world.terrain.heightAt(126, 5), 5)
    player.root.position.copy(player.position)
    player.step(0.25, 1, 0, 8, false, 0, false)
    expect(player.position.x).toBeGreaterThan(126)
    world.update(0.1, player.position)
    expect(world.chunkCount).toBe((2 * 2 + 1) ** 2)
  })

  it('uses a short sprint reserve, recovers when released, and emits gait footfalls', () => {
    const player = new Player(new World())
    player.step(1, 0, 1, 8, true, 0, false)
    expect(player.sprinting).toBe(true)
    const tired = player.stamina
    expect(tired).toBeLessThan(1)
    player.animate(0.05, 0.05)
    player.animate(0.4, 0.45)
    expect(player.consumeFootfalls()).toBeGreaterThan(0)
    player.step(1, 0, 0, 8, false, 0, false)
    expect(player.stamina).toBeGreaterThan(tired)
  })

  it('moves slowly and quietly while stalking, and cannot sprint at the same time', () => {
    const player = new Player(new World())
    player.step(0.7, 0, 1, 8, false, 0, false, true)
    expect(player.stalking).toBe(true)
    expect(player.speed).toBeLessThan(8 * CONFIG.player.stalkMultiplier * 1.05)
    player.step(0.1, 0, 1, 8, true, 0, false, true)
    expect(player.sprinting).toBe(false)
    expect(player.stalking).toBe(true)
  })

  it('uses a light analog stick input as a quiet stalk without a keyboard modifier', () => {
    const player = new Player(new World())
    player.step(0.7, 0, 0.25, 8, false, 0, false)
    expect(player.stalking).toBe(true)
    expect(player.speed).toBeLessThan(8 * CONFIG.player.stalkMultiplier * 0.55)
  })

  it('requires momentum to pounce and imposes a meaningful repeat cooldown', () => {
    const player = new Player(new World())
    expect(player.step(0.02, 0, 1, 8, false, 0, true)).toBe(false)
    player.step(0.7, 0, 1, 8, false, 0, false)
    expect(player.step(0.02, 0, 1, 8, false, 0, true)).toBe(true)
    expect(player.pouncing).toBe(true)
    expect(player.step(0.02, 0, 1, 8, false, 0, true)).toBe(false)
  })
})
