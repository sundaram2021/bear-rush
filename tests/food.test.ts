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

  it('lets a quiet, upwind stalk approach closer before the prey alerts', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const bear = new THREE.Vector3(0, terrain.heightAt(0, 20), 20)
    const deer = new THREE.Vector3(0, terrain.heightAt(0, 0), 0)
    const upwind = new THREE.Vector3(0, 0, 1)
    field.spawn('deer', deer, terrain)
    field.step(0.1, bear, terrain, upwind, 0, true)
    expect(field.consumeAlert()).toBeNull()
    field.step(0.1, bear, terrain, upwind, 0, false)
    expect(field.consumeAlert()).toBe('deer')
    expect(field.consumeAlert()).toBeNull()
  })

  it('does not exhaust prey just because a stationary bear is nearby', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const bear = new THREE.Vector3(0, terrain.heightAt(0, 20), 20)
    field.spawn('deer', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    for (let i = 0; i < 160; i += 1) field.step(0.1, bear, terrain, new THREE.Vector3(0, 0, 1), 0)
    const actor = (field as unknown as { actors: Array<{ state: string; stamina: number }> }).actors[0]
    expect(actor.state).not.toBe('exhausted')
    expect(actor.stamina).toBeGreaterThan(0.9)
  })

  it('does not drain prey stamina when the bear is running past instead of following', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const bear = new THREE.Vector3(0, terrain.heightAt(0, 20), 20)
    field.spawn('deer', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    for (let i = 0; i < 180; i += 1) {
      field.step(0.1, bear, terrain, new THREE.Vector3(0, 0, 1), 7, false, new THREE.Vector3(1, 0, 0))
    }
    const actor = (field as unknown as { actors: Array<{ state: string; stamina: number }> }).actors[0]
    expect(actor.state).not.toBe('exhausted')
    expect(actor.stamina).toBeGreaterThan(0.9)
  })

  it('does not reward an early pounce; the alert creates a real recovery and escape opportunity', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const bear = new THREE.Vector3(0, terrain.heightAt(0, 2), 2)
    field.spawn('deer', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    const forward = new THREE.Vector3(0, 0, -1)
    expect(field.collectNearby(bear, true, forward, 5)).toBeNull()
    expect(field.consumeMissedHunt()).toBe('deer')
    expect(field.kinds).toEqual(['deer'])
    const actor = (field as unknown as { actors: Array<{ state: string; stamina: number; missedTimer: number }> }).actors[0]
    expect(actor.state).toBe('fleeing')
    expect(actor.stamina).toBeGreaterThan(0.3)
    expect(actor.missedTimer).toBeGreaterThan(2.5)
  })

  it('allows a close, front-on pounce only after a sustained close pursuit and within a narrow window', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const bear = new THREE.Vector3(0, terrain.heightAt(0, 14), 14)
    field.spawn('fawn', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    const forward = new THREE.Vector3(0, 0, -1)
    const steps = Math.ceil((CONFIG.hunt.chaseDuration.fawn + 2) / 0.2)
    for (let i = 0; i < steps; i += 1) {
      const prey = field.group.children[0]
      bear.set(prey.position.x, terrain.heightAt(prey.position.x, prey.position.z + 14), prey.position.z + 14)
      field.step(0.2, bear, terrain, new THREE.Vector3(0, 0, 1), 7.8, false, forward)
    }
    const actor = (field as unknown as { actors: Array<{ state: string; exhaustedTimer: number }> }).actors[0]
    expect(actor.state).toBe('exhausted')
    expect(actor.exhaustedTimer).toBeLessThanOrEqual(1.55)
    expect(actor.exhaustedTimer).toBeGreaterThan(0)
    expect(CONFIG.hunt.exhaustedWindow.fawn).toBeLessThan(2)
    const prey = field.group.children[0]
    bear.set(prey.position.x, terrain.heightAt(prey.position.x, prey.position.z + 1.4), prey.position.z + 1.4)
    expect(field.collectNearby(bear, true, forward, 5)?.kind).toBe('fawn')
    expect(field.count).toBe(0)
  })

  it('rejects a misaligned exhausted-prey pounce and sends the animal back into flight', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    field.spawn('moose', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    const actor = (field as unknown as { actors: Array<{ state: string; exhaustedTimer: number }> }).actors[0]
    actor.state = 'exhausted'
    actor.exhaustedTimer = CONFIG.hunt.exhaustedWindow.moose
    const bear = new THREE.Vector3(0, terrain.heightAt(0, 1.5), 1.5)
    expect(field.collectNearby(bear, true, new THREE.Vector3(0, 0, 1), 5)).toBeNull()
    expect(field.consumeMissedHunt()).toBe('moose')
    expect(actor.state).toBe('fleeing')
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
