import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { Terrain } from '../src/game/terrain'

describe('global mountain terrain', () => {
  it('returns deterministic, finite samples far beyond the former play-area limits', () => {
    const terrain = new Terrain()
    for (const [x, z] of [[-5, 5], [260, -410], [4_800, 8_200], [-11_000, 6_500]]) {
      const sample = terrain.sample(x, z)
      expect(Number.isFinite(sample.height)).toBe(true)
      expect(sample.height).toBe(terrain.heightAt(x, z))
      expect(sample.normal.length()).toBeCloseTo(1, 5)
    }
  })

  it('keeps the river and trench as continuous world features at distant coordinates', () => {
    const terrain = new Terrain()
    for (const z of [-20_000, -1_000, 0, 15_000]) {
      const trenchX = terrain.trenchX(z)
      expect(terrain.isInTrench(trenchX, z)).toBe(true)
      expect(terrain.isInTrench(trenchX + 20, z)).toBe(false)
      expect(terrain.waterY(z)).toBeCloseTo(terrain.heightAt(terrain.riverX(z), z) + 0.16, 5)
    }
  })

  it('keeps the start safe and does not invent a rectangular boundary', () => {
    const terrain = new Terrain()
    expect(terrain.isSafeSurface(-5, 5)).toBe(true)
    expect(terrain.isSafeSurface(terrain.trenchX(0), 0)).toBe(false)
    expect(terrain.isSafeSurface(terrain.riverX(0), 0)).toBe(false)
    let farSafePoint = false
    for (let x = 1_200; x < 1_260 && !farSafePoint; x += 3) {
      for (let z = -1_280; z < -1_220 && !farSafePoint; z += 3) farSafePoint = terrain.isSafeSurface(x, z)
    }
    expect(farSafePoint).toBe(true)
  })

  it('generates identical height and normal values on adjacent chunk borders', () => {
    const terrain = new Terrain()
    const grid = CONFIG.world.chunkGrid
    const left = terrain.createGeometry(0, 0)
    const right = terrain.createGeometry(1, 0)
    const leftPosition = left.getAttribute('position')
    const rightPosition = right.getAttribute('position')
    const leftNormal = left.getAttribute('normal')
    const rightNormal = right.getAttribute('normal')
    for (const row of [0, Math.floor(grid / 2), grid]) {
      const leftIndex = row * (grid + 1) + grid
      const rightIndex = row * (grid + 1)
      expect(leftPosition.getY(leftIndex)).toBeCloseTo(rightPosition.getY(rightIndex), 6)
      expect(leftNormal.getX(leftIndex)).toBeCloseTo(rightNormal.getX(rightIndex), 5)
      expect(leftNormal.getY(leftIndex)).toBeCloseTo(rightNormal.getY(rightIndex), 5)
      expect(leftNormal.getZ(leftIndex)).toBeCloseTo(rightNormal.getZ(rightIndex), 5)
    }
    left.dispose(); right.dispose()
  })
})
