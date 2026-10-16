// Mountain-hunt end-to-end smoke: pnpm build must complete first.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const port = 4300 + Math.floor(Math.random() * 500)
const url = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: false })
let browser
let stage = 'startup'
const guard = setTimeout(() => fail('timed out'), 90_000)
function cleanup() { clearTimeout(guard); try { server.kill('SIGTERM') } catch {} }
async function fail(message) {
  cleanup()
  console.error(`smoke: FAIL (${stage}) — ${message}`)
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
    stalking: game.player.stalking,
    sprinting: game.player.sprinting,
    mapTracks: game.mapSnapshot.tracks.length,
    mapRadius: game.mapSnapshot.radius,
    wind: { ...game.mapSnapshot.wind },
    stamina: game.stamina,
    worldChunks: game.world.chunkCount,
    foodCount: game.food.count,
    hazardCount: game.hazards.count,
    riverLogCount: game.riverHazards.count,
    best: save.data.bestScore,
    bestFoods: save.data.bestCollected,
    health: game.run.health,
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
  await page.evaluate(() => { window.__game.game.nextHazard = 9999 })
  stage = 'desktop map and wind'
  const before = await state(page)
  if (!(await page.locator('.minimap').isVisible())) throw new Error('wildlife tracking minimap is not visible')
  if (!(before.mapTracks > 0 && before.mapRadius >= 160)) throw new Error(`nearby wildlife tracks are not disclosed on the map: ${JSON.stringify(before)}`)
  if (!Number.isFinite(before.wind.x) || !Number.isFinite(before.wind.z) || Math.hypot(before.wind.x, before.wind.z) < 0.9) throw new Error(`wind direction is missing from the tracking map: ${JSON.stringify(before.wind)}`)
  const initialKinds = await page.evaluate(() => [...new Set(window.__game.game.food.kinds)].sort())
  if (JSON.stringify(initialKinds) !== JSON.stringify(['coyote', 'deer', 'elk', 'fawn', 'honey', 'moose', 'rabbit', 'salmon'])) throw new Error(`the starting area must show all eight food species: ${JSON.stringify(initialKinds)}`)
  if (before.riverLogCount !== 5) throw new Error(`the river driftwood pool is missing or unbounded: ${before.riverLogCount}`)
  if (await page.locator('.life, .lives').count() !== 0) throw new Error('the obsolete heart/life HUD is still present')

  stage = 'river-only driftwood damage'
  const riverHit = await page.evaluate(() => {
    const { game, rules } = window.__game
    game.run = rules.createRun()
    const terrain = game.world.terrain
    const log = game.riverHazards.markers()[0]
    const atLog = game.player.position.clone().set(log.x, terrain.heightAt(log.x, log.z), log.z)
    const contact = game.riverHazards.collisions(atLog, atLog, terrain)
    const dryX = log.x + 12
    const dry = atLog.clone().set(dryX, terrain.heightAt(dryX, log.z), log.z)
    const dryContact = game.riverHazards.collisions(dry, dry, terrain)
    if (!contact) throw new Error('a bear in the river did not collide with a visible log')
    if (dryContact) throw new Error('river driftwood should not cause damage on dry land')
    game.riverHazards.deflect(contact.id, terrain)
    game['resolveDanger']('river-log', contact.position)
    const healthAfterLog = game.run.health
    game.run = rules.createRun()
    game.invulnerabilityTimer = 0
    game.player.reset()
    game.world.update(0, game.player.position)
    return { damage: 100 - healthAfterLog, dryContact: !!dryContact }
  })
  if (riverHit.damage !== 22 || riverHit.dryContact) throw new Error(`river log hit did not stay in its own hazard zone: ${JSON.stringify(riverHit)}`)

  stage = 'percentage health damage'
  await page.evaluate(() => {
    const { game } = window.__game
    if (!game.hazards.spawn('poison', game.player.position.clone(), game.world.terrain)) throw new Error('could not stage the poison hit on safe ground')
  })
  await page.waitForFunction(() => window.__game.game.run.health < 100, null, { timeout: 8_000, polling: 100 })
  const chipped = await state(page)
  if (chipped.run.health !== 64 || 'lives' in chipped.run || await page.locator('.health-bar').getAttribute('aria-valuenow') !== '64') {
    throw new Error(`a poison hit should chip the single health pool: ${JSON.stringify(chipped.run)}`)
  }

  stage = 'desktop stalk input'
  await page.keyboard.down('ControlLeft')
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__game.game.player.stalking && window.__game.game.player.speed > 0.2, null, { timeout: 15_000, polling: 100 })
  const stalked = await state(page)
  if (!stalked.stalking || stalked.sprinting || stalked.speed > stalked.speedLimit * 0.6) throw new Error(`Ctrl stalking was not slower than a run: ${JSON.stringify(stalked)}`)
  await page.keyboard.up('KeyW')
  await page.keyboard.up('ControlLeft')

  stage = 'desktop movement and speed ramp'
  await page.keyboard.down('KeyW')
  await page.waitForFunction(start => window.__game.game.run.distance > start + 0.65, before.run.distance, { timeout: 15_000, polling: 100 })
  await page.waitForFunction(() => window.__game.game.player.speed > 4.4, null, { timeout: 15_000, polling: 100 })
  await page.keyboard.up('KeyW')
  const afterMove = await state(page)
  if (afterMove.mode !== 'playing') throw new Error(`expected playing, got ${afterMove.mode}`)
  if (!(afterMove.run.elapsed > before.run.elapsed && afterMove.run.distance > before.run.distance)) throw new Error('survival time and movement distance did not advance')
  if (!(afterMove.pos.z < before.pos.z - 0.45)) throw new Error(`forward movement did not move the bear (${before.pos.z} → ${afterMove.pos.z})`)
  if (!(afterMove.speedLimit > before.speedLimit)) throw new Error('the available bear speed cap did not rise during the run')

  stage = 'honey pounce'
  await page.evaluate(() => {
    const { game } = window.__game
    game.food.spawn('honey', game.player.position.clone(), game.world.terrain)
  })
  await page.keyboard.down('KeyW')
  await page.keyboard.down('Space')
  await page.waitForFunction(() => window.__game.game.player.pounceCooldown > 0, null, { timeout: 8_000, polling: 100 })
  await page.keyboard.up('Space')
  await page.keyboard.up('KeyW')
  const hunted = await state(page)
  if (hunted.run.tally.honey !== 1 || hunted.run.score < 180) throw new Error(`pounce did not collect honey: ${JSON.stringify(hunted.run)}`)

  stage = 'readying controlled early-pounce case'
  const deerBefore = await page.evaluate(() => {
    const { game } = window.__game
    game.player.pounceCooldown = 0
    const point = game.player.position.clone().addScaledVector(game.player.forward, 1.5)
    point.y = game.world.terrain.heightAt(point.x, point.z)
    game.food.spawn('deer', point, game.world.terrain)
    return game.food.kinds.filter(kind => kind === 'deer').length - 1
  })
  stage = 'healthy prey early pounce'
  await page.keyboard.down('KeyW')
  await page.keyboard.down('Space')
  await page.waitForFunction(() => window.__game.game.player.pounceCooldown > 0, null, { timeout: 8_000, polling: 100 })
  await page.keyboard.up('Space')
  await page.waitForFunction(() => window.__game.game.player.pounceTimer <= 0, null, { timeout: 8_000, polling: 100 })
  await page.keyboard.up('KeyW')
  const earlyPounce = await state(page)
  const deerAfter = await page.evaluate(() => window.__game.game.food.kinds.filter(kind => kind === 'deer').length)
  if (earlyPounce.run.tally.deer !== 0 || deerAfter <= deerBefore) throw new Error('healthy wildlife was scored by an early pounce')

  stage = 'pause and settings'
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

  stage = 'hazards, results and local save'
  const dangers = await page.evaluate(() => {
    const { game, rules } = window.__game
    game.run = rules.eatFood(rules.createRun(), 'salmon').state
    const at = game.player.position.clone()
    const sequence = ['poison', 'trap', 'fall']
    const states = []
    for (const reason of sequence) {
      game['invulnerabilityTimer'] = 0
      game['recoveryTimer'] = 0
      game['resolveDanger'](reason, at)
      states.push({ reason, health: game.run.health, phase: game.run.phase })
      if (game.run.phase === 'lost') break
    }
    return { states, finalHealth: game.run.health, phase: game.run.phase, reason: game.run.loseReason }
  })
  const expectedHealth = [64, 20, 0]
  if (dangers.states.length !== 3 || dangers.states.some((hit, index) => hit.health !== expectedHealth[index]) || dangers.finalHealth !== 0 || dangers.phase !== 'lost' || dangers.reason !== 'fall') {
    throw new Error(`percentage-health/three-danger game-over thresholds failed: ${JSON.stringify(dangers)}`)
  }
  await page.waitForSelector('[data-screen="results"].is-active', { timeout: 10_000 })
  await page.waitForTimeout(250)
  const done = await state(page)
  if (done.best < 120 || done.bestFoods < 1) throw new Error('local best score/food count did not save')
  stage = 'far-coordinate streaming'
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

  stage = 'mobile controls'
  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' })
  const phonePage = await openGame(phone, errors)
  await phonePage.tap('[data-action="play"]')
  await phonePage.waitForSelector('[data-screen="hud"].is-active')
  await phonePage.evaluate(() => { window.__game.game.nextHazard = 9999 })
  if (!(await phonePage.locator('.hunt-button').isVisible())) throw new Error('mobile hunt/pounce button is not visible')
  if (!(await phonePage.locator('.sprint-button').isVisible())) throw new Error('mobile sprint button is not visible')
  if (!(await phonePage.locator('.touch-stick').isVisible())) throw new Error('mobile movement stick is not visible')
  if (!(await phonePage.locator('.minimap').isVisible())) throw new Error('mobile tracking map is not visible')
  const mobileStart = await state(phonePage)
  stage = 'mobile quiet stalking'
  await phonePage.evaluate(() => window.__game.input.setTouchMove(0, 0.25))
  await phonePage.waitForFunction(() => window.__game.game.player.stalking && window.__game.game.player.speed > 0.1, null, { timeout: 15_000, polling: 100 })
  const mobileStalk = await state(phonePage)
  if (!mobileStalk.stalking || mobileStalk.sprinting) throw new Error('gentle touch-stick input did not enter the quiet stalk pace')
  stage = 'mobile full movement'
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
  console.log('smoke: OK — endless map/wind/tracks, eight initial species, wading log pool and river-only damage, desktop/touch stalking, food pounce, river strike rules, percentage-health game over, land hazards, local save and pause/settings')
} catch (error) {
  await fail(error?.message ?? String(error))
}
