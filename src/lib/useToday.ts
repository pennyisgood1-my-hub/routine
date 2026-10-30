import { useEffect, useState } from 'react'
import { todayStr } from './dates'

/** 자정이 지나면 갱신되는 오늘 날짜 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayStr())
  useEffect(() => {
    const tick = () => setToday((prev) => { const t = todayStr(); return t === prev ? prev : t })
    const id = window.setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [])
  return today
}
