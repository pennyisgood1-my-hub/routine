import { SIGNALS, type Signal } from '../schema'
import { SIGNAL_GUIDE, SIGNAL_STYLE } from '../lib/labels'

export function SignalPicker({ value, onChange }: { value?: Signal; onChange: (s: Signal | undefined) => void }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="피부 신호등">
        {SIGNALS.map((s) => {
          const on = value === s
          const st = SIGNAL_STYLE[s]
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on ? undefined : s)}
              className={`btn min-h-11 ${on ? st.on + ' shadow' : st.off}`}
            >
              <span aria-hidden="true">{st.emoji}</span> {s}
            </button>
          )
        })}
      </div>
      {value && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{value}: {SIGNAL_GUIDE[value]}</p>}
    </div>
  )
}
