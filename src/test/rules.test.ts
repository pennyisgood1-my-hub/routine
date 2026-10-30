import { describe, it, expect } from 'vitest'
import { findConflicts, buildAdvisories, expandPlan } from '../lib/rules'
import { DEFAULT_PRODUCTS } from '../data/products'
import { CONFLICT_RULES } from '../data/rules'
import type { DayPlan } from '../schema'

const P = DEFAULT_PRODUCTS
const R = CONFLICT_RULES
const plan = (over: Partial<DayPlan>): DayPlan => ({
  date: '2026-11-05', nightType: '레티날', morning: [], night: [], device: '쉼', ...over,
})

describe('findConflicts', () => {
  it('레티날 + 떡솝(BHA) 같은 날 → 금지', () => {
    const c = findConflicts(plan({ morning: ['tteoksop-rice'], night: ['exo-retinal'] }), P, R)
    expect(c.some((x) => x.level === '금지' && x.rule.a === 'retinoid' && x.rule.b === 'bha')).toBe(true)
  })

  it('비타민C 아침 + 레티날 밤 → 시간이 다르므로 충돌 없음', () => {
    const c = findConflicts(plan({ morning: ['vitc15'], night: ['exo-retinal'] }), P, R)
    expect(c.filter((x) => x.rule.a === 'retinoid' && x.rule.b === 'vitc')).toHaveLength(0)
  })

  it('비타민C + 레티날 같은 시간 → 주의', () => {
    const c = findConflicts(plan({ night: ['vitc15', 'exo-retinal'] }), P, R)
    expect(c.some((x) => x.level === '주의' && x.rule.b === 'vitc')).toBe(true)
  })

  it('기기 슬롯은 해당 시간대 아이템으로 취급: 밤 BHA + 밤 기기 → 금지', () => {
    const c = findConflicts(plan({ night: ['stridex'], device: '밤' }), P, R)
    expect(c.some((x) => x.level === '금지' && x.rule.b === 'device' && x.when === '밤')).toBe(true)
  })

  it('밤 BHA + 아침 기기 → 같은 시간 아니므로 OK', () => {
    const c = findConflicts(plan({ night: ['stridex'], device: '아침' }), P, R)
    expect(c.filter((x) => x.rule.b === 'device')).toHaveLength(0)
  })

  it('한 제품이 두 태그(bha+pad)를 가져도 자기 자신과 충돌하지 않음', () => {
    const c = findConflicts(plan({ night: ['stridex'] }), P, R)
    expect(c).toHaveLength(0)
  })

  it('떡솝 + 스트라이덱스 같은 날 → bha×pad 금지', () => {
    const c = findConflicts(plan({ night: ['tteoksop-rice', 'stridex'] }), P, R)
    expect(c.some((x) => x.rule.a === 'bha' && x.rule.b === 'pad' && x.level === '금지')).toBe(true)
  })

  it('동일 쌍은 한 번만 보고', () => {
    const c = findConflicts(plan({ night: ['tteoksop-rice', 'stridex'] }), P, R)
    const keys = c.map((x) => [x.rule.a, x.rule.b, x.a.productId, x.b.productId].join())
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('나이아신아마이드 × 기기: 저함량(B3징크)은 OK, 20% 제품만 금지', () => {
    const ok = findConflicts(plan({ night: ['b3zinc'], device: '밤' }), P, R)
    expect(ok.filter((x) => x.rule.a === 'niacinamide')).toHaveLength(0)
    const products = P.map((p) => (p.id === 'niacin20' ? { ...p, active: true } : p))
    const bad = findConflicts(plan({ night: ['niacin20'], device: '밤' }), products, R)
    expect(bad.some((x) => x.rule.a === 'niacinamide' && x.level === '금지')).toBe(true)
  })

  it('알 수 없는 제품 id는 태그 없음으로 처리', () => {
    const items = expandPlan(plan({ morning: ['nope'] }), P)
    expect(items[0]).toMatchObject({ productId: 'nope', name: 'nope', tags: [] })
  })

  it('금지가 주의보다 먼저 정렬', () => {
    const c = findConflicts(plan({ night: ['exo-retinal', 'vitc15', 'stridex'] }), P, R)
    const levels = c.map((x) => x.level)
    const firstCaution = levels.indexOf('주의')
    const lastForbid = levels.lastIndexOf('금지')
    expect(firstCaution === -1 || lastForbid < firstCaution).toBe(true)
  })
})

describe('buildAdvisories', () => {
  it('레티날 밤 → 오늘 X(BHA·패드…) + 내일 선크림 필수 + 내일 기기 쉼', () => {
    const adv = buildAdvisories({ plan: plan({ night: ['exo-retinal'] }), products: P, rules: R })
    const titles = adv.map((a) => a.title)
    expect(titles.some((t) => t.startsWith('오늘 X:') && t.includes('BHA') && t.includes('패드'))).toBe(true)
    expect(titles).toContain('내일 아침 선크림 필수')
    expect(titles).toContain('내일 기기 쉼')
  })

  it('어제 레티날인데 오늘 기기 밤 → 주의', () => {
    const adv = buildAdvisories({
      plan: plan({ nightType: '미백', night: ['txa6'], device: '밤', morning: ['dermablock-daily'] }),
      prevPlan: plan({ date: '2026-11-04', night: ['exo-retinal'] }),
      products: P, rules: R,
    })
    expect(adv.some((a) => a.level === '주의' && a.title.includes('어제 레티날'))).toBe(true)
  })

  it('내일 연화제 + 오늘 레티날 → 금지 안내', () => {
    const adv = buildAdvisories({
      plan: plan({ night: ['exo-retinal'] }),
      nextPlan: plan({ date: '2026-11-06', nightType: '연화제', night: ['ilso-softener'] }),
      products: P, rules: R,
    })
    expect(adv.some((a) => a.level === '금지' && a.title.includes('내일 피지연화제'))).toBe(true)
  })

  it('실제 충돌이 있으면 제품명 × 제품명 형식으로 표시', () => {
    const adv = buildAdvisories({ plan: plan({ night: ['exo-retinal', 'tteoksop-rice'] }), products: P, rules: R })
    expect(adv.some((a) => a.level === '금지' && a.title.includes('×'))).toBe(true)
  })

  it('휴식일(아무 것도 없음) → 경고 없음', () => {
    const adv = buildAdvisories({ plan: plan({ nightType: '휴식' }), products: P, rules: R })
    expect(adv).toHaveLength(0)
  })
})
