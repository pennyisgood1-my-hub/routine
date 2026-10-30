import { describe, it, expect } from 'vitest'
import { dayProgress, summarizeMonth, morningChecklist } from '../lib/progress'
import { DEFAULT_PRODUCTS } from '../data/products'
import type { DayPlan, DayLog, MonthSchedule } from '../schema'

const P = DEFAULT_PRODUCTS
const plan: DayPlan = {
  date: '2026-11-05', nightType: '레티날',
  morning: ['bplain-foam', 'b3zinc', 'dermablock-daily'],
  night: ['bplain-foam', 'exo-retinal'],
  device: '쉼',
}

describe('dayProgress', () => {
  it('선크림 제품은 아침 체크리스트에서 빠지고 토글 1개로 센다', () => {
    expect(morningChecklist(plan, P)).toEqual(['bplain-foam', 'b3zinc'])
    const p = dayProgress(plan, undefined, P)
    expect(p.total).toBe(2 + 2 + 0 + 1)
    expect(p.done).toBe(0)
    expect(p.pct).toBe(0)
  })

  it('전부 완료 → 100%', () => {
    const log: DayLog = { date: plan.date, doneMorning: ['bplain-foam', 'b3zinc'], doneNight: ['bplain-foam', 'exo-retinal'], deviceDone: false, sunscreenDone: true }
    expect(dayProgress(plan, log, P).pct).toBe(100)
  })

  it('기기 슬롯이 쉼이 아니면 전체에 1 추가, deviceDone 반영', () => {
    const p2 = { ...plan, device: '밤' as const }
    const log: DayLog = { date: plan.date, doneMorning: [], doneNight: [], deviceDone: true, sunscreenDone: false }
    const p = dayProgress(p2, log, P)
    expect(p.total).toBe(6)
    expect(p.done).toBe(1)
    expect(p.deviceApplicable).toBe(true)
  })

  it('계획에 없는 제품을 체크해도 완료 수에 포함되지 않음', () => {
    const log: DayLog = { date: plan.date, doneMorning: ['zeroid'], doneNight: ['txa6'], deviceDone: true, sunscreenDone: false }
    expect(dayProgress(plan, log, P).done).toBe(0)
  })
})

describe('summarizeMonth', () => {
  const ms: MonthSchedule = {
    schemaVersion: 1, month: '2026-11',
    days: [
      { date: '2026-11-01', nightType: '미백', morning: ['bplain-foam', 'dermablock-daily'], night: ['txa6'], device: '밤' },
      { date: '2026-11-02', nightType: '레티날', morning: ['bplain-foam', 'dermablock-daily'], night: ['exo-retinal'], device: '쉼' },
      { date: '2026-11-03', nightType: '모공', morning: ['bplain-foam', 'dermablock-daily'], night: ['stridex'], device: '쉼' },
    ],
  }
  const logs: Record<string, DayLog> = {
    '2026-11-01': { date: '2026-11-01', doneMorning: ['bplain-foam'], doneNight: ['txa6'], deviceDone: true, sunscreenDone: true, signal: '초록' },
    '2026-11-02': { date: '2026-11-02', doneMorning: [], doneNight: [], deviceDone: false, sunscreenDone: false, signal: '빨강', memo: '따가움' },
  }

  it('오늘 포함 과거만 분모로, 미래는 제외', () => {
    const s = summarizeMonth('2026-11', ms, logs, P, '2026-11-02')
    expect(s.daysPlanned).toBe(3)
    expect(s.daysElapsed).toBe(2)
    // 11/1: total 1+1+1+1=4 done 4 / 11/2: total 1+1+0+1=3 done 0 → 4/7
    expect(s.overallPct).toBe(57)
    expect(s.sunscreenPct).toBe(50)
    expect(s.deviceDone).toBe(1)
    expect(s.devicePlanned).toBe(1)
  })

  it('nightType별 계획/실행, 신호등 분포, 빨강 목록', () => {
    const s = summarizeMonth('2026-11', ms, logs, P, '2026-11-02')
    expect(s.nightTypeStats.미백).toEqual({ planned: 1, done: 1 })
    expect(s.nightTypeStats.레티날).toEqual({ planned: 1, done: 0 })
    expect(s.nightTypeStats.모공).toEqual({ planned: 1, done: 0 })
    expect(s.signals).toEqual({ 초록: 1, 노랑: 0, 빨강: 1 })
    expect(s.flagged).toEqual([{ date: '2026-11-02', signal: '빨강', memo: '따가움', skinNote: undefined }])
  })

  it('자주 빼먹은 제품 TOP', () => {
    const s = summarizeMonth('2026-11', ms, logs, P, '2026-11-02')
    const ids = s.missedTop.map((m) => m.id)
    expect(ids).toContain('exo-retinal')
    expect(ids).toContain('dermablock-daily') // 11/2 선크림 미체크
    expect(ids).not.toContain('txa6')
    expect(s.missedTop.length).toBeLessThanOrEqual(5)
  })

  it('월 전체 날짜 행을 만들고 계획 없는 날은 progress 없음', () => {
    const s = summarizeMonth('2026-11', ms, logs, P, '2026-11-30')
    expect(s.rows).toHaveLength(30)
    expect(s.rows[3].plan).toBeUndefined()
    expect(s.rows[3].progress).toBeUndefined()
  })

  it('일정이 없는 월', () => {
    const s = summarizeMonth('2026-12', undefined, {}, P, '2026-12-15')
    expect(s.daysPlanned).toBe(0)
    expect(s.overallPct).toBe(0)
    expect(s.rows).toHaveLength(31)
  })
})
