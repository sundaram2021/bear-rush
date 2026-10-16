import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { FoodField } from '../src/game/food'
import { Terrain } from '../src/game/terrain'

describe('wildlife tracking and pursuit', () => {
  it('forages honey at close range and removes the same hive only once', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const point = new THREE.Vector3(-5, terrain.heightAt(-5, 5), 5)
    field.spawn('honey', point, terrain)
    expect(field.collectNearby(point, false)?.kind).toBe('honey')
    expect(field.collectNearby(point, true)).toBeNull()
    expect(field.count).toBe(0)
  })

  it('starts with a few distant leads instead of guaranteed nearby examples of every species', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const bear = new THREE.Vector3(-5, terrain.heightAt(-5, 5), 5)
    field.spawnInitial(bear, terrain)
    expect(field.count).toBeLessThanOrEqual(3)
    expect(field.count).toBeGreaterThanOrEqual(2)
    expect(field.kinds).not.toHaveLength(6)
    for (const actor of field.group.children) expect(actor.position.distanceTo(bear)).toBeGreaterThan(20)
    field.step(0.1, bear, terrain)
    expect(field.tracks(bear).length).toBeGreaterThan(0)
  })

  it('does not reward an instant pounce on healthy prey and reports the missed attempt', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const deer = new THREE.Vector3(0, terrain.heightAt(0, 0), 0)
    field.spawn('deer', deer, terrain)
    expect(field.collectNearby(deer, true)).toBeNull()
    expect(field.consumeMissedHunt()).toBe('deer')
    expect(field.kinds).toEqual(['deer'])
  })

  it('signals prey detection once and hides wildlife beyond the local tracking radius', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const nearBear = new THREE.Vector3(0, terrain.heightAt(0, 20), 20)
    field.spawn('deer', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    field.step(0.1, nearBear, terrain, new THREE.Vector3(), 0)
    expect(field.consumeAlert()).toBe('deer')
    expect(field.consumeAlert()).toBeNull()
    const remoteBear = new THREE.Vector3(CONFIG.hunt.trackingRadius + 50, 0, 0)
    expect(field.tracks(remoteBear)).toHaveLength(0)
  })

  it('allows a close pounce only after the fawn has spent a sustained chase window', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const bear = new THREE.Vector3(0, terrain.heightAt(0, 14), 14)
    field.spawn('fawn', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    for (let i = 0; i < 60; i += 1) {
      const prey = field.group.children[0]
      bear.set(prey.position.x, terrain.heightAt(prey.position.x, prey.position.z + 14), prey.position.z + 14)
      field.step(0.2, bear, terrain, new THREE.Vector3(0, 0, 1), 7.8)
    }
    const actor = (field as unknown as { actors: Array<{ state: string }> }).actors[0]
    expect(actor.state).toBe('exhausted')
    const prey = field.group.children[0]
    bear.set(prey.position.x, prey.position.y, prey.position.z)
    expect(field.collectNearby(bear, true)?.kind).toBe('fawn')
    expect(field.count).toBe(0)
  })

  it('lets old sightings fade instead of showing a perfect persistent radar', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const prey = new THREE.Vector3(0, terrain.heightAt(0, 0), 0)
    const nearby = new THREE.Vector3(0, terrain.heightAt(0, 8), 8)
    field.spawn('elk', prey, terrain)
    field.step(0.1, nearby, terrain)
    expect(field.tracks(nearby)).toHaveLength(1)
    const far = new THREE.Vector3(CONFIG.hunt.trackingRadius + 22, terrain.heightAt(CONFIG.hunt.trackingRadius + 22, 0), 0)
    for (let i = 0; i < CONFIG.hunt.trackLifetime * 10 + 1; i += 1) field.step(0.1, far, terrain)
    expect(field.tracks(far)).toHaveLength(0)
  })
})
