import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { Terrain } from '../src/game/terrain'

describe('mountain valley terrain', () => {
  const terrain = new Terrain()

  it('is deterministic for the same coordinates', () => {
    expect(terrain.height(12, -40)).toBe(terrain.height(12, -40))
    expect(terrain.height(12, -40)).not.toBe(terrain.height(13, -40))
  })

  it('carves a deep crevasse near its center and leaves solid ground away from it', () => {
    // A point on the trench segment from (-330,-150) to (285,340); offset perpendicular for solid ground.
    const midX = (-330 + 285) / 2
    const midZ = (-150 + 340) / 2
    expect(terrain.trenchDepth(midX, midZ)).toBeGreaterThan(15)
    expect(terrain.trenchDepth(midX - 0.623 * 60, midZ + 0.782 * 60)).toBe(0)
  })

  it('lowers a river channel below the surrounding valley', () => {
    const z = 10
    const center = terrain.height(terrain.riverX(z), z)
    const away = terrain.height(terrain.riverX(z) + 40, z)
    expect(center).toBeLessThan(away)
    expect(terrain.waterY(z)).toBeGreaterThan(center)
  })

  it('reports steeper slope on the mountain rim than in the valley floor', () => {
    const rim = terrain.slope(CONFIG.world.size * 0.46, 0)
    const valley = terrain.slope(4, 4)
    expect(rim).toBeGreaterThan(valley)
  })

  it('keeps points inside the playable bounds', () => {
    const v = new THREE.Vector3(10_000, 0, -10_000)
    terrain.clampToBounds(v)
    expect(Math.hypot(v.x, v.z)).toBeLessThanOrEqual(terrain.half)
  })
})
