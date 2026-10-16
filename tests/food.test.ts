import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { FoodField } from '../src/game/food'
import { Terrain } from '../src/game/terrain'

describe('mountain food and wildlife', () => {
  it('collects honey in the shared world position and removes it once', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const point = new THREE.Vector3(-5, terrain.heightAt(-5, 5), 5)
    field.spawn('honey', point, terrain)
    expect(field.collectNearby(point, false)?.kind).toBe('honey')
    expect(field.collectNearby(point, true)).toBeNull()
    expect(field.count).toBe(0)
  })

  it('creates all six requested food types in the initial hunt', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    field.spawnInitial(new THREE.Vector3(-5, terrain.heightAt(-5, 5), 5), terrain)
    for (const kind of ['salmon', 'honey', 'fawn', 'deer', 'elk', 'moose']) expect(field.kinds).toContain(kind)
    expect(field.count).toBeGreaterThanOrEqual(6)
  })

  it('moves nearby deer away from the bear on safe terrain', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const deer = new THREE.Vector3(0, terrain.heightAt(0, 14), 14)
    const bear = new THREE.Vector3(-5, terrain.heightAt(-5, 5), 5)
    field.spawn('deer', deer, terrain)
    const before = field.group.children[0].position.clone()
    field.step(1, bear, terrain)
    expect(field.group.children[0].position.distanceTo(before)).toBeGreaterThan(0.1)
    expect(terrain.isSafeSurface(field.group.children[0].position.x, field.group.children[0].position.z)).toBe(true)
  })
})
