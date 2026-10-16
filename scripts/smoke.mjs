// Mountain-hunt end-to-end smoke: pnpm build must complete first.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const port = 4300 + Math.floor(Math.random() * 500)
const url = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: false })
let browser
const guard = setTimeout(() => fail('timed out'), 60_000)
function cleanup() { clearTimeout(guard); try { server.kill('SIGTERM') } catch {} }
async function fail(message) {
  cleanup()
  console.error(`smoke: FAIL — ${message}`)
  await browser?.close().catch(() => {})
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
    if (document.querySelector('input[type="password"]')) throw new Error('The game must not ask for account credentials')
    window.__game.save.update({ quality: 'low' })
    window.__game.game.setQuality('low')
  })
  return page
}
const state = page => page.evaluate(() => {
  const { game, save } = window.__game
  return {
    mode: game.mode,
    run: { ...game.run, tally: { ...game.run.tally } },
    speed: game.speed,
    speedLimit: game.speedLimit,
    pos: { x: game.player.position.x, y: game.player.position.y, z: game.player.position.z },
    weather: game.weather,
    mapTracks: game.mapSnapshot.tracks.length,
    mapRadius: game.mapSnapshot.radius,
    stamina: game.stamina,
    worldChunks: game.world.chunkCount,
    foodCount: game.food.count,
    hazardCount: game.hazards.count,
    best: save.data.bestScore,
    bestFoods: save.data.bestCollected,
  }
})

try {
  await waitForServer()
  browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] })
    .catch(() => chromium.launch({ args: ['--ignore-gpu-blocklist'], channel: 'chrome' }))
  const errors = []
  const desktop = await browser.newContext({ viewport: { width: 1360, height: 820 }, locale: 'en-US' })
  const page = await openGame(desktop, errors)
  await page.click('[data-action="play"]')
  await page.waitForSelector('[data-screen="hud"].is-active')
  const before = await state(page)
  if (!(await page.locator('.minimap').isVisible())) throw new Error('wildlife tracking minimap is not visible')
  if (!(before.mapTracks > 0 && before.mapRadius >= 160)) throw new Error(`nearby wildlife tracks are not disclosed on the map: ${JSON.stringify(before)}`)

  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__game.game.run.distance > 0.65, null, { timeout: 15_000, polling: 100 })
  await page.keyboard.up('KeyW')
  const afterMove = await state(page)
  if (afterMove.mode !== 'playing') throw new Error(`expected playing, got ${afterMove.mode}`)
  if (!(afterMove.run.elapsed > before.run.elapsed && afterMove.run.distance > before.run.distance)) throw new Error('survival time and movement distance did not advance')
  if (!(afterMove.pos.z < before.pos.z - 0.45)) throw new Error(`forward movement did not move the bear (${before.pos.z} → ${afterMove.pos.z})`)
  if (!(afterMove.speedLimit > before.speedLimit)) throw new Error('the available bear speed cap did not rise during the run')

  await page.evaluate(() => {
    const { game } = window.__game
    game.food.spawn('honey', game.player.position.clone(), game.world.terrain)
  })
  await page.keyboard.down('Space')
  await page.waitForTimeout(1000)
  await page.keyboard.up('Space')
  const hunted = await state(page)
  if (hunted.run.tally.honey !== 1 || hunted.run.score < 180) throw new Error(`pounce did not collect honey: ${JSON.stringify(hunted.run)}`)

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('game:pause')))
  await page.waitForSelector('[data-screen="pause"].is-active')
  await page.click('[data-screen="pause"] [data-action="settings"]')
  await page.waitForSelector('[data-screen="settings"].is-active')
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-screen="pause"].is-active')
  if ((await state(page)).mode !== 'paused') throw new Error('returning from settings resumed the hunt')
  await page.click('[data-action="resume"]')
  await page.waitForSelector('[data-screen="hud"].is-active')

  const dangers = await page.evaluate(() => {
    const { game, rules } = window.__game
    game.run = rules.eatFood(rules.createRun(), 'salmon').state
    const at = game.player.position.clone()
    game['resolveDanger']('poison', at)
    const poisonLives = game.run.lives
    game['invulnerabilityTimer'] = 0
    game['recoveryTimer'] = 0
    game['resolveDanger']('trap', at)
    const trapLives = game.run.lives
    game['invulnerabilityTimer'] = 0
    game['recoveryTimer'] = 0
    game['resolveDanger']('fall', at)
    return { poisonLives, trapLives, finalLives: game.run.lives, phase: game.run.phase, reason: game.run.loseReason }
  })
  if (dangers.poisonLives !== 2 || dangers.trapLives !== 1 || dangers.finalLives !== 0 || dangers.phase !== 'lost' || dangers.reason !== 'fall') {
    throw new Error(`three-danger/three-life rule failed: ${JSON.stringify(dangers)}`)
  }
  await page.waitForSelector('[data-screen="results"].is-active', { timeout: 10_000 })
  await page.waitForTimeout(250)
  const done = await state(page)
  if (done.best < 120 || done.bestFoods < 1) throw new Error('local best score/food count did not save')
  const endless = await page.evaluate(() => {
    const { game } = window.__game
    const x = 4_800; const z = -7_800
    game.player.position.set(x, game.world.terrain.heightAt(x, z), z)
    game.player.root.position.copy(game.player.position)
    game.world.update(0.1, game.player.position)
    return { x: game.player.position.x, z: game.player.position.z, chunks: game.world.chunkCount }
  })
  if (endless.x !== 4_800 || endless.z !== -7_800 || endless.chunks !== 25) throw new Error(`far-coordinate streaming failed: ${JSON.stringify(endless)}`)
  await desktop.close()

  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' })
  const phonePage = await openGame(phone, errors)
  await phonePage.tap('[data-action="play"]')
  await phonePage.waitForSelector('[data-screen="hud"].is-active')
  if (!(await phonePage.locator('.hunt-button').isVisible())) throw new Error('mobile hunt/pounce button is not visible')
  if (!(await phonePage.locator('.sprint-button').isVisible())) throw new Error('mobile sprint button is not visible')
  if (!(await phonePage.locator('.touch-stick').isVisible())) throw new Error('mobile movement stick is not visible')
  if (!(await phonePage.locator('.minimap').isVisible())) throw new Error('mobile tracking map is not visible')
  const mobileStart = await state(phonePage)
  await phonePage.evaluate(() => window.__game.input.setTouchMove(0, 1))
  await phonePage.waitForFunction(() => window.__game.game.run.distance > 0.5, null, { timeout: 15_000, polling: 100 })
  await phonePage.evaluate(() => window.__game.input.setTouchMove(0, 0))
  await phonePage.waitForTimeout(120)
  const mobileAfter = await state(phonePage)
  if (mobileAfter.pos.z >= mobileStart.pos.z - 0.1) throw new Error('touch movement did not move the bear')
  await phone.close()

  if (errors.length) throw new Error(`browser errors:\n  ${errors.join('\n  ')}`)
  await browser.close()
  cleanup()
  console.log('smoke: OK — infinite-world map/tracks, desktop movement/speed ramp, pounce/honey, three-only danger outcomes, local best, pause/settings and mobile touch/hunt/sprint controls')
} catch (error) {
  await fail(error?.message ?? String(error))
}
