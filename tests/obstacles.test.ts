import { describe, expect, it } from 'vitest'
import { Obstacles } from '../src/game/obstacles'
import { World } from '../src/game/world'

describe('river-following wood and algae', () => {
  it('moves both hazard types with river flow along the curved, uneven centerline', () => {
    const world = new World()
    const field = new Obstacles()
    field.spawn('block', -10, 0.4)
    field.spawn('algae', -12, -1.1)
    field.step(0.5, 8, world, 0)
    const block = field.group.children[0]
    const algae = field.group.children[1]
    expect(block.position.z).toBeCloseTo(-6.24, 4)
    expect(algae.position.z).toBeCloseTo(-8.56, 2)
    expect(block.position.x).toBeCloseTo(world.riverCenterX(block.position.z) + 0.4, 3)
    expect(algae.position.x).toBeCloseTo(world.riverCenterX(algae.position.z) - 1.1, 3)
    expect(block.position.y).toBeCloseTo(world.waterHeight(block.position.z) + 0.21 + Math.sin(0.6) * 0.05, 3)
    expect(algae.position.y).toBeCloseTo(world.waterHeight(algae.position.z) + 0.16, 3)
    expect(Math.abs(world.riverCenterX(-6) - world.riverCenterX(0))).toBeGreaterThan(0.1)
  })

  it('reports a small block contact once and leaves another hazard active', () => {
    const world = new World()
    const field = new Obstacles()
    field.spawn('block', 0, 5.85)
    field.spawn('algae', 0, 7.9)
    const bear = world.bankPoint(0, 1, 1.1)
    field.step(0, 0, world, 0)
    const first = field.collisions(bear)
    expect(first).toHaveLength(1)
    expect(first[0].kind).toBe('block')
    expect(field.collisions(bear)).toHaveLength(0)
    expect(field.group.children).toHaveLength(1)
  })

  it('distinguishes algae contacts so the game can charge a life immediately', () => {
    const world = new World()
    const field = new Obstacles()
    field.spawn('algae', 0, 5.85)
    const bear = world.bankPoint(0, 1, 1.1)
    field.step(0, 0, world, 0)
    const hits = field.collisions(bear)
    expect(hits.map(hit => hit.kind)).toEqual(['algae'])
  })
})
