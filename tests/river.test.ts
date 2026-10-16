import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { Player } from '../src/game/player'
import { RiverHazardField } from '../src/game/river'
import type { World } from '../src/game/world'
import { Terrain } from '../src/game/terrain'
import { applyDamage, createRun } from '../src/game/rules'

describe('river wading and flowing driftwood', () => {
  it('distinguishes river water from safe dry land', () => {
    const terrain = new Terrain()
    const z = 10
    const center = terrain.riverX(z)
    expect(terrain.isInRiver(center, z)).toBe(true)
    expect(terrain.isInRiver(center + CONFIG.world.riverWidth, z)).toBe(false)
    expect(terrain.isSafeSurface(center, z)).toBe(false)
  })

  it('slows the bear in water and disables sprint pounces there', () => {
    const terrain = new Terrain()
    const world = { terrain } as unknown as World
    const player = new Player(world)
    const z = 5
    const x = terrain.riverX(z)
    player.position.set(x, terrain.heightAt(x, z), z)
    player.root.position.copy(player.position)
    for (let i = 0; i < 100; i += 1) player.step(1 / 60, 0, 1, CONFIG.run.maxSpeed, true, 0, true)
    expect(player.wading).toBe(true)
    expect(player.speed).toBeLessThanOrEqual(CONFIG.player.riverMaxSpeed + 0.02)
    expect(player.sprinting).toBe(false)
    expect(player.pouncing).toBe(false)
  })

  it('keeps a bounded group of visible logs drifting downstream along the infinite river', () => {
    const terrain = new Terrain()
    const bear = new THREE.Vector3(-5, 0, 5)
    const field = new RiverHazardField()
    field.reset(bear, terrain)
    const before = field.markers()
    expect(field.count).toBe(CONFIG.river.logCount)
    expect(before).toHaveLength(CONFIG.river.logCount)
    for (const marker of before) {
      expect(marker.x).toBeCloseTo(terrain.riverX(marker.z), 5)
      expect(marker.z).toBeGreaterThan(bear.z + CONFIG.river.minLogDistance - 1)
    }
    field.step(1, bear, terrain)
    expect(field.markers()[0]!.z).toBeGreaterThan(before[0]!.z)
    const farBear = new THREE.Vector3(8_500, 0, -12_000)
    field.step(0, farBear, terrain)
    expect(field.markers()).toHaveLength(CONFIG.river.logCount)
    expect(Math.min(...field.markers().map(log => Math.abs(log.z - farBear.z)))).toBeGreaterThan(CONFIG.river.minLogDistance - 1)
  })

  it('detects a swept river crossing, but causes no contact on dry land', () => {
    const terrain = new Terrain()
    const field = new RiverHazardField()
    field.reset(new THREE.Vector3(0, 0, 0), terrain)
    const log = field.markers()[0]!
    const start = new THREE.Vector3(log.x, terrain.heightAt(log.x, log.z - 8), log.z - 8)
    const end = new THREE.Vector3(log.x, terrain.heightAt(log.x, log.z + 8), log.z + 8)
    const contact = field.collisions(start, end, terrain)
    expect(contact?.id).toBe(log.id)
    expect(contact?.position.z).toBeCloseTo(log.z, 3)

    const dry = new THREE.Vector3(log.x + CONFIG.world.riverWidth * 0.5 + 2, 0, log.z)
    expect(field.collisions(dry, dry, terrain)).toBeNull()
  })

  it('pushes struck driftwood downstream and applies the river-log health damage', () => {
    const terrain = new Terrain()
    const field = new RiverHazardField()
    field.reset(new THREE.Vector3(0, 0, 0), terrain)
    const log = field.markers()[0]!
    field.deflect(log.id, terrain)
    expect(field.markers()[0]!.z).toBeCloseTo(log.z + 8, 4)
    const result = applyDamage(createRun(), CONFIG.river.logDamage, 'river-log')
    expect(result.state.health).toBe(100 - CONFIG.river.logDamage)
    expect(result.state.phase).toBe('playing')
  })
})
