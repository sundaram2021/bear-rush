import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { HazardField } from '../src/game/hazards'
import { Terrain } from '../src/game/terrain'

describe('mountain-hunt dangers', () => {
  it('reports a poisonous-food hit once and consumes that object', () => {
    const terrain = new Terrain()
    const field = new HazardField()
    const point = new THREE.Vector3(-5, terrain.heightAt(-5, 5), 5)
    expect(field.spawn('poison', point, terrain)).toBe(true)
    expect(field.collisions(point).map(contact => contact.kind)).toEqual(['poison'])
    expect(field.collisions(point)).toEqual([])
    expect(field.count).toBe(0)
  })

  it('reports a bear trap once and consumes it', () => {
    const terrain = new Terrain()
    const field = new HazardField()
    const point = new THREE.Vector3(-5, terrain.heightAt(-5, 5), 5)
    expect(field.spawn('trap', point, terrain)).toBe(true)
    expect(field.collisions(point)[0].kind).toBe('trap')
    expect(field.collisions(point)).toEqual([])
  })

  it('rejects hazards on unsafe ground so only the trench field handles the fall', () => {
    const terrain = new Terrain()
    const field = new HazardField()
    const trench = terrain.trenchX(0)
    expect(terrain.isInTrench(trench, 0)).toBe(true)
    expect(field.spawn('trap', new THREE.Vector3(trench, terrain.heightAt(trench, 0), 0), terrain)).toBe(false)
    expect(field.count).toBe(0)
  })
})
