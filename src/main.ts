import './styles/main.css'
import { Audio } from './engine/audio'
import { I18n } from './engine/i18n'
import { Input } from './engine/input'
import { GameLoop } from './engine/loop'
import { SAVE_KEY, SaveStore, type SaveData } from './engine/save'
import type { Game } from './game/game'
import * as rules from './game/rules'
import { TouchControls } from './ui/touch'
import { Ui } from './ui/ui'

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game')!
  const firstRun = safeGet(SAVE_KEY) === null
  const save = new SaveStore()
  // This game ships in English only: do not detect or persist a browser-language choice.
  const i18n = new I18n('en')
  const input = new Input(canvas)
  const audio = new Audio()
  let game: Game | undefined
  let ui!: Ui
  let loop!: GameLoop

  const applySettings = (data: SaveData) => {
    audio.setVolumes(data.musicVolume, data.sfxVolume, data.muted)
    if (game) game.reducedMotion = data.reducedMotion
  }
  const startRun = (tutorial: boolean) => {
    if (!game) return
    audio.unlock()
    game.start(tutorial)
    ui.show('hud')
    loop.resetAccumulator()
  }
  const pause = () => {
    if (game?.mode !== 'playing') return
    game.pause()
    ui.show('pause')
  }
  const resume = () => {
    if (game?.mode !== 'paused') return
    game.resume()
    ui.show('hud')
    loop.resetAccumulator()
  }

  ui = new Ui(i18n, save, audio, input, {
    play: () => startRun(!save.data.tutorialDone),
    restart: () => startRun(false),
    resume,
    quit: () => { game?.toTitle(); ui.show('title') },
    settings: patch => {
      const qualityChanged = patch.quality !== undefined && patch.quality !== save.data.quality
      save.update(patch)
      applySettings(save.data)
      if (qualityChanged) game?.setQuality(save.data.quality)
    },
  })
  ui.show('boot')
  applySettings(save.data)

  let loaded = 0
  const track = <T>(promise: Promise<T>): Promise<T> => promise.then(value => (ui.setBootProgress(0.08 + (++loaded / 3) * 0.92), value))
  ui.setBootProgress(0.08)
  const [{ Game }, { Renderer, suggestQuality }] = await Promise.all([
    track(import('./game/game')),
    track(import('./engine/renderer')),
    track(document.fonts.ready),
  ])
  if (firstRun) {
    save.update({ quality: suggestQuality() })
    ui.refreshSettings()
  }

  const renderer = new Renderer(canvas, save.data.quality)
  game = new Game(renderer, input, audio, {
      popup: (text, at, kind) => ui.popup(text, at, kind),
      hurt: () => ui.hurt(),
      hint: hint => ui.hint(hint),
      catchReady: ready => ui.catchReady(ready),
      tutorialDone: () => save.update({ tutorialDone: true }),
    end: run => window.setTimeout(() => ui.showResults(run), 800),
  })
  game.reducedMotion = save.data.reducedMotion
  if (import.meta.env.DEV) {
    const [{ registerGameTuning }, { tuning }] = await Promise.all([
      import('../scripts/manus-tuning/adapter.js'), import('./game/tuning'),
    ])
    await registerGameTuning(tuning)
  }
  const g = game

  loop = new GameLoop({
    step: dt => g.step(dt),
    render: (alpha, frameSeconds) => {
      input.update()
      if (input.consume('pause')) {
        if (g.mode === 'playing') pause()
        else if (g.mode === 'paused' && ui.screen === 'pause') resume()
      }
      ui.frame(frameSeconds)
      loop.paused = g.mode === 'paused'
      g.render(alpha, frameSeconds)
      if (g.mode === 'playing' || g.mode === 'ended') ui.updateHud(g.run, g.speed)
      input.endFrame()
    },
  })
  loop.start()

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause() })
  window.addEventListener('game:pause', pause)
  new TouchControls(document.getElementById('ui')!, input, () => g.mode === 'playing')
  window.setTimeout(() => ui.show('title'), 250)
  // Debug/test hook: smoke tests inspect the actual run and saved local record through it.
  ;(window as unknown as { __game: unknown }).__game = { game: g, ui, input, save, rules }
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

boot().catch(err => {
  console.error(err)
  const el = document.getElementById('ui')
  if (el) {
    el.innerHTML = `<div class="fatal"><img src="/favicon.png" alt="" /><p>Failed to start: ${String((err as Error)?.message ?? err).replace(/[<>&]/g, '')}</p><button type="button" data-retry>Retry</button></div>`
    el.querySelector('[data-retry]')?.addEventListener('click', () => window.location.reload())
  }
})
