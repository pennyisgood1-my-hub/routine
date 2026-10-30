import type { NightType } from '../schema'
import { NIGHT_TYPE_STYLE } from '../lib/labels'

export function NightTypeBadge({ type, size = 'md' }: { type: NightType; size?: 'sm' | 'md' }) {
  const st = NIGHT_TYPE_STYLE[type]
  return (
    <span className={`chip ${st.badge} ${size === 'md' ? 'px-2.5 py-1 text-sm' : ''}`}>
      <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${st.dot}`} aria-hidden="true" />
      {type}
    </span>
  )
}
