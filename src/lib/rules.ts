import type { ActiveTag, ConflictRule, DayPlan, Product } from '../schema'
import { TAG_LABEL } from './labels'
import { HIGH_STRENGTH_ONLY, HIGH_STRENGTH_PATTERN } from '../data/rules'

export type Slot = '아침' | '밤'

export interface SlotItem {
  productId: string
  name: string
  tags: ActiveTag[]
  slot: Slot
  highStrength: boolean
}

export interface Conflict {
  rule: ConflictRule
  level: ConflictRule['level']
  scope: ConflictRule['scope']
  /** 같은 시간 규칙이면 해당 슬롯, 같은 날 규칙이면 '하루' */
  when: Slot | '하루'
  a: { productId: string; name: string; tag: ActiveTag }
  b: { productId: string; name: string; tag: ActiveTag }
}

export type AdvisoryLevel = '금지' | '주의' | '안내'
export interface Advisory {
  level: AdvisoryLevel
  title: string
  detail?: string
}

export const DEVICE_PSEUDO_ID = '__device__'

export function isHighStrength(p: Pick<Product, 'name' | 'note'> | undefined): boolean {
  if (!p) return false
  return HIGH_STRENGTH_PATTERN.test(p.name) || HIGH_STRENGTH_PATTERN.test(p.note ?? '')
}

function isHighStrengthOnlyRule(rule: ConflictRule, list: Array<[ActiveTag, ActiveTag]>): boolean {
  return list.some(([a, b]) => (a === rule.a && b === rule.b) || (a === rule.b && b === rule.a))
}

export function productMap(products: Product[]): Map<string, Product> {
  return new Map(products.map((p) => [p.id, p]))
}

export function productName(products: Product[] | Map<string, Product>, id: string): string {
  const m = products instanceof Map ? products : productMap(products)
  return m.get(id)?.name ?? id
}

/** 하루 계획을 슬롯별 아이템(태그 포함)으로 펼침. 기기는 device 슬롯에 따라 아침/밤에 들어간다. */
export function expandPlan(plan: DayPlan, products: Product[]): SlotItem[] {
  const map = productMap(products)
  const items: SlotItem[] = []
  const push = (id: string, slot: Slot) => {
    const p = map.get(id)
    items.push({ productId: id, name: p?.name ?? id, tags: p?.tags ?? [], slot, highStrength: isHighStrength(p) })
  }
  plan.morning.forEach((id) => push(id, '아침'))
  plan.night.forEach((id) => push(id, '밤'))
  if (plan.device !== '쉼') {
    const dev = products.find((p) => p.tags.includes('device') && p.active) ?? products.find((p) => p.tags.includes('device'))
    items.push({ productId: dev?.id ?? DEVICE_PSEUDO_ID, name: dev?.name ?? '기기', tags: ['device'], slot: plan.device, highStrength: false })
  }
  return items
}

/**
 * 계획된 제품 태그 조합을 규칙과 대조해 실제 충돌을 찾는다.
 * highStrengthOnly 에 있는 태그 쌍은 두 제품 중 하나가 고함량(이름/note 에 "20%"·"고함량")일 때만 적용.
 */
export function findConflicts(
  plan: DayPlan,
  products: Product[],
  rules: ConflictRule[],
  highStrengthOnly: Array<[ActiveTag, ActiveTag]> = HIGH_STRENGTH_ONLY,
): Conflict[] {
  const items = expandPlan(plan, products)
  const out: Conflict[] = []
  const seen = new Set<string>()

  const check = (pool: SlotItem[], rule: ConflictRule, ruleIdx: number, when: Conflict['when']) => {
    const needHigh = isHighStrengthOnlyRule(rule, highStrengthOnly)
    for (const x of pool) {
      for (const y of pool) {
        if (x === y) continue
        if (x.productId === y.productId) continue
        if (!(x.tags.includes(rule.a) && y.tags.includes(rule.b))) continue
        if (needHigh && !x.highStrength && !y.highStrength) continue
        const key = [ruleIdx, when, ...[x.productId, y.productId].sort()].join('|')
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
          rule,
          level: rule.level,
          scope: rule.scope,
          when,
          a: { productId: x.productId, name: x.name, tag: rule.a },
          b: { productId: y.productId, name: y.name, tag: rule.b },
        })
      }
    }
  }

  rules.forEach((rule, i) => {
    if (rule.scope === '같은 시간') {
      check(items.filter((it) => it.slot === '아침'), rule, i, '아침')
      check(items.filter((it) => it.slot === '밤'), rule, i, '밤')
    } else {
      check(items, rule, i, '하루')
    }
  })

  return out.sort((a, b) => levelOrder(a.level) - levelOrder(b.level))
}

function levelOrder(l: AdvisoryLevel): number {
  return l === '금지' ? 0 : l === '주의' ? 1 : 2
}

function tagsOf(items: SlotItem[]): Set<ActiveTag> {
  const s = new Set<ActiveTag>()
  items.forEach((it) => it.tags.forEach((t) => s.add(t)))
  return s
}

