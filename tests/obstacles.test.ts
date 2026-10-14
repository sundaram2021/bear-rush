import { describe, expect, it } from 'vitest'
import { Obstacles } from '../src/game/obstacles'

describe('fallen-tree patterns', () => {
  it('leaves a lane open and detects a collision only in the occupied lane', () => {
    const field = new Obstacles()
    field.spawn([0, 2], -0.5)
    expect(field.collides(0)).toBe(false)
    expect(field.collides(-3)).toBe(true)
    expect(field.collides(3)).toBe(true)
  })

  it('moves a log down the river toward the bear', () => {
    const field = new Obstacles()
    field.spawn([1], -3)
    expect(field.collides(0)).toBe(false)
    field.step(0.2, 15)
    expect(field.collides(0)).toBe(true)
  })
})
