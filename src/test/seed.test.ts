import { describe, it, expect } from 'vitest'
import { MonthScheduleSchema } from '../schema'
import seedOct from '../data/schedule.2026-10.json'
import seedNov from '../data/schedule.2026-11.json'
import { DEFAULT_PRODUCTS } from '../data/products'
import { CONFLICT_RULES } from '../data/rules'
import { findConflicts } from '../lib/rules'

const MORNING = ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'drg-sun', 'rx-meds']
const NIGHT = ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds']
const ids = new Set(DEFAULT_PRODUCTS.map((p) => p.id))

describe('시드 일정 2026-11 (처방 루틴)', () => {
  const ms = MonthScheduleSchema.parse(seedNov)

  it('스키마 통과, 30일, 날짜 정렬', () => {
    expect(ms.days).toHaveLength(30)
    expect(ms.days.map((d) => d.date)).toEqual([...ms.days.map((d) => d.date)].sort())
  })

  it('모든 제품 id가 제품 마스터에 존재', () => {
    const unknown = ms.days.flatMap((d) => [...d.morning, ...d.night]).filter((id) => !ids.has(id))
    expect(unknown).toEqual([])
  })

  it('매일 같은 처방 루틴: 회복 / 기기 쉼 / 레티날·BHA·비타민C·기기 없음', () => {
    for (const d of ms.days) {
      expect(d.nightType).toBe('회복')
      expect(d.device).toBe('쉼')
      expect(d.morning).toEqual(MORNING)
      expect(d.night).toEqual(NIGHT)
    }
    const banned = ['exo-retinal', 'tteoksop-rice', 'tteoksop-green', 'stridex', 'vitc15', 'txa6', 'b3zinc', 'ilso-softener', 'booster-pro', 'niacin20']
    const used = new Set(ms.days.flatMap((d) => [...d.morning, ...d.night]))
    banned.forEach((id) => expect(used.has(id)).toBe(false))
  })

  it('충돌 없음', () => {
    const bad = ms.days.flatMap((d) => findConflicts(d, DEFAULT_PRODUCTS, CONFLICT_RULES))
    expect(bad).toEqual([])
  })

  it('D+N 카운터: 10/30 = D+0 → 11/1 = D+2, 11/30 = D+31', () => {
    const byDate = new Map(ms.days.map((d) => [d.date, d]))
    expect(byDate.get('2026-11-01')!.notes![0]).toBe('D+2')
    expect(byDate.get('2026-11-30')!.notes![0]).toBe('D+31')
  })

  it('할 일 메모: 11/5 재진 확정, 11/14 체크포인트, 올영 일정', () => {
    const byDate = new Map(ms.days.map((d) => [d.date, d]))
    expect(byDate.get('2026-11-05')!.notes!.some((n) => n.includes('재진 날짜 확정'))).toBe(true)
    expect(byDate.get('2026-11-14')!.checkpoint).toBe(true)
    expect(byDate.get('2026-11-14')!.notes!.some((n) => n.includes('체크포인트'))).toBe(true)
    expect(byDate.get('2026-11-01')!.notes!.some((n) => n.includes('올영 블프'))).toBe(true)
    expect(byDate.get('2026-11-08')!.notes!.some((n) => n.includes('올영 블프'))).toBe(false)
    expect(byDate.get('2026-11-25')!.notes!.some((n) => n.includes('올영데이'))).toBe(true)
    expect(ms.days.filter((d) => d.checkpoint)).toHaveLength(1)
  })

  it('공통 규칙에 복용 중 금지·중단 제품·신호등 기준 포함', () => {
    const g = ms.globalNotes!.join('\n')
    expect(g).toContain('이소트레티노인')
    expect(g).toContain('복용 중 금지')
    expect(g).toContain('중단')
    expect(g).toContain('신호등')
  })
})

describe('시드 일정 2026-10 (처방 시작 이틀)', () => {
  const ms = MonthScheduleSchema.parse(seedOct)

  it('10/30 은 저녁 약만, 10/31 은 전체 루틴', () => {
    expect(ms.days.map((d) => d.date)).toEqual(['2026-10-30', '2026-10-31'])
    expect(ms.days[0].morning).toEqual([])
    expect(ms.days[0].night).toEqual(['rx-meds'])
    expect(ms.days[0].notes![0]).toBe('D+0')
    expect(ms.days[1].morning).toEqual(MORNING)
    expect(ms.days[1].notes![0]).toBe('D+1')
  })

  it('모든 제품 id가 제품 마스터에 존재', () => {
    const unknown = ms.days.flatMap((d) => [...d.morning, ...d.night]).filter((id) => !ids.has(id))
    expect(unknown).toEqual([])
  })
})