function planHasTag(plan: DayPlan | undefined, products: Product[], tag: ActiveTag): boolean {
  if (!plan) return false
  return tagsOf(expandPlan(plan, products)).has(tag)
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

export interface AdvisoryContext {
  plan: DayPlan
  prevPlan?: DayPlan
  nextPlan?: DayPlan
  products: Product[]
  rules: ConflictRule[]
}

/**
 * 오늘 화면의 ⚠️ 경고 카드 내용.
 * 1) 실제 충돌  2) "오늘 X" 피해야 할 태그/제품  3) 전후 일자 기반 안내(선크림, 기기 쉼 등)
 */
export function buildAdvisories(ctx: AdvisoryContext): Advisory[] {
  const { plan, prevPlan, nextPlan, products, rules } = ctx
  const out: Advisory[] = []
  const items = expandPlan(plan, products)
  const dayTags = tagsOf(items)
  const morningTags = tagsOf(items.filter((i) => i.slot === '아침'))
  const nightTags = tagsOf(items.filter((i) => i.slot === '밤'))
  const activeWith = (tag: ActiveTag) => products.filter((p) => p.active && p.tags.includes(tag)).map((p) => p.name)

  // 1) 실제 충돌
  for (const c of findConflicts(plan, products, rules)) {
    const whenLabel = c.scope === '같은 시간' ? `${c.when} 같은 시간` : '같은 날'
    out.push({
      level: c.level,
      title: `${c.a.name} × ${c.b.name}`,
      detail: `${whenLabel} ${c.level} · ${c.rule.reason}`,
    })
  }

  // 2) 같은 날 금지 → "오늘 X"
  const sameDayForbidden = new Map<ActiveTag, Set<ActiveTag>>() // cause → avoid
  for (const r of rules) {
    if (r.scope !== '같은 날' || r.level !== '금지') continue
    if (isHighStrengthOnlyRule(r, HIGH_STRENGTH_ONLY)) continue
    for (const [cause, avoid] of [[r.a, r.b], [r.b, r.a]] as [ActiveTag, ActiveTag][]) {
      if (dayTags.has(cause) && !dayTags.has(avoid)) {
        if (!sameDayForbidden.has(cause)) sameDayForbidden.set(cause, new Set())
        sameDayForbidden.get(cause)!.add(avoid)
      }
    }
  }
  for (const [cause, avoids] of sameDayForbidden) {
    const avoidList = Array.from(avoids)
    const names = uniq(avoidList.flatMap(activeWith))
    out.push({
      level: '주의',
      title: `오늘 X: ${avoidList.map((t) => TAG_LABEL[t]).join(' · ')}`,
      detail: `${TAG_LABEL[cause]} 있는 날${names.length ? ` → ${names.join(', ')} 쓰지 않기` : ''}`,
    })
  }

  // 2b) 같은 시간 금지 → "아침/밤에 X"
  for (const [slot, slotTags] of [['아침', morningTags], ['밤', nightTags]] as [Slot, Set<ActiveTag>][]) {
    const avoidBy = new Map<ActiveTag, Set<ActiveTag>>()
    for (const r of rules) {
      if (r.scope !== '같은 시간' || r.level !== '금지') continue
      if (isHighStrengthOnlyRule(r, HIGH_STRENGTH_ONLY)) continue
      for (const [cause, avoid] of [[r.a, r.b], [r.b, r.a]] as [ActiveTag, ActiveTag][]) {
        if (slotTags.has(cause) && !slotTags.has(avoid)) {
          if (!avoidBy.has(cause)) avoidBy.set(cause, new Set())
          avoidBy.get(cause)!.add(avoid)
        }
      }
    }
    for (const [cause, avoids] of avoidBy) {
      // 기기 쉬는 날에 "기기 X"만 뜨는 건 소음이라, 기기가 아예 계획에 없을 땐 생략
      const list = Array.from(avoids).filter((t) => !(t === 'device' && plan.device === '쉼'))
      if (!list.length) continue
      out.push({
        level: '안내',
        title: `${slot}에 X: ${list.map((t) => TAG_LABEL[t]).join(' · ')}`,
        detail: `${TAG_LABEL[cause]}와 같은 시간 금지`,
      })
    }
  }

  // 3) 전후 일자 안내
  const hasRetinoid = dayTags.has('retinoid')
  if (hasRetinoid) {
    out.push({ level: '안내', title: '내일 아침 선크림 필수', detail: '레티날 다음 날은 자외선에 더 민감' })
    out.push({ level: '안내', title: '내일 기기 쉼', detail: '레티날 다음 날 기기 X' })
  }
  if (planHasTag(prevPlan, products, 'retinoid') && plan.device !== '쉼') {
    out.push({ level: '주의', title: '어제 레티날 → 오늘 기기는 쉬는 게 안전', detail: `오늘 기기 슬롯: ${plan.device}` })
  }
  if (planHasTag(prevPlan, products, 'retinoid') && !morningTags.has('sunscreen')) {
    out.push({ level: '주의', title: '어제 레티날 → 오늘 아침 선크림 꼭', detail: '아침 목록에 선크림 제품이 없음' })
  }
  if (planHasTag(nextPlan, products, 'softener')) {
    if (hasRetinoid) out.push({ level: '금지', title: '내일 피지연화제 → 오늘 레티날 X', detail: '피지연화제 전날·당일 레티날 금지' })
    if (plan.device !== '쉼') out.push({ level: '주의', title: '내일 피지연화제 → 오늘 기기 쉼 권장' })
    else out.push({ level: '안내', title: '내일 피지연화제', detail: '오늘 기기 쉼 · 레티날 X' })
  }
  if (planHasTag(prevPlan, products, 'softener') && hasRetinoid) {
    out.push({ level: '금지', title: '어제 피지연화제 → 오늘 레티날 X', detail: '피지연화제 다음 날도 레티날 쉬기' })
  }
  if (dayTags.has('softener')) {
    out.push({ level: '안내', title: '오늘 피지연화제', detail: '오늘·내일 레티날 X, 기기 쉼, 스패츌러 X' })
  }

  return out.sort((a, b) => levelOrder(a.level) - levelOrder(b.level))
}
