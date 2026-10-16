import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { World } from '../src/game/world'

describe('infinite streamed world', () => {
  it('keeps only the nearby chunk window as coordinates advance without wrapping the player', () => {
    const world = new World()
    const expected = (CONFIG.world.renderChunkRadius * 2 + 1) ** 2
    expect(world.chunkCount).toBe(expected)
    const far = new THREE.Vector3(9_600, 0, -12_400)
    world.update(0.2, far)
    expect(world.chunkCount).toBe(expected)
    expect(Number.isFinite(world.terrain.heightAt(far.x, far.z))).toBe(true)
    world.update(0.2, new THREE.Vector3(far.x + CONFIG.world.chunkSize, 0, far.z))
    expect(world.chunkCount).toBe(expected)
  })
})
