import { describe, it, expect } from 'vitest'
import { parseMonthScheduleJson, parseBackupJson } from '../lib/validate'

const good = {
  schemaVersion: 1, month: '2026-12',
  days: [{ date: '2026-12-01', nightType: '미백', morning: ['bplain-foam'], night: ['txa6'], device: '밤' }],
}

describe('parseMonthScheduleJson', () => {
  it('정상 JSON 통과', () => {
    const r = parseMonthScheduleJson(JSON.stringify(good))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.month).toBe('2026-12')
  })

  it('``` 코드펜스로 감싼 텍스트도 허용', () => {
    const r = parseMonthScheduleJson('```json\n' + JSON.stringify(good) + '\n```')
    expect(r.ok).toBe(true)
  })

  it('JSON 문법 오류 → 한국어 메시지', () => {
    const r = parseMonthScheduleJson('{ "schemaVersion": 1, ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/JSON 문법 오류/)
  })

  it('빈 입력', () => {
    const r = parseMonthScheduleJson('   ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/비어/)
  })

  it('잘못된 nightType → 경로와 허용 값 표시', () => {
    const bad = { ...good, days: [{ ...good.days[0], nightType: '보습' }] }
    const r = parseMonthScheduleJson(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('days[0].nightType') && e.includes('"레티날"'))).toBe(true)
    }
  })

  it('타입 오류 → 기대/받은 타입', () => {
    const bad = { ...good, days: [{ ...good.days[0], morning: 'bplain-foam' }] }
    const r = parseMonthScheduleJson(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('days[0].morning') && e.includes('배열') && e.includes('문자열'))).toBe(true)
  })

  it('schemaVersion 틀림', () => {
    const r = parseMonthScheduleJson(JSON.stringify({ ...good, schemaVersion: 2 }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.startsWith('schemaVersion'))).toBe(true)
  })

  it('날짜가 월에 속하지 않거나 중복이면 오류', () => {
    const bad = { ...good, days: [good.days[0], { ...good.days[0] }, { ...good.days[0], date: '2027-01-01' }] }
    const r = parseMonthScheduleJson(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('days[1].date') && e.includes('중복'))).toBe(true)
      expect(r.errors.some((e) => e.includes('days[2].date') && e.includes('속하지'))).toBe(true)
    }
  })

  it('필수 필드 누락', () => {
    const { device: _d, ...noDevice } = good.days[0]
    const r = parseMonthScheduleJson(JSON.stringify({ ...good, days: [noDevice] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('days[0].device'))).toBe(true)
  })

  it('알 수 없는 제품 id는 경고로만', () => {
    const r = parseMonthScheduleJson(JSON.stringify(good), new Set(['bplain-foam']))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.warnings[0]).toMatch(/txa6/)
  })
})

describe('parseBackupJson', () => {
  it('정상 백업', () => {
    const b = { schemaVersion: 1, app: 'routine', exportedAt: 'x', products: [], schedules: {}, logs: {} }
    expect(parseBackupJson(JSON.stringify(b)).ok).toBe(true)
  })
  it('앱 식별자 틀림 → 실패', () => {
    const b = { schemaVersion: 1, app: 'other', exportedAt: 'x', products: [], schedules: {}, logs: {} }
    expect(parseBackupJson(JSON.stringify(b)).ok).toBe(false)
  })
})
