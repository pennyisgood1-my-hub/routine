import type { ActiveTag, ConflictRule } from '../schema'

/** 내장 성분 충돌 규칙. 태그 기반 단순 비교. */
export const CONFLICT_RULES: ConflictRule[] = [
  { a: 'retinoid', b: 'bha', level: '금지', scope: '같은 날', reason: '자극 누적, 각질제거 겹침' },
  { a: 'retinoid', b: 'aha', level: '금지', scope: '같은 날', reason: '자극 누적, 각질제거 겹침' },
  { a: 'retinoid', b: 'pad', level: '금지', scope: '같은 날', reason: '패드 대부분 산 성분' },
  { a: 'retinoid', b: 'vitc', level: '주의', scope: '같은 시간', reason: '비타민C 아침 / 레티날 밤으로 분리' },
  { a: 'retinoid', b: 'softener', level: '금지', scope: '같은 날', reason: '피지연화제 전날·당일 레티날 X' },
  { a: 'retinoid', b: 'device', level: '주의', scope: '같은 시간', reason: '기기 위에 레티날 X, 레티날 다음 날 기기 쉼' },
  { a: 'bha', b: 'aha', level: '주의', scope: '같은 날', reason: '둘 다 각질제거 → 하나만' },
  { a: 'bha', b: 'pad', level: '금지', scope: '같은 날', reason: '떡솝과 스트라이덱스 같은 날 X' },
  { a: 'bha', b: 'vitc', level: '주의', scope: '같은 시간', reason: '둘 다 산성 → 시간 분리' },
  { a: 'bha', b: 'device', level: '금지', scope: '같은 시간', reason: '기기 위에 BHA X' },
  { a: 'vitc', b: 'device', level: '금지', scope: '같은 시간', reason: '기기 위에 비타민C X' },
  { a: 'vitc', b: 'niacinamide', level: '주의', scope: '같은 시간', reason: '고함량끼리면 아침/저녁 분리 (저함량은 OK)' },
  { a: 'niacinamide', b: 'device', level: '금지', scope: '같은 시간', reason: '기기 위에 나이아신아마이드 20% X (고함량만 해당, 저함량 세럼은 OK)' },
]

/**
 * 태그만으로는 구분이 안 되는 "고함량 한정" 규칙 (순서 무관).
 * 두 제품 중 하나의 이름 또는 note 에 "20%" / "고함량" 이 있을 때만 적용한다.
 * 예) 나이아신아마이드 20% × 기기는 금지지만, B3징크 세럼(저함량) × 기기는 OK.
 */
export const HIGH_STRENGTH_ONLY: Array<[ActiveTag, ActiveTag]> = [['niacinamide', 'device']]

export const HIGH_STRENGTH_PATTERN = /20\s*%|고함량/
