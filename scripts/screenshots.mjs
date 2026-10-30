// 360×800 뷰포트로 탭별 스크린샷 5장 → screenshots/
// 사용: npm run build && npm run screenshots   (처음 한 번: npx playwright install chromium)
import { chromium } from 'playwright'
import { preview } from 'vite'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'screenshots')
mkdirSync(outDir, { recursive: true })

// 시드 일정(2026-11)이 보이도록 "오늘"을 2026-11-05 저녁으로 고정
const FAKE_NOW = new Date(2026, 10, 5, 20, 30)
const PORT = 4199

const server = await preview({ root, preview: { port: PORT, strictPort: true, open: false }, logLevel: 'silent' })
const base = `http://localhost:${PORT}`

// 캘린더·정리 화면이 비어 보이지 않게 11/1~11/4 기록을 미리 넣는다
const seedLogs = {
  schemaVersion: 1,
  logs: {
    '2026-10-30': { date: '2026-10-30', doneMorning: [], doneNight: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], deviceDone: false, sunscreenDone: false, signal: '초록' },
    '2026-10-31': { date: '2026-10-31', doneMorning: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], doneNight: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], deviceDone: false, sunscreenDone: true, signal: '초록' },
    '2026-11-01': { date: '2026-11-01', doneMorning: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], doneNight: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], deviceDone: false, sunscreenDone: true, signal: '초록', skinNote: '입술1 코피X 붉기1 따가움X 트러블0 기분3' },
    '2026-11-02': { date: '2026-11-02', doneMorning: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], doneNight: ['bplain-foam', 'acnin', 'cream-rx', 'rx-meds'], deviceDone: false, sunscreenDone: true, signal: '초록', skinNote: '입술2 코피X 붉기1 따가움X 트러블1 기분2' },
    '2026-11-03': { date: '2026-11-03', doneMorning: ['bplain-foam', 'acnin', 'rx-meds'], doneNight: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], deviceDone: false, sunscreenDone: true, signal: '노랑', skinNote: '입술2 코피X 붉기2 따가움O 트러블1 기분2', memo: '크림 늘림' },
    '2026-11-04': { date: '2026-11-04', doneMorning: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], doneNight: ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds'], deviceDone: false, sunscreenDone: false, signal: '노랑', skinNote: '입술3 코피X 붉기2 따가움O 트러블0 기분2' },
    '2026-11-05': { date: '2026-11-05', doneMorning: ['bplain-foam', 'acnin', 'torriden-serum', 'rx-meds'], doneNight: [], deviceDone: false, sunscreenDone: true },
  },
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, locale: 'ko-KR', colorScheme: 'light' })
await context.addInitScript((logs) => {
  localStorage.setItem('routine.v1.logs', JSON.stringify(logs))
  localStorage.setItem('routine.v1.settings', JSON.stringify({ schemaVersion: 1, theme: 'light' }))
}, seedLogs)
const page = await context.newPage()
await page.clock.install({ time: FAKE_NOW })

const shots = [
  ['01-today', '/#/'],
  ['02-calendar', '/#/calendar'],
  ['03-summary', '/#/summary'],
  ['04-safety', '/#/safety'],
  ['05-settings', '/#/settings'],
]
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

for (const [name, path] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: false })
  console.log('saved', `screenshots/${name}.png`)
}

await browser.close()
await server.close()
if (errors.length) {
  console.error('페이지 오류:', errors)
  process.exit(1)
}
