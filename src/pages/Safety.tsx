import { useMemo } from 'react'
import { CONFLICT_RULES, HIGH_STRENGTH_ONLY } from '../data/rules'
import { TAG_LABEL, SIGNAL_GUIDE, SIGNAL_STYLE } from '../lib/labels'
import { ACTIVE_TAGS, SIGNALS, type ActiveTag } from '../schema'
import { useProducts } from '../store'

export default function SafetyPage() {
  const products = useProducts()
  const byTag = useMemo(() => {
    const m = new Map<ActiveTag, typeof products>()
    ACTIVE_TAGS.forEach((t) => {
      const list = products.filter((p) => p.tags.includes(t)).sort((a, b) => Number(b.active) - Number(a.active))
      if (list.length) m.set(t, list)
    })
    return m
  }, [products])
  const isHighOnly = (a: ActiveTag, b: ActiveTag) => HIGH_STRENGTH_ONLY.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">성분 참고</h1>

      <section className="card">
        <h2 className="section-title">1. 같이 쓰면 안 되는 조합</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {CONFLICT_RULES.map((r, i) => (
            <li key={i} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">
                  {TAG_LABEL[r.a]} × {TAG_LABEL[r.b]}
                  {isHighOnly(r.a, r.b) && <span className="ml-1 text-[10px] font-normal text-slate-400">(고함량만)</span>}
                </p>
                <div className="flex shrink-0 gap-1">
                  <span className={`chip ${r.level === '금지' ? 'bg-rose-600 text-white' : 'bg-amber-400 text-amber-950'}`}>{r.level}</span>
                  <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{r.scope}</span>
                </div>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{r.reason}</p>
            </li>
          ))}
        </ul>
        <p className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
          (고함량만) 표시 규칙은 제품 이름·메모에 "20%" 또는 "고함량"이 있는 제품에만 적용돼요. 기기는 오늘 슬롯(아침/밤)의 제품으로 취급.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">2. 내 제품 태그 보기</h2>
        <div className="space-y-3">
          {Array.from(byTag.entries()).map(([tag, list]) => (
            <div key={tag}>
              <p className="mb-1 text-xs font-bold text-violet-700 dark:text-violet-300">{TAG_LABEL[tag]} <span className="font-mono text-[10px] text-slate-400">{tag}</span></p>
              <ul className="flex flex-wrap gap-1.5">
                {list.map((p) => (
                  <li key={p.id} className={`chip ring-1 ${p.active ? 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700' : 'bg-slate-100 text-slate-400 line-through ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'}`}>{p.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">3. 피부 신호등 기준</h2>
        <ul className="space-y-2">
          {SIGNALS.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm">
              <span className={`chip mt-0.5 ${SIGNAL_STYLE[s].on}`}>{SIGNAL_STYLE[s].emoji} {s}</span>
              <span>{SIGNAL_GUIDE[s]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">4. 회복 모드 루틴 (빨강일 때 2~3일)</h2>
        <div>
          <p className="mb-1 text-xs font-bold">🌅 아침</p>
          <p className="text-sm">물세안 → PDRN 세럼 → 제로이드 (또는 마데카21 수딩) → 더마블록</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold">🌙 저녁</p>
          <p className="text-sm">비플레인 → 토리든 세럼 → 제로이드 or 마데카21 수딩 넉넉히</p>
        </div>
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm dark:bg-rose-950/40">
          <p className="mb-1 text-xs font-bold text-rose-700 dark:text-rose-200">쉬는 것</p>
          <p className="text-rose-800 dark:text-rose-100">레티날, 비타민C, 트라넥삼산, B3징크, 떡솝, 스트라이덱스, 패드·팩, 기기, 피지연화제</p>
        </div>
      </section>
    </div>
  )
}
