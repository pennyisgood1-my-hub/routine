import type { DayLog, DayPlan, MonthSchedule, NightType, Product, Signal } from '../schema'
import { NIGHT_TYPES, SIGNALS } from '../schema'
import { productMap } from './rules'
import { datesOfMonth } from './dates'

export interface Progress {
  done: number
  total: number
  pct: number // 0~100 정수
  morningDone: number
  morningTotal: number
  nightDone: number
  nightTotal: number
  deviceApplicable: boolean
  deviceDone: boolean
  sunscreenDone: boolean
}

export function emptyLog(date: string): DayLog {
  return { date, doneMorning: [], doneNight: [], deviceDone: false, sunscreenDone: false }
}

/** 아침 체크리스트에서 선크림 태그 제품은 제외 (상단 "선크림 바름" 토글이 대신함) */
export function morningChecklist(plan: DayPlan, products: Product[]): string[] {
  const map = productMap(products)
  return plan.morning.filter((id) => !map.get(id)?.tags.includes('sunscreen'))
}

export function sunscreenProducts(plan: DayPlan, products: Product[]): string[] {
  const map = productMap(products)
  return plan.morning.filter((id) => map.get(id)?.tags.includes('sunscreen'))
}

/**
 * 완료율. 전체 = 아침(선크림 제외) + 밤 + 기기(쉼이 아닐 때 1) + 선크림(항상 1)
 */
export function dayProgress(plan: DayPlan, log: DayLog | undefined, products: Product[]): Progress {
  const l = log ?? emptyLog(plan.date)
  const morningIds = morningChecklist(plan, products)
  const morningDone = morningIds.filter((id) => l.doneMorning.includes(id)).length
  const nightDone = plan.night.filter((id) => l.doneNight.includes(id)).length
  const deviceApplicable = plan.device !== '쉼'
  const deviceDone = deviceApplicable && l.deviceDone
  const total = morningIds.length + plan.night.length + (deviceApplicable ? 1 : 0) + 1
  const done = morningDone + nightDone + (deviceDone ? 1 : 0) + (l.sunscreenDone ? 1 : 0)
  return {
    done,
    total,
    pct: total === 0 ? 100 : Math.round((done / total) * 100),
    morningDone,
    morningTotal: morningIds.length,
    nightDone,
    nightTotal: plan.night.length,
    deviceApplicable,
    deviceDone,
    sunscreenDone: l.sunscreenDone,
  }
}

export interface SummaryRow {
  date: string
  plan?: DayPlan
  log?: DayLog
  elapsed: boolean // 오늘 포함 과거
  progress?: Progress
}

export interface MissedProduct {
  id: string
  name: string
  missed: number
  planned: number
}

export interface MonthSummary {
  month: string
  daysPlanned: number
  daysElapsed: number
  overallPct: number
  sunscreenPct: number
  nightTypeStats: Record<NightType, { planned: number; done: number }>
  devicePlanned: number
  deviceDone: number
  signals: Record<Signal, number>
  flagged: { date: string; signal: Signal; memo?: string; skinNote?: string }[]
  rows: SummaryRow[]
  missedTop: MissedProduct[]
}

/**
 * 월간 정리. 완료율/준수율은 "오늘 포함 과거의 계획된 날"만 분모로 삼는다.
 */
export function summarizeMonth(
  month: string,
  schedule: MonthSchedule | undefined,
  logs: Record<string, DayLog>,
  products: Product[],
  today: string,
): MonthSummary {
  const map = productMap(products)
  const planByDate = new Map((schedule?.days ?? []).map((d) => [d.date, d]))
  const rows: SummaryRow[] = datesOfMonth(month).map((date) => {
    const plan = planByDate.get(date)
    const log = logs[date]
    const elapsed = date <= today
    return { date, plan, log, elapsed, progress: plan ? dayProgress(plan, log, products) : undefined }
  })

  const elapsedPlanned = rows.filter((r) => r.plan && r.elapsed)
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  const totalItems = sum(elapsedPlanned.map((r) => r.progress!.total))
  const doneItems = sum(elapsedPlanned.map((r) => r.progress!.done))

  const nightTypeStats = Object.fromEntries(NIGHT_TYPES.map((t) => [t, { planned: 0, done: 0 }])) as MonthSummary['nightTypeStats']
  rows.forEach((r) => {
    if (!r.plan) return
    nightTypeStats[r.plan.nightType].planned++
    if (r.elapsed && r.progress && (r.plan.night.length === 0 || r.progress.nightDone === r.progress.nightTotal)) {
      nightTypeStats[r.plan.nightType].done++
    }
  })

  const signals = Object.fromEntries(SIGNALS.map((s) => [s, 0])) as Record<Signal, number>
  const flagged: MonthSummary['flagged'] = []
  rows.forEach((r) => {
    const s = r.log?.signal
    if (!s) return
    signals[s]++
    if (s !== '초록') flagged.push({ date: r.date, signal: s, memo: r.log?.memo, skinNote: r.log?.skinNote })
  })

  // 자주 빼먹은 제품: 과거 계획된 날 기준 (선크림 제품은 토글 기준)
  const missed = new Map<string, MissedProduct>()
  const bump = (id: string, done: boolean) => {
    const m = missed.get(id) ?? { id, name: map.get(id)?.name ?? id, missed: 0, planned: 0 }
    m.planned++
    if (!done) m.missed++
    missed.set(id, m)
  }
  elapsedPlanned.forEach((r) => {
    const plan = r.plan!
    const log = r.log ?? emptyLog(r.date)
    plan.morning.forEach((id) => {
      const isSun = map.get(id)?.tags.includes('sunscreen')
      bump(id, isSun ? log.sunscreenDone : log.doneMorning.includes(id))
    })
    plan.night.forEach((id) => bump(id, log.doneNight.includes(id)))
  })
  const missedTop = Array.from(missed.values())
    .filter((m) => m.missed > 0)
    .sort((a, b) => b.missed - a.missed || b.planned - a.planned)
    .slice(0, 5)

  return {
    month,
    daysPlanned: rows.filter((r) => r.plan).length,
    daysElapsed: elapsedPlanned.length,
    overallPct: totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100),
    sunscreenPct: elapsedPlanned.length === 0 ? 0 : Math.round((elapsedPlanned.filter((r) => r.log?.sunscreenDone).length / elapsedPlanned.length) * 100),
    nightTypeStats,
    devicePlanned: elapsedPlanned.filter((r) => r.plan!.device !== '쉼').length,
    deviceDone: elapsedPlanned.filter((r) => r.plan!.device !== '쉼' && r.log?.deviceDone).length,
    signals,
    flagged,
    rows,
    missedTop,
  }
}
