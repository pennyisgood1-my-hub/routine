import type { ActiveTag, NightType, Signal } from '../schema'

export const TAG_LABEL: Record<ActiveTag, string> = {
  retinoid: '레티노이드',
  bha: 'BHA',
  aha: 'AHA',
  vitc: '비타민C',
  niacinamide: '나이아신아마이드',
  txa: '트라넥삼산',
  sunscreen: '선크림',
  barrier: '장벽 강화',
  hydration: '보습',
  cleanser: '클렌저',
  oil_cleanser: '오일 클렌저',
  device: '기기',
  softener: '피지연화제',
  pad: '패드',
  pack: '팩',
  spot: '스팟',
}

/** nightType 색상 (Tailwind 클래스). 레티날=보라, 미백=파랑, 모공=초록, 휴식=회색, 연화제=주황, 회복=하늘 */
export const NIGHT_TYPE_STYLE: Record<NightType, { badge: string; dot: string; hex: string }> = {
  레티날: { badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200', dot: 'bg-violet-500', hex: '#8b5cf6' },
  미백: { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200', dot: 'bg-blue-500', hex: '#3b82f6' },
  모공: { badge: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200', dot: 'bg-green-500', hex: '#22c55e' },
  휴식: { badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200', dot: 'bg-slate-400', hex: '#94a3b8' },
  연화제: { badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200', dot: 'bg-orange-500', hex: '#f97316' },
  회복: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200', dot: 'bg-sky-400', hex: '#38bdf8' },
}

export const SIGNAL_STYLE: Record<Signal, { on: string; off: string; ring: string; hex: string; emoji: string }> = {
  초록: { on: 'bg-emerald-500 text-white', off: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', ring: 'ring-emerald-500', hex: '#10b981', emoji: '🟢' },
  노랑: { on: 'bg-amber-400 text-amber-950', off: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', ring: 'ring-amber-400', hex: '#f59e0b', emoji: '🟡' },
  빨강: { on: 'bg-rose-500 text-white', off: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300', ring: 'ring-rose-500', hex: '#f43f5e', emoji: '🔴' },
}

export const SIGNAL_GUIDE: Record<Signal, string> = {
  초록: '그대로 진행',
  노랑: '기기 쉬고, 레티날 미루기',
  빨강: '2~3일 보습만 (모든 활성 성분 중단)',
}
