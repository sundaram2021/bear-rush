import { describe, expect, it } from 'vitest'
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
})
