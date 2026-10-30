import type { Advisory } from '../lib/rules'

const STYLE: Record<Advisory['level'], { wrap: string; chip: string }> = {
  금지: { wrap: 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40', chip: 'bg-rose-600 text-white' },
  주의: { wrap: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40', chip: 'bg-amber-500 text-white' },
  안내: { wrap: 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40', chip: 'bg-sky-500 text-white' },
}

export function AdvisoryCard({ advisories }: { advisories: Advisory[] }) {
  if (!advisories.length) return null
  return (
    <section aria-label="경고" className="space-y-2">
      <h3 className="section-title">⚠️ 오늘 주의</h3>
      {advisories.map((a, i) => {
        const st = STYLE[a.level]
        return (
          <div key={i} className={`rounded-xl border px-3 py-2 ${st.wrap}`}>
            <div className="flex items-start gap-2">
              <span className={`chip mt-0.5 shrink-0 ${st.chip}`}>{a.level}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">{a.title}</p>
                {a.detail && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{a.detail}</p>}
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
