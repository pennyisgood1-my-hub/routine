import type { Product } from '../schema'

export interface ChecklistItem {
  id: string
  product?: Product
}

interface Props {
  items: ChecklistItem[]
  checked: string[]
  onToggle: (id: string) => void
  emptyText?: string
}

/** 순서 번호 + 제품명 + 한 줄 note. 터치 타겟 44px 이상. */
export function Checklist({ items, checked, onToggle, emptyText = '없음' }: Props) {
  if (!items.length) return <p className="py-2 text-sm text-slate-400">{emptyText}</p>
  return (
    <ol className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((it, i) => {
        const on = checked.includes(it.id)
        const p = it.product
        return (
          <li key={it.id + i}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(it.id)}
              className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
            >
              <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">{i + 1}</span>
              <span
                className={
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold transition ' +
                  (on ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 dark:border-slate-600')
                }
                aria-hidden="true"
              >
                {on ? '✓' : ''}
              </span>
              <span className="min-w-0 flex-1">
                <span className={'block text-[15px] font-medium leading-tight ' + (on ? 'text-slate-400 line-through dark:text-slate-500' : '')}>
                  {p?.name ?? it.id}
                  {!p && <span className="chip ml-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">미등록</span>}
                  {p && !p.active && <span className="chip ml-1.5 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">사용 중지</span>}
                </span>
                {p?.note && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{p.note}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
