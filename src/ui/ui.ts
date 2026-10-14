import type { Audio } from '../engine/audio'
import type { I18n } from '../engine/i18n'
import type { Input } from '../engine/input'
import { type Quality, type SaveData, type SaveStore } from '../engine/save'
import type { Hint } from '../game/game'
import type { RunState } from '../game/rules'

export type Screen = 'boot' | 'title' | 'hud' | 'pause' | 'settings' | 'results'
export type UiActions = {
  play(): void
  resume(): void
  restart(): void
  quit(): void
  settings(patch: Partial<SaveData>): void
}

export class Ui {
  screen: Screen = 'boot'
  private readonly root: HTMLElement
  private stack: Screen[] = []
  private hintKey: Hint = null
  private hudCache = new Map<string, string>()

  constructor(
    private readonly i18n: I18n,
    private readonly save: SaveStore,
    private readonly audio: Audio,
    private readonly input: Input,
    private readonly actions: UiActions,
  ) {
    this.root = document.getElementById('ui')!
    this.root.innerHTML = this.template()
    this.root.addEventListener('click', e => this.onClick(e))
    this.root.addEventListener('input', e => this.onInput(e))
    window.addEventListener('keydown', e => this.onKey(e))
    this.translate()
    this.refreshSettings()
  }

  show(screen: Screen): void {
    this.stack = []
    this.setScreen(screen)
  }

  push(screen: Screen): void {
    this.stack.push(this.screen)
    this.setScreen(screen)
  }

  back(): void {
    const previous = this.stack.pop()
    if (previous) this.setScreen(previous)
    else if (this.screen === 'pause') this.actions.resume()
    else this.setScreen('title')
  }

  setBootProgress(value: number): void {
    const bar = this.root.querySelector<HTMLElement>('.boot-bar i')!
    bar.style.transform = `scaleX(${Math.max(0.04, Math.min(1, value))})`
  }

  updateHud(run: RunState, speed: number): void {
    this.set('fish', String(run.collected))
    this.set('score', run.score.toLocaleString('en-US'))
    this.set('distance', `${Math.floor(run.distance)} m`)
    this.set('time', `${Math.floor(run.elapsed)} s`)
    this.set('speed', `${Math.round(speed)} m/s`)
    for (const [i, life] of [...this.root.querySelectorAll<HTMLElement>('.life')].entries()) {
      life.classList.toggle('is-empty', i >= run.lives)
    }
  }

  popup(text: string, at: { x: number; y: number }, kind: 'score' | 'hurt'): void {
    const el = document.createElement('div')
    el.className = `popup popup-${kind}`
    el.textContent = text
    el.style.left = `${at.x}px`
    el.style.top = `${at.y}px`
    this.root.querySelector('.popups')?.append(el)
    el.addEventListener('animationend', () => el.remove())
  }

  hurt(): void {
    const effect = this.root.querySelector<HTMLElement>('.hurt-vignette')
    if (!effect) return
    effect.classList.remove('flash')
    void effect.offsetWidth
    effect.classList.add('flash')
  }

  hint(hint: Hint): void {
    this.hintKey = hint
    const el = this.root.querySelector<HTMLElement>('.tutorial-hint')!
    el.textContent = hint ? this.i18n.t(`hint.${hint}`) : ''
    el.classList.toggle('is-visible', !!hint)
  }

  showResults(run: RunState): void {
    const oldBest = this.save.data.bestScore
    const isNew = !run.unranked && run.score > oldBest
    if (!run.unranked && isNew) {
      this.save.update({ bestScore: run.score, bestFish: run.collected, bestDistance: run.distance, bestTime: run.elapsed })
    }
    this.root.querySelector<HTMLElement>('.results-title')!.textContent = this.i18n.t('results.title')
    this.root.querySelector<HTMLElement>('.results-message')!.textContent = this.i18n.t('results.message')
    this.root.querySelector<HTMLElement>('.r-fish')!.textContent = String(run.collected)
    this.root.querySelector<HTMLElement>('.r-score')!.textContent = run.score.toLocaleString('en-US')
    this.root.querySelector<HTMLElement>('.r-distance')!.textContent = `${Math.floor(run.distance)} m`
    this.root.querySelector<HTMLElement>('.r-time')!.textContent = `${Math.floor(run.elapsed)} s`
    this.root.querySelector<HTMLElement>('.r-best')!.textContent = this.save.data.bestScore.toLocaleString('en-US')
    const best = this.root.querySelector<HTMLElement>('.results-best')!
    best.textContent = isNew ? this.i18n.t('results.newBest') : ''
    best.classList.toggle('is-active', isNew)
    this.show('results')
    this.renderBest()
  }

