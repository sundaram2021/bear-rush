// End-to-end smoke test for the requested endless river runner; builds must exist in dist/ first.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const port = 4300 + Math.floor(Math.random() * 500)
const url = `http://127.0.0.1:${port}/`
const out = process.env.SHOTS_DIR ?? 'shots'
mkdirSync(out, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: false })
let browser
const guard = setTimeout(() => fail('timed out'), 120_000)

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
  const page = await context.newPage()
  page.on('console', message => message.type() === 'error' && errors.push(message.text()))
  page.on('pageerror', error => errors.push(String(error)))
  page.on('response', response => response.status() >= 400 && errors.push(`HTTP ${response.status()} ${response.url()}`))
  await page.goto(url)
  await page.waitForSelector('[data-screen="title"].is-active', { timeout: 30_000 })
  await page.evaluate(async () => {
    await document.fonts.ready
    if (document.documentElement.lang !== 'en') throw new Error(`Game must stay English-only; lang=${document.documentElement.lang}`)
    for (const selector of ['.logo-text', '.tagline']) {
      const family = getComputedStyle(document.querySelector(selector)).fontFamily
      if (!family.startsWith('"ManusCC0"') && !family.startsWith('ManusCC0,')) throw new Error(`Unexpected font: ${family}`)
    }
    if (![...document.fonts].some(face => face.family.replaceAll('"', '').replaceAll("'", '') === 'ManusCC0' && face.status === 'loaded')) {
      throw new Error('Bundled English font did not load')
    }
  })
  await page.waitForTimeout(300)
  return page
}
const state = page => page.evaluate(() => {
  const { game, save } = window.__game
  return { mode: game.mode, run: { ...game.run }, speed: game.speed, pos: { x: game.player.root.position.x, y: game.player.root.position.y, z: game.player.root.position.z }, best: save.data.bestScore }
})

try {
  await waitForServer()
  const args = ['--ignore-gpu-blocklist']
  browser = await chromium.launch({ args }).catch(() => chromium.launch({ args, channel: 'chrome' }))
  const errors = []
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'en-US' })
  const page = await openGame(desktop, errors)
  await page.screenshot({ path: `${out}/01-title.png` })
  await page.click('[data-action="play"]')
  await page.waitForSelector('[data-screen="hud"].is-active')
  const before = await state(page)
  await page.keyboard.down('KeyD')
  await page.waitForTimeout(500)
  await page.keyboard.up('KeyD')
  await page.waitForTimeout(1100)
  const after = await state(page)
  if (after.mode !== 'playing') throw new Error(`expected playing, got ${after.mode}`)
  if (!(after.run.elapsed > before.run.elapsed && after.run.distance > before.run.distance)) throw new Error('endless run distance/time did not advance')
  if (!(after.pos.x > before.pos.x + 0.2)) throw new Error(`keyboard steering failed (${before.pos.x} → ${after.pos.x})`)

  // Trigger a fish pickup through the same spawned-fish collection path used by gameplay.
  await page.evaluate(() => {
    const { game } = window.__game
    game['fish'].spawn(game.player.x, 0, 1)
    game.step(1 / 60)
  })
  const caught = await state(page)
  if (caught.run.collected < 1 || caught.run.score < 100) throw new Error('fish catch did not increase local run score')
  await page.screenshot({ path: `${out}/02-river-run.png` })

  await page.click('[data-action="pause"]')
  await page.waitForSelector('[data-screen="pause"].is-active')
  await page.click('[data-screen="pause"] [data-action="settings"]')
  await page.waitForSelector('[data-screen="settings"].is-active')
  await page.screenshot({ path: `${out}/03-settings.png` })
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-screen="pause"].is-active')
  if ((await state(page)).mode !== 'paused') throw new Error('returning from settings resumed the run')
  await page.click('[data-action="resume"]')
  await page.waitForSelector('[data-screen="hud"].is-active')

  // Call the actual collision handler and verify one hit per recovery window, then game over on hit three.
  const lives = await page.evaluate(() => {
    const { game } = window.__game
    game['handleTreeCollision']()
    const first = game.run.lives
    game['handleTreeCollision']()
    const blockedRepeat = game.run.lives
    game.run.invulnerable = 0
    game['handleTreeCollision']()
    const second = game.run.lives
    game.run.invulnerable = 0
    game['handleTreeCollision']()
    return { first, blockedRepeat, second, final: game.run.lives, mode: game.mode, phase: game.run.phase }
  })
  if (lives.first !== 2 || lives.blockedRepeat !== 2 || lives.second !== 1 || lives.final !== 0 || lives.mode !== 'ended' || lives.phase !== 'lost') {
    throw new Error(`three-life flow failed: ${JSON.stringify(lives)}`)
  }
  await page.waitForSelector('[data-screen="results"].is-active', { timeout: 5000 })
  await page.screenshot({ path: `${out}/04-three-lives-game-over.png` })
  const done = await state(page)
  if (done.best < 100) throw new Error('local personal best was not saved in browser storage')
  await desktop.close()

  // Browser language does not change the game's single shipped language.
  const zhContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'zh-CN' })
  const zhPage = await openGame(zhContext, errors)
  await zhPage.screenshot({ path: `${out}/05-english-on-non-english-browser.png` })
  await zhContext.close()

  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' })
  const phonePage = await openGame(phone, errors)
  await phonePage.tap('[data-action="play"]')
  await phonePage.waitForSelector('[data-screen="hud"].is-active')
  await phonePage.waitForTimeout(1100)
  await phonePage.screenshot({ path: `${out}/06-mobile-hud.png` })
  await phone.close()

  if (errors.length) throw new Error(`browser errors:\n  ${errors.join('\n  ')}`)
  await browser.close()
  cleanup()
  console.log(`smoke: OK — steering, fish scoring, pause/settings, three lives, local best, English-only and mobile HUD (${out}/)`)
} catch (error) {
  await fail(error?.message ?? String(error))
}
