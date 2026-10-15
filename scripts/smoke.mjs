// End-to-end smoke for the revised bank-side fishing game; pnpm build must complete first.
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
  })
  return page
}
const state = page => page.evaluate(() => {
  const { game, save } = window.__game
  return {
    mode: game.mode,
    run: { ...game.run },
    speed: game.speed,
    pos: { x: game.player.root.position.x, y: game.player.root.position.y, z: game.player.root.position.z },
    best: save.data.bestScore,
    ready: game['fish'].isCatchReady(game.player.position),
  }
})

try {
  await waitForServer()
  browser = await chromium.launch({ args: ['--ignore-gpu-blocklist'] }).catch(() => chromium.launch({ args: ['--ignore-gpu-blocklist'], channel: 'chrome' }))
  const errors = []
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'en-US' })
  const page = await openGame(desktop, errors)
  await page.screenshot({ path: `${out}/01-title.png` })
  await page.click('[data-action="play"]')
  await page.waitForSelector('[data-screen="hud"].is-active')
  const before = await state(page)
  await page.keyboard.down('KeyD')
  await page.waitForTimeout(450)
  await page.keyboard.up('KeyD')
  await page.waitForTimeout(250)
  const after = await state(page)
  if (after.mode !== 'playing') throw new Error(`expected playing, got ${after.mode}`)
  if (!(after.run.elapsed > before.run.elapsed && after.run.distance > before.run.distance)) throw new Error('river distance/time did not advance')
  if (!(after.pos.x > before.pos.x + 0.08 || after.pos.z < before.pos.z - 0.08)) throw new Error(`bank movement did not move the bear (${before.pos.x},${before.pos.z} → ${after.pos.x},${after.pos.z})`)

  // A fish directly beside the bear is NOT caught passively; it must leap and receive a Catch action.
  await page.evaluate(() => {
    const { game } = window.__game
    game['fish'].reset()
    game['fish'].spawn(game.player.z - 0.1, game.player.position.x - game.world.riverCenterX(game.player.z), 0)
    game['fish'].step(0, game.speed, game.world, game.player.z)
  })
  const beforeCatch = await state(page)
  if (beforeCatch.run.collected !== 0) throw new Error('fish was collected without an explicit catch')
  await page.keyboard.press('Space')
  await page.waitForTimeout(80)
  const caught = await state(page)
  if (caught.run.collected !== 1 || caught.run.score < 100) throw new Error('timed fish catch did not increase fish and score')
  await page.screenshot({ path: `${out}/02-river-fishing.png` })

  // Exercise collision rules via distinct game collision calls (each hazard is consumed once).
  const hits = await page.evaluate(async () => {
    const { game, rules } = window.__game
    game.player.reset()
    const point = game.player.position.clone()
    const bankOffset = point.x - game.world.riverCenterX(point.z)
    game['obstacles'].reset()
    game['obstacles'].spawn('block', game.player.z, bankOffset)
    game['obstacles'].step(0, 0, game.world, game.player.z)
    const first = game['obstacles'].collisions(point)
    if (first.length !== 1) throw new Error('first block did not collide')
    const wood1 = rules.hitSmallBlock(game.run).state
    game.run = wood1
    game['obstacles'].spawn('block', game.player.z, bankOffset)
    game['obstacles'].step(0, 0, game.world, game.player.z)
    const second = game['obstacles'].collisions(point)
    const afterSecond = rules.hitSmallBlock(game.run)
    game.run = afterSecond.state
    const blockResult = { lives: game.run.lives, blockHits: game.run.blockHits, secondLifeLost: afterSecond.lifeLost }
    const algaeResult = rules.eatAlgae(game.run)
    return { blockResult, algaeLifeLost: algaeResult.lifeLost, algaeLives: algaeResult.state.lives, distinct: second.length === 1 }
  })
  if (hits.blockResult.lives !== 2 || hits.blockResult.blockHits !== 0 || !hits.blockResult.secondLifeLost || !hits.distinct) throw new Error(`two-block rule failed: ${JSON.stringify(hits)}`)
  if (!hits.algaeLifeLost || hits.algaeLives !== 1) throw new Error(`algae one-life rule failed: ${JSON.stringify(hits)}`)

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

  // Isolated run reaches game over only after 3 algae hazards; local best persists.
  const end = await page.evaluate(async () => {
    const { game } = window.__game
    const { rules } = window.__game
    game.run = rules.createRun()
    game.run = rules.collect(game.run).state
    game.run = rules.eatAlgae(rules.eatAlgae(rules.eatAlgae(game.run).state).state).state
    game['finishRun']()
    return { phase: game.run.phase, lives: game.run.lives, mode: game.mode }
  })
  if (end.phase !== 'lost' || end.lives !== 0 || end.mode !== 'ended') throw new Error(`three-life end state failed: ${JSON.stringify(end)}`)
  await page.waitForSelector('[data-screen="results"].is-active', { timeout: 5000 })
  await page.screenshot({ path: `${out}/04-three-lives-results.png` })
  const done = await state(page)
  if (done.best < 100) throw new Error('local personal best was not saved')
  await desktop.close()

  const zhContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'zh-CN' })
  const zhPage = await openGame(zhContext, errors)
  await zhContext.close()

  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' })
  const phonePage = await openGame(phone, errors)
  await phonePage.tap('[data-action="play"]')
  await phonePage.waitForSelector('[data-screen="hud"].is-active')
  const catchButton = phonePage.locator('.catch-button')
  if (!(await catchButton.isVisible())) throw new Error('mobile Catch button is not visible')
  await phonePage.screenshot({ path: `${out}/05-mobile-fishing-hud.png` })
  await phone.close()

  if (errors.length) throw new Error(`browser errors:\n  ${errors.join('\n  ')}`)
  await browser.close()
  cleanup()
  console.log(`smoke: OK — bank movement, deliberate catch, paired blocks, algae damage, three lives, local best, English-only and touch Catch (${out}/)`)
} catch (error) {
  await fail(error?.message ?? String(error))
}
