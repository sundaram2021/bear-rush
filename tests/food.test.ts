import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CONFIG, FOOD_KINDS } from '../src/game/config'
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

  it('spawns all eight food species as trackable leads in the first local area', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const bear = new THREE.Vector3(-5, terrain.heightAt(-5, 5), 5)
    field.spawnInitial(bear, terrain)
    expect(field.count).toBe(FOOD_KINDS.length)
    expect(field.kinds).toEqual(FOOD_KINDS)
    for (const actor of field.group.children) expect(actor.position.distanceTo(bear)).toBeGreaterThan(20)
    field.step(0.1, bear, terrain)
    expect(field.tracks(bear)).toHaveLength(FOOD_KINDS.length)
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

  it('does not reward an early pounce and gives the prey a brief recovery opportunity', () => {
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
    expect(actor.stamina).toBeGreaterThan(0.25)
    expect(actor.missedTimer).toBeGreaterThan(1.5)
  })

  it('allows a close front-on pounce after sustained pursuit within the visible exhaustion window', () => {
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
    expect(actor.exhaustedTimer).toBeLessThanOrEqual(CONFIG.hunt.exhaustedWindow.fawn)
    expect(actor.exhaustedTimer).toBeGreaterThan(0)
    expect(CONFIG.hunt.exhaustedWindow.fawn).toBeGreaterThan(3)
    const prey = field.group.children[0]
    bear.set(prey.position.x, terrain.heightAt(prey.position.x, prey.position.z + 2.2), prey.position.z + 2.2)
    expect(field.huntOpportunity(bear)).toBe('fawn')
    expect(field.collectNearby(bear, true, forward, 5)?.kind).toBe('fawn')
    expect(field.count).toBe(0)
  })

  it('catches an exhausted animal when a committed pounce sweeps through it between frames', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    field.spawn('fawn', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    const actor = (field as unknown as { actors: Array<{ state: string; exhaustedTimer: number }> }).actors[0]
    actor.state = 'exhausted'
    actor.exhaustedTimer = CONFIG.hunt.exhaustedWindow.fawn
    const start = new THREE.Vector3(-6, terrain.heightAt(-6, 0), 0)
    const end = new THREE.Vector3(6, terrain.heightAt(6, 0), 0)
    expect(field.collectNearby(end, true, new THREE.Vector3(1, 0, 0), 5, start)?.kind).toBe('fawn')
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

  it('makes a rabbit pause and flee straighter at range while a coyote sustains a longer pursuit', () => {
    const terrain = new Terrain()
    const bear = new THREE.Vector3(0, terrain.heightAt(0, 20), 20)
    const forward = new THREE.Vector3(0, 0, -1)
    const rabbit = new FoodField()
    const coyote = new FoodField()
    rabbit.spawn('rabbit', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    coyote.spawn('coyote', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
    const rabbitActor = (rabbit as unknown as { actors: Array<{ state: string; stamina: number }> }).actors[0]
    const coyoteActor = (coyote as unknown as { actors: Array<{ state: string; stamina: number }> }).actors[0]
    rabbitActor.state = 'fleeing'
    coyoteActor.state = 'fleeing'
    for (let i = 0; i < 20; i += 1) {
      const rabbitPrey = rabbit.group.children[0]!
      const coyotePrey = coyote.group.children[0]!
      bear.set(rabbitPrey.position.x, terrain.heightAt(rabbitPrey.position.x, rabbitPrey.position.z + 14), rabbitPrey.position.z + 14)
      rabbit.step(0.1, bear, terrain, new THREE.Vector3(), 7, false, forward)
      bear.set(coyotePrey.position.x, terrain.heightAt(coyotePrey.position.x, coyotePrey.position.z + 14), coyotePrey.position.z + 14)
      coyote.step(0.1, bear, terrain, new THREE.Vector3(), 7, false, forward)
    }
    expect(rabbitActor.stamina).toBeLessThan(coyoteActor.stamina)
    expect(CONFIG.hunt.chaseDuration.rabbit).toBeLessThan(CONFIG.hunt.chaseDuration.coyote)
    expect(CONFIG.hunt.evasion.rabbit).toBeGreaterThan(CONFIG.hunt.evasion.coyote)
  })

  it('keeps a hare’s distant escape line straighter than its close-range evasion', () => {
    const terrain = new Terrain()
    const flight = (bearZ: number) => {
      const field = new FoodField()
      field.spawn('rabbit', new THREE.Vector3(0, terrain.heightAt(0, 0), 0), terrain)
      const actor = (field as unknown as { actors: Array<{ state: string; velocity: THREE.Vector3 }> }).actors[0]!
      actor.state = 'fleeing'
      field.step(0.1, new THREE.Vector3(0, terrain.heightAt(0, bearZ), bearZ), terrain, new THREE.Vector3(), 7, false, new THREE.Vector3(0, 0, -1))
      return Math.abs(actor.velocity.x)
    }
    expect(flight(30)).toBeLessThan(flight(6))
  })

  it('lets the bear make a distinct close, slow strike on a salmon in the river', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const fishZ = 10
    const fishX = terrain.riverX(fishZ)
    field.spawn('salmon', new THREE.Vector3(fishX, terrain.waterY(fishZ) + 0.23, fishZ), terrain)
    const bearZ = 11
    const bear = new THREE.Vector3(terrain.riverX(bearZ), terrain.heightAt(terrain.riverX(bearZ), bearZ), bearZ)
    field.step(0.1, bear, terrain)
    const forward = new THREE.Vector3(0, 0, -1)
    expect(field.collectNearby(bear, true, forward, 4)?.kind).toBeUndefined()
    expect(field.collectNearby(bear, false, forward, 1, bear, true)?.kind).toBe('salmon')
    expect(field.count).toBe(0)
  })

  it('moves salmon against the modeled current until the bear approaches', () => {
    const terrain = new Terrain()
    const field = new FoodField()
    const fishZ = 10
    const fishX = terrain.riverX(fishZ)
    field.spawn('salmon', new THREE.Vector3(fishX, terrain.waterY(fishZ) + 0.23, fishZ), terrain)
    const bear = new THREE.Vector3(fishX, terrain.heightAt(fishX, 35), 35)
    field.step(1, bear, terrain)
    const actor = (field as unknown as { actors: Array<{ swimZ: number }> }).actors[0]
    expect(actor.swimZ).toBeLessThan(fishZ)
  })
})
