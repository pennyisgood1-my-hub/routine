import type { DayPlan, MonthSchedule } from '../schema'

/**
 * "오늘부터 하루 밀기": fromDate 이후(포함) 남은 DayPlan을 하루씩 뒤로 밀고,
 * 월의 마지막 날 계획은 잘라낸다. fromDate 자리는 휴식일로 채운다(아침 루틴은 유지).
 */
export function shiftScheduleFrom(schedule: MonthSchedule, fromDate: string): MonthSchedule {
  const days = [...schedule.days].sort((a, b) => a.date.localeCompare(b.date))
  const idx = days.findIndex((d) => d.date >= fromDate)
  if (idx < 0) return schedule

  const next: DayPlan[] = days.slice(0, idx)
  const original = days[idx]
  next.push({
    date: original.date,
    nightType: '휴식',
    morning: [...original.morning],
    night: [],
    device: '쉼',
    notes: ['하루 밀기로 생긴 휴식일 — 보습·선크림만'],
  })
  for (let i = idx + 1; i < days.length; i++) {
    const src = days[i - 1]
    next.push({ ...src, morning: [...src.morning], night: [...src.night], notes: src.notes ? [...src.notes] : undefined, date: days[i].date })
  }
  // 마지막 날(days[days.length-1])의 원래 계획은 밀려나서 사라짐
  return { ...schedule, days: next.map(stripUndefined) }
}

function stripUndefined(p: DayPlan): DayPlan {
  const out: DayPlan = { date: p.date, nightType: p.nightType, morning: p.morning, night: p.night, device: p.device }
  if (p.notes !== undefined) out.notes = p.notes
  if (p.checkpoint !== undefined) out.checkpoint = p.checkpoint
  return out
}