  refreshSettings(): void {
    for (const name of ['musicVolume', 'sfxVolume'] as const) {
      const input = this.root.querySelector<HTMLInputElement>(`input[name="${name}"]`)
      if (input) {
        input.value = String(this.save.data[name])
        this.fillRange(input)
      }
    }
    for (const [name, value] of [['muted', this.save.data.muted], ['reducedMotion', this.save.data.reducedMotion]] as const) {
      const button = this.root.querySelector<HTMLButtonElement>(`[data-setting="${name}"]`)
      if (button) button.setAttribute('aria-pressed', String(value))
    }
    for (const button of this.root.querySelectorAll<HTMLElement>('.seg button[data-value]')) {
      const parent = button.parentElement?.dataset.setting
      if (parent === 'quality') button.setAttribute('aria-pressed', String(button.dataset.value === this.save.data.quality))
    }
  }

  frame(_dt: number): void {
    // Menus use native keyboard/tab focus; the runner itself consumes live steering input.
  }

  private setScreen(screen: Screen): void {
    this.screen = screen
    const base = this.stack[0] ?? screen
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-screen]')) {
      const name = el.dataset.screen
      const active = name === screen
        || (name === 'hud' && ['pause', 'results'].includes(screen))
        || (name === base && screen === 'settings')
      el.classList.toggle('is-active', active)
      el.setAttribute('aria-hidden', String(!active))
    }
    this.root.dataset.activeScreen = screen
    if (screen === 'title') this.renderBest()
    requestAnimationFrame(() => {
      const first = this.root.querySelector<HTMLElement>(`[data-screen="${screen}"] [data-nav]`)
      if (first && this.input.method !== 'touch') first.focus({ preventScroll: true })
    })
  }

  private onClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action], .toggle, .seg button')
    if (!target) return
    this.audio.unlock()
    if (target.matches('.toggle')) {
      const key = target.dataset.setting as 'muted' | 'reducedMotion'
      this.actions.settings({ [key]: !this.save.data[key] })
      this.refreshSettings()
      this.audio.play('ui')
      return
    }
    if (target.matches('.seg button')) {
      const value = target.dataset.value as Quality
      this.actions.settings({ quality: value })
      this.refreshSettings()
      this.audio.play('ui')
      return
    }
    switch (target.dataset.action) {
      case 'play': this.actions.play(); break
      case 'resume': this.actions.resume(); break
      case 'restart': this.actions.restart(); break
      case 'quit': this.actions.quit(); break
      case 'settings': this.push('settings'); break
      case 'back': this.back(); break
      case 'pause': window.dispatchEvent(new CustomEvent('game:pause')); break
    }
  }

  private onInput(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.type !== 'range') return
    this.fillRange(input)
    if (input.name === 'musicVolume' || input.name === 'sfxVolume') this.actions.settings({ [input.name]: Number(input.value) })
  }

  private fillRange(input: HTMLInputElement): void {
    const fraction = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))
    input.style.setProperty('--fill', `${fraction * 100}%`)
  }

  private onKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || this.screen === 'title' || this.screen === 'hud' || this.screen === 'boot') return
    if (this.screen === 'settings') {
      event.preventDefault()
      this.input.consume('pause')
      this.back()
    }
  }

  private translate(): void {
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-i18n]')) el.textContent = this.i18n.t(el.dataset.i18n!)
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-i18n-label]')) el.setAttribute('aria-label', this.i18n.t(el.dataset.i18nLabel!))
    document.title = this.i18n.t('game.title')
    if (this.hintKey) this.hint(this.hintKey)
  }

  private renderBest(): void {
    const best = this.root.querySelector<HTMLElement>('.title-best')
    if (!best) return
    best.textContent = this.i18n.t('title.best', { score: this.save.data.bestScore.toLocaleString('en-US'), fish: this.save.data.bestFish })
    best.classList.toggle('is-hidden', this.save.data.bestScore <= 0)
  }

  private set(slot: string, value: string): void {
    if (this.hudCache.get(slot) === value) return
    this.hudCache.set(slot, value)
    const el = this.root.querySelector<HTMLElement>(`[data-slot="${slot}"]`)
    if (el) el.textContent = value
  }

  private template(): string {
    const toggle = (name: string, label: string) => `<div class="setting-row"><span data-i18n="${label}"></span><button class="toggle" data-setting="${name}" aria-pressed="false" aria-label="${label}"><i></i></button></div>`
    const range = (name: string, label: string) => `<label class="setting-row"><span data-i18n="${label}"></span><input data-nav type="range" name="${name}" min="0" max="1" step="0.05"></label>`
    return /* html */ `
<section class="screen screen-boot is-active" data-screen="boot">
  <img class="boot-mark" src="/favicon.png" alt="" /><div class="boot-logo" data-i18n="game.title"></div>
  <div class="boot-bar"><i></i></div><div class="boot-label" data-i18n="boot.loading"></div>
</section>
<section class="screen screen-title" data-screen="title">
  <div class="title-vignette"></div><div class="title-best is-hidden"></div>
  <div class="title-block">
    <div class="eyebrow" data-i18n="game.eyebrow"></div>
    <div class="logo"><span class="logo-mark" aria-hidden="true">🐾</span><h1 class="logo-text" data-i18n="game.title"></h1></div>
    <p class="tagline" data-i18n="game.tagline"></p>
    <div class="controls-card"><b data-i18n="controls.title"></b><span data-i18n="controls.desktop"></span><span data-i18n="controls.touch"></span><span data-i18n="controls.goal"></span></div>
    <nav class="menu"><button data-nav class="btn btn-primary" data-action="play"><span data-i18n="menu.play"></span></button><button data-nav class="btn" data-action="settings"><span data-i18n="menu.settings"></span></button></nav>
    <p class="privacy-note" data-i18n="settings.privacy"></p>
  </div>
  <footer class="bottom-bar"><span data-i18n="game.footer"></span></footer>
</section>
<section class="screen screen-hud" data-screen="hud">
  <div class="hurt-vignette"></div><div class="popups"></div>
  <div class="hud-left"><div class="hud-chip"><span data-i18n="hud.fish"></span><b data-slot="fish">0</b></div><div class="hud-chip"><span data-i18n="hud.score"></span><b data-slot="score">0</b></div></div>
  <div class="hud-center"><div class="hud-distance"><span data-i18n="hud.distance"></span><b data-slot="distance">0 m</b></div><div class="hud-meta"><span data-slot="time">0 s</span><span>·</span><span data-i18n="hud.speed"></span><b data-slot="speed">14 m/s</b></div></div>
  <div class="hud-right"><div class="lives" aria-label="Lives"><span class="life">♥</span><span class="life">♥</span><span class="life">♥</span></div><button class="hud-pause" data-action="pause" data-i18n-label="hud.pause" aria-label="Pause">Ⅱ</button></div>
  <div class="tutorial-hint"></div><div class="touch"><div class="touch-stick"><i></i></div></div>
</section>
<section class="screen screen-modal" data-screen="pause"><div class="modal"><div class="eyebrow" data-i18n="game.eyebrow"></div><h2 class="modal-title" data-i18n="pause.title"></h2><p data-i18n="pause.message"></p><nav class="menu"><button data-nav class="btn btn-primary" data-action="resume"><span data-i18n="menu.resume"></span></button><button data-nav class="btn" data-action="restart"><span data-i18n="menu.retry"></span></button><button data-nav class="btn" data-action="settings"><span data-i18n="menu.settings"></span></button><button data-nav class="btn" data-action="quit"><span data-i18n="menu.title"></span></button></nav></div></section>
<section class="screen screen-modal" data-screen="settings"><div class="modal modal-settings"><div class="eyebrow" data-i18n="game.eyebrow"></div><h2 class="modal-title" data-i18n="settings.title"></h2><fieldset><legend data-i18n="settings.audio"></legend>${range('musicVolume', 'settings.water')}${range('sfxVolume', 'settings.effects')}${toggle('muted', 'settings.mute')}</fieldset><fieldset><legend data-i18n="settings.display"></legend><div class="setting-row"><span data-i18n="settings.quality"></span><div class="seg" data-setting="quality"><button data-nav data-value="low" data-i18n="settings.quality.low"></button><button data-nav data-value="medium" data-i18n="settings.quality.medium"></button><button data-nav data-value="high" data-i18n="settings.quality.high"></button></div></div>${toggle('reducedMotion', 'settings.reducedMotion')}</fieldset><p class="privacy-note" data-i18n="settings.privacy"></p><nav class="menu menu-row"><button data-nav class="btn" data-action="back"><span data-i18n="menu.back"></span></button></nav></div></section>
<section class="screen screen-modal" data-screen="results"><div class="modal modal-results"><div class="eyebrow" data-i18n="game.eyebrow"></div><h2 class="results-title modal-title" data-i18n="results.title"></h2><p class="results-message" data-i18n="results.message"></p><div class="results-best"></div><dl class="results-table"><div><dt data-i18n="results.fish"></dt><dd class="r-fish">0</dd></div><div><dt data-i18n="results.score"></dt><dd class="r-score">0</dd></div><div><dt data-i18n="results.distance"></dt><dd class="r-distance">0 m</dd></div><div><dt data-i18n="results.time"></dt><dd class="r-time">0 s</dd></div><div><dt data-i18n="results.best"></dt><dd class="r-best">0</dd></div></dl><nav class="menu menu-row"><button data-nav class="btn btn-primary" data-action="restart"><span data-i18n="menu.retry"></span></button><button data-nav class="btn" data-action="quit"><span data-i18n="menu.title"></span></button></nav></div></section>`
  }
}
