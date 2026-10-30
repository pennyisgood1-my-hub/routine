import { format, addDays, getDaysInMonth, startOfMonth, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'

/** "YYYY-MM-DD" → 로컬 Date (타임존 영향 없음) */
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayStr(now: Date = new Date()): string {
  return toDateStr(now)
}

export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function currentMonth(now: Date = new Date()): string {
  return format(now, 'yyyy-MM')
}

export function addDaysStr(dateStr: string, n: number): string {
  return toDateStr(addDays(parseDateStr(dateStr), n))
}

/** 월의 모든 날짜 문자열 */
export function datesOfMonth(month: string): string[] {
  const first = parseDateStr(month + '-01')
  const n = getDaysInMonth(first)
  return Array.from({ length: n }, (_, i) => toDateStr(addDays(first, i)))
}

/** 0=일 … 6=토 */
export function weekdayOf(dateStr: string): number {
  return getDay(parseDateStr(dateStr))
}

export function firstWeekdayOfMonth(month: string): number {
  return getDay(startOfMonth(parseDateStr(month + '-01')))
}

export function formatKo(dateStr: string, pattern = 'M월 d일 (EEE)'): string {
  return format(parseDateStr(dateStr), pattern, { locale: ko })
}

export function formatMonthKo(month: string): string {
  return format(parseDateStr(month + '-01'), 'yyyy년 M월', { locale: ko })
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return format(d, 'yyyy-MM')
}

export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
