// End-to-end smoke for the 3D mountain hunt; pnpm build must complete first.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const port = 4300 + Math.floor(Math.random() * 500)
const url = `http://127.0.0.1:${port}/`
const out = process.env.SHOTS_DIR ?? 'shots'
mkdirSync(out, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: false })
let browser
const guard = setTimeout(() => fail('timed out'), 150_000)
function cleanup() { clearTimeout(guard); try { server.kill('SIGTERM') } catch {} }
async function fail(message) {
  console.error(`smoke: FAIL — ${message}`)
  await browser?.close().catch(() => {})
  cleanup()
  process.exit(1)
}
async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(url)).ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('preview server did not start')
}
async function openGame(context, errors) {
  // Software WebGL is slow; run the smoke at low quality so screenshots stay affordable.
  await context.addInitScript(() => {
    try {
      localStorage.setItem('bearrush.save', JSON.stringify({ version: 2, musicVolume: 0.7, sfxVolume: 0.8, muted: true, quality: 'low', reducedMotion: true, tutorialDone: false, bestScore: 0, bestFish: 0, bestDistance: 0, bestTime: 0 }))
    } catch {}
  })
  const page = await context.newPage()
  page.setDefaultTimeout(60_000)
  page.on('console', message => message.type() === 'error' && errors.push(message.text()))
  page.on('pageerror', error => errors.push(String(error)))
  page.on('response', response => response.status() >= 400 && errors.push(`HTTP ${response.status()} ${response.url()}`))
  await page.goto(url)
  await page.waitForSelector('[data-screen="title"].is-active', { timeout: 30_000 })
  await page.evaluate(async () => {
    await document.fonts.ready
    if (document.documentElement.lang !== 'en') throw new Error(`Game must stay English-only; lang=${document.documentElement.lang}`)
  })
  return page
}
const state = page => page.evaluate(() => {
  const { game, save } = window.__game
  return {
    mode: game.mode,
    run: { ...game.run },
    speed: game.speed,
    snowfall: game.snowfall,
    pos: { x: game.player.root.position.x, y: game.player.root.position.y, z: game.player.root.position.z },
    best: save.data.bestScore,
    snow: game.world.scene.children.length,
  }
})

try {
  await waitForServer()
  browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] })
  const errors = []
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'en-US' })
  const page = await openGame(desktop, errors)
  await page.click('[data-action="play"]')
  await page.waitForSelector('[data-screen="hud"].is-active')
  const before = await state(page)
  if (before.snow < 5) throw new Error('world scene was not populated')
  await page.keyboard.down('Shift')
  await page.keyboard.down('KeyW')
  await page.waitForFunction(target => window.__game.game.run.distance > target, before.run.distance + 0.5, { timeout: 8000 })
  await page.keyboard.up('KeyW')
  await page.keyboard.up('Shift')
  const after = await state(page)
  if (after.mode !== 'playing') throw new Error(`expected playing, got ${after.mode}`)
  if (!(after.run.elapsed > before.run.elapsed && after.run.distance > before.run.distance)) throw new Error(`hunt distance/time did not advance: before=${JSON.stringify(before.run)} after=${JSON.stringify(after.run)}`)
  const moved = Math.hypot(after.pos.x - before.pos.x, after.pos.z - before.pos.z)
  if (!(moved > 0.3)) throw new Error(`bear did not roam the mountain (moved ${moved})`)
  await page.screenshot({ path: `${out}/02-mountain-hunt.png` })

  // A bear standing on food eats it on contact.
  const ate = await page.evaluate(() => {
    const { game } = window.__game
    const terrain = game.world.terrain
    const p = game.player.position
    const spawned = game.food.spawn('honey', terrain, p, () => 0.5, 0.0001)
    const collectedBefore = game.run.collected
    game.resolveEating()
    return { spawned, before: collectedBefore, after: game.run.collected, score: game.run.score }
  })
  if (!ate.spawned || ate.after !== ate.before + 1 || ate.score < 180) throw new Error(`proximity eat failed: ${JSON.stringify(ate)}`)

  // Each of the three dangers removes one life; game over only at zero.
  const threats = await page.evaluate(() => {
    const { game, rules } = window.__game
    game.run = rules.createRun()
    game.run = rules.loseLife(game.run, 'poison').state
    game.run = rules.loseLife(game.run, 'trap').state
    const final = rules.loseLife(game.run, 'fall')
    game.run = final.state
    return { lives: game.run.lives, phase: game.run.phase, reason: game.run.loseReason }
  })
  if (threats.lives !== 0 || threats.phase !== 'lost' || threats.reason !== 'fall') throw new Error(`three dangers failed: ${JSON.stringify(threats)}`)

  await page.click('[data-action="pause"]')
  await page.waitForSelector('[data-screen="pause"].is-active')
  await page.click('[data-screen="pause"] [data-action="settings"]')
  await page.waitForSelector('[data-screen="settings"].is-active')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/03-settings.png` })
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-screen="pause"].is-active')
  if ((await state(page)).mode !== 'paused') throw new Error('returning from settings resumed the hunt')
  await page.click('[data-action="resume"]')
  await page.waitForSelector('[data-screen="hud"].is-active')

  // Finish a scoring run and confirm the local best persists.
  const end = await page.evaluate(async () => {
    const { game, rules } = window.__game
    game.run = rules.createRun()
    game.run = rules.eatFood(game.run, 'moose').state
    game.run = rules.loseLife(rules.loseLife(rules.loseLife(game.run, 'trap').state, 'poison').state, 'fall').state
    game.finishRun()
    return { phase: game.run.phase, lives: game.run.lives, mode: game.mode }
  })
  if (end.phase !== 'lost' || end.lives !== 0 || end.mode !== 'ended') throw new Error(`end state failed: ${JSON.stringify(end)}`)
  await page.waitForSelector('[data-screen="results"].is-active', { timeout: 5000 })
  const activeScreen = await page.evaluate(() => document.getElementById('ui').dataset.activeScreen)
  if (activeScreen !== 'results') throw new Error(`expected results screen, got ${activeScreen}`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/04-results.png` })
  const done = await state(page)
  if (done.best < 650) throw new Error('local personal best was not saved')
  await desktop.close()

  const zhContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'zh-CN' })
  const zhPage = await openGame(zhContext, errors)
  await zhPage.screenshot({ path: `${out}/01-title.png` })
  await zhContext.close()

  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' })
  const phonePage = await openGame(phone, errors)
  await phonePage.tap('[data-action="play"]')
  await phonePage.waitForSelector('[data-screen="hud"].is-active')
  if (!(await phonePage.locator('.catch-button').isVisible())) throw new Error('mobile Pounce button is not visible')
  if (!(await phonePage.locator('.sprint-button').isVisible())) throw new Error('mobile Sprint button is not visible')
  await phonePage.screenshot({ path: `${out}/05-mobile-hunt-hud.png` })
  await phone.close()

  if (errors.length) throw new Error(`browser errors:\n  ${errors.join('\n  ')}`)
  await browser.close()
  cleanup()
  console.log(`smoke: OK — roaming, proximity eat, three dangers, end state, local best, English-only and touch controls (${out}/)`)
} catch (error) {
  await fail(error?.message ?? String(error))
}
