import { describe, expect, it } from 'vitest'
import { defaultSave, parseSave, SAVE_KEY, SaveStore } from '../src/engine/save'

describe('browser-local save', () => {
  it('falls back to defaults for missing, corrupt, array, or foreign-version data', () => {
    expect(parseSave(null)).toEqual(defaultSave())
    expect(parseSave('{nope')).toEqual(defaultSave())
    expect(parseSave('[]')).toEqual(defaultSave())
    expect(parseSave(JSON.stringify({ version: 1, bestScore: 800 }))).toEqual(defaultSave())
  })

  it('clamps settings and validates personal-best fields', () => {
    const save = parseSave(JSON.stringify({ version: 2, musicVolume: 5, sfxVolume: -1, muted: true, quality: 'ultra', bestScore: 340.8, bestFish: -2, bestDistance: 44.6, bestTime: 'bad' }))
    expect(save.musicVolume).toBe(1)
    expect(save.sfxVolume).toBe(0)
    expect(save.muted).toBe(true)
    expect(save.quality).toBe('medium')
    expect(save.bestScore).toBe(340)
    expect(save.bestFish).toBe(0)
    expect(save.bestDistance).toBe(44.6)
    expect(save.bestTime).toBe(0)
  })

  it('saves and reloads settings and best-run statistics using the local key only', () => {
    const memory = new Map<string, string>()
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value) }
    new SaveStore(storage).update({ musicVolume: 0.3, bestScore: 900, bestFish: 7, bestDistance: 122.5, bestTime: 16.2 })
    expect(JSON.parse(memory.get(SAVE_KEY)!).musicVolume).toBe(0.3)
    expect(new SaveStore(storage).data.bestScore).toBe(900)
    expect(new SaveStore(storage).data.bestFish).toBe(7)
    expect(memory.size).toBe(1)
  })

  it('keeps the game playable if browser storage access fails', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } }
    const store = new SaveStore(broken)
    expect(() => store.update({ muted: true })).not.toThrow()
    expect(store.data.muted).toBe(true)
  })
})
