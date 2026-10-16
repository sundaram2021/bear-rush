import { describe, expect, it } from 'vitest'
import { Terrain } from '../src/game/terrain'

describe('shared alpine terrain field', () => {
  it('is deterministic and returns finite height and slope samples', () => {
    const terrain = new Terrain()
    const first = terrain.sample(-5, 5)
    const second = terrain.sample(-5, 5)
    expect(first.height).toBe(second.height)
    expect(first.slope).toBeGreaterThanOrEqual(0)
    expect(first.slope).toBeLessThan(Math.PI / 2)
    expect(first.normal.length()).toBeCloseTo(1, 5)
  })

  it('provides a winding river and a separate carved trench', () => {
    const terrain = new Terrain()
    expect(Math.abs(terrain.riverX(-24) - terrain.riverX(24))).toBeGreaterThan(0.5)
    const trenchX = terrain.trenchX(0)
    expect(terrain.isInTrench(trenchX, 0)).toBe(true)
    expect(terrain.isInTrench(trenchX + 20, 0)).toBe(false)
  })

  it('keeps the intended start safe and excludes the trench from safe footing', () => {
    const terrain = new Terrain()
    expect(terrain.isSafeSurface(-5, 5)).toBe(true)
    expect(terrain.isSafeSurface(terrain.trenchX(0), 0)).toBe(false)
    expect(terrain.isSafeSurface(terrain.riverX(0), 0)).toBe(false)
  })
})
