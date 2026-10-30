import { describe, it, expect } from 'vitest'
import { shiftScheduleFrom } from '../lib/shift'
import type { MonthSchedule } from '../schema'

const ms: MonthSchedule = {
  schemaVersion: 1,
  month: '2026-11',
  days: [
    { date: '2026-11-01', nightType: '미백', morning: ['a'], night: ['x1'], device: '밤' },
    { date: '2026-11-02', nightType: '레티날', morning: ['a'], night: ['x2'], device: '쉼', notes: ['n2'] },
    { date: '2026-11-03', nightType: '모공', morning: ['a'], night: ['x3'], device: '쉼', checkpoint: true },
    { date: '2026-11-04', nightType: '미백', morning: ['a'], night: ['x4'], device: '밤' },
  ],
}

describe('shiftScheduleFrom', () => {
  it('오늘 자리는 휴식, 이후는 하루씩 뒤로, 마지막 날 계획은 잘림', () => {
    const r = shiftScheduleFrom(ms, '2026-11-02')
    expect(r.days.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'])
    expect(r.days[0]).toEqual(ms.days[0])
    expect(r.days[1]).toMatchObject({ date: '2026-11-02', nightType: '휴식', night: [], device: '쉼', morning: ['a'] })
    expect(r.days[2]).toMatchObject({ date: '2026-11-03', nightType: '레티날', night: ['x2'], notes: ['n2'] })
    expect(r.days[2].checkpoint).toBeUndefined()
    expect(r.days[3]).toMatchObject({ date: '2026-11-04', nightType: '모공', night: ['x3'], checkpoint: true })
    // x4 는 사라짐
    expect(r.days.some((d) => d.night.includes('x4'))).toBe(false)
  })

  it('원본을 변경하지 않음', () => {
    const copy = JSON.parse(JSON.stringify(ms))
    shiftScheduleFrom(ms, '2026-11-01')
    expect(ms).toEqual(copy)
  })

  it('월 범위 밖 날짜면 그대로', () => {
    expect(shiftScheduleFrom(ms, '2026-12-01')).toBe(ms)
  })

  it('일정에 없는 날짜면 그 다음 날부터 적용', () => {
    const sparse: MonthSchedule = { ...ms, days: [ms.days[0], ms.days[2], ms.days[3]] }
    const r = shiftScheduleFrom(sparse, '2026-11-02')
    expect(r.days.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-03', '2026-11-04'])
    expect(r.days[1].nightType).toBe('휴식')
    expect(r.days[2].nightType).toBe('모공')
  })

  it('정렬되지 않은 days 입력도 날짜순으로 처리', () => {
    const shuffled: MonthSchedule = { ...ms, days: [ms.days[3], ms.days[1], ms.days[0], ms.days[2]] }
    const r = shiftScheduleFrom(shuffled, '2026-11-03')
    expect(r.days.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'])
    expect(r.days[3].nightType).toBe('모공')
  })
})
