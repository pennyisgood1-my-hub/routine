import type { Product } from '../schema'

/** 내장 제품 마스터 초기값. 설정 탭에서 추가/수정/비활성화 가능. */
export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'bplain-foam', name: '비플레인 녹두 약산성 폼', category: '클렌징', tags: ['cleanser'], active: true },
  { id: 'bringgreen-water', name: '브링그린 티트리시카 클렌징 워터', category: '클렌징', tags: ['cleanser'], active: true },
  { id: 'cleanitzero', name: '바닐라코 클린잇제로', category: '클렌징', tags: ['oil_cleanser'], active: true },
  { id: 'tteoksop-rice', name: '아렌시아 떡솝 쌀 (LHA 튜브)', category: '클렌징', tags: ['bha', 'cleanser'], active: true },
  { id: 'tteoksop-green', name: '아렌시아 떡솝 초록 (그린티 LHA)', category: '클렌징', tags: ['bha', 'cleanser'], note: '문지르지 않기, T존 30초', active: true },
  { id: 'stridex', name: '스트라이덱스 초록', category: '패드·팩', tags: ['bha', 'pad'], note: 'T존만, 떡솝과 같은 날 X', active: true },
  { id: 'dermablock-daily', name: '더마블록 데일리 선크림 (빨강)', category: '선케어', tags: ['sunscreen'], active: true },
  { id: 'vt-sun', name: 'VT PDRN 선에센스', category: '선케어', tags: ['sunscreen'], active: true },
  { id: 'zeroid', name: '제로이드 수딩 크림', category: '크림', tags: ['barrier'], active: true },
  { id: 'torriden-cream', name: '토리든 다이브인 수딩 크림', category: '크림', tags: ['hydration'], active: true },
  { id: 'madeca21-soothing', name: '마데카21 테카 수딩 크림', category: '크림', tags: ['barrier'], active: true },
  { id: 'madeca21-toning', name: '마데카21 테카 토닝 크림', category: '크림', tags: ['niacinamide'], active: true },
  { id: 'txa6', name: '더마팩토리 트라넥삼산 6% 크림', category: '크림', tags: ['txa'], active: true },
  { id: 'exo-retinal', name: '더마팩토리 엑소 레티날 크림', category: '크림', tags: ['retinoid'], note: '쌀알 3개, 코 전체 제외 (2주 테스트)', active: true },
  { id: 'patheon-spot', name: '파티온 노스카나인 스팟 겔크림', category: '크림', tags: ['spot'], active: true },
  { id: 'b3zinc', name: '아누아 어성초 77 B3징크 세럼', category: '세럼', tags: ['niacinamide'], active: true },
  { id: 'torriden-serum', name: '토리든 다이브인 세럼', category: '세럼', tags: ['hydration'], active: true },
  { id: 'anua-pdrn', name: '아누아 PDRN 히알루론산 세럼', category: '세럼', tags: ['hydration'], active: true },
  { id: 'niacin20', name: '더마팩토리 나이아신아마이드 20%', category: '세럼', tags: ['niacinamide'], note: '얼굴 X, 몸·자국 부위', active: false },
  { id: 'vitc15', name: '더마팩토리 비타민C E 페룰릭 앰플', category: '앰플', tags: ['vitc'], note: '아침, pH 3.3', active: true },
  { id: 'fucidum-mist', name: '후시덤 베리어 리페어 크림미스트', category: '토너·미스트', tags: ['barrier'], active: true },
  { id: 'booster-pro', name: '부스터 프로', category: '기기', tags: ['device'], note: '부스터 모드 2단계 5분, 토리든/PDRN 세럼 위에서만', active: true },
  { id: 'ilso-softener', name: '일소 피지연화제', category: '기타', tags: ['softener'], note: '3~4주 1회, 스패츌러는 코 붉은기 빠질 때까지 보류', active: true },
  { id: 'numbuzin-blur', name: '넘버즈인 1번 블러파우더', category: '기타', tags: [], active: true },
  // 2026-10-30 피부과 처방 루틴용
  { id: 'rx-meds', name: '먹는 약 (니메겐 + 프리마란)', category: '기타', tags: [], note: '아침·저녁 식후 1회씩, 빈속 금지. 아침 거르면 점심 식후로', active: true },
  { id: 'acnin', name: '아크닌액 (바르는 약)', category: '기타', tags: ['spot'], note: '세안 후 트러블 부위에 찍어 바르기, 세럼 전', active: true },
  { id: 'drg-sun', name: '닥터지 그린 마일드 업 선 플러스', category: '선케어', tags: ['sunscreen'], note: '손가락 두 마디, 두 번에 나눠, 속눈썹에서 1cm 띄우기', active: true },
  { id: 'cream-rx', name: '크림 (후시덤 SOS / 마데카21 수딩 / 토리든 수딩 중 하나)', category: '크림', tags: ['barrier'], note: '넉넉히', active: true },
]
