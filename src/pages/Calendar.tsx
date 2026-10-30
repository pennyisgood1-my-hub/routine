import { useMemo, useState } from 'react'
import { useLogs, useProducts, useSchedules, scheduleActions } from '../store'
import { useToday } from '../lib/useToday'
import { currentMonth, datesOfMonth, firstWeekdayOfMonth, formatMonthKo, shiftMonth, WEEKDAY_KO, formatKo } from '../lib/dates'
import { dayProgress } from '../lib/progress'
import { NIGHT_TYPE_STYLE, SIGNAL_STYLE } from '../lib/labels'
import { Modal, ConfirmDialog } from '../components/Modal'
import { DayView } from '../components/DayView'
import { ImportScheduleModal } from '../components/ImportScheduleModal'
import { useToast } from '../components/Toast'
import { copyText } from '../lib/export'
import { NIGHT_TYPES } from '../schema'

export default function CalendarPage() {
  const today = useToday()
  const schedules = useSchedules()
  const logs = useLogs()
  const products = useProducts()
  const toast = useToast()
  const [month, setMonth] = useState(() => currentMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [shiftOpen, setShiftOpen] = useState(false)

  const ms = schedules[month]
  const planByDate = useMemo(() => new Map((ms?.days ?? []).map((d) => [d.date, d])), [ms])
  const dates = datesOfMonth(month)
  const lead = firstWeekdayOfMonth(month)
  const todayInMonth = today.startsWith(month)
  const remaining = ms ? ms.days.filter((d) => d.date >= today).length : 0

  const doShift = () => {
    scheduleActions.shiftFrom(today)
    setShiftOpen(false)
    toast.show('오늘부터 남은 일정을 하루씩 밀었어요', 'success')
  }

  const copyJson = async () => {
    if (!ms) return
    const ok = await copyText(JSON.stringify(ms, null, 2))
    toast.show(ok ? `${formatMonthKo(month)} 일정 JSON을 복사했어요` : '복사에 실패했어요. 정리 탭에서 JSON 내보내기를 써 주세요', ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button type="button" className="btn-ghost h-11 w-11 px-0 text-xl" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="이전 달">‹</button>
        <h1 className="text-lg font-bold">
          {formatMonthKo(month)}
          {!ms && <span className="ml-2 text-xs font-semibold text-slate-400">일정 없음</span>}
        </h1>
        <button type="button" className="btn-ghost h-11 w-11 px-0 text-xl" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="다음 달">›</button>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="btn-primary px-2 text-xs" onClick={() => setImportOpen(true)}>일정 가져오기</button>
        <button type="button" className="btn-secondary px-1 text-xs leading-tight" disabled={!todayInMonth || !ms || remaining === 0} onClick={() => setShiftOpen(true)}>오늘부터<br />하루 밀기</button>
        <button type="button" className="btn-secondary px-2 text-xs" disabled={!ms} onClick={copyJson}>JSON 복사</button>
      </div>

      <section className="card p-3">
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
          {WEEKDAY_KO.map((w, i) => <div key={w} className={i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : ''}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }).map((_, i) => <div key={`lead-${i}`} />)}
          {dates.map((date) => {
            const plan = planByDate.get(date)
            const log = logs[date]
            const isToday = date === today
            const elapsed = date <= today
            const prog = plan ? dayProgress(plan, log, products) : undefined
            const signal = log?.signal
            const ring = signal === '빨강' ? 'ring-2 ring-rose-500' : signal === '노랑' ? 'ring-2 ring-amber-400' : ''
            const nt = plan ? NIGHT_TYPE_STYLE[plan.nightType] : null
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                aria-label={`${formatKo(date)}${plan ? ` ${plan.nightType}` : ''}${prog ? ` ${prog.pct}%` : ''}`}
                className={
                  'flex min-h-14 flex-col items-center justify-start gap-0.5 rounded-xl py-1 text-sm transition active:scale-95 ' +
                  (isToday ? 'bg-violet-100 font-bold text-violet-800 dark:bg-violet-900/50 dark:text-violet-100 ' : 'hover:bg-slate-100 dark:hover:bg-slate-800 ') +
                  (plan ? '' : 'text-slate-400 ') + ring
                }
              >
                <span>{Number(date.slice(8))}</span>
                {nt && <span className={`h-1.5 w-1.5 rounded-full ${nt.dot}`} aria-hidden="true" />}
                {prog && elapsed && (
                  prog.pct === 100 ? (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400" aria-hidden="true">✓</span>
                  ) : prog.done > 0 ? (
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{prog.pct}%</span>
                  ) : (
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  )
                )}
                {plan?.checkpoint && <span className="text-[10px] leading-none" aria-hidden="true">📷</span>}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          {NIGHT_TYPES.map((t) => (
            <span key={t} className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${NIGHT_TYPE_STYLE[t].dot}`} />{t}</span>
          ))}
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded ring-2 ring-rose-500" style={{ borderColor: SIGNAL_STYLE.빨강.hex }} />빨강 신호</span>
          <span>✓ 100%</span>
        </div>
      </section>

      {ms?.globalNotes?.length ? (
        <section className="card">
          <h2 className="section-title">이번 달 공통 규칙</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">{ms.globalNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </section>
      ) : null}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? formatKo(selected, 'M월 d일 (EEE)') : ''} tall>
        {selected && <DayView date={selected} isToday={selected === today} />}
      </Modal>

      <ImportScheduleModal open={importOpen} onClose={() => setImportOpen(false)} onImported={(m) => setMonth(m)} />

      <ConfirmDialog
        open={shiftOpen}
        title="오늘부터 하루 밀기"
        danger
        confirmLabel="하루 밀기"
        onCancel={() => setShiftOpen(false)}
        onConfirm={doShift}
        message={
          <>
            <p>{formatKo(today)} 이후 남은 <b>{remaining}일</b>의 계획을 하루씩 뒤로 밀어요.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>오늘은 <b>휴식</b>(아침 루틴 + 선크림만)으로 바뀌어요.</li>
              <li>이 달 마지막 날 계획은 잘려 사라져요.</li>
              <li>체크 기록은 그대로 남아요. 되돌리기는 없으니 필요하면 먼저 JSON을 복사해 두세요.</li>
            </ul>
          </>
        }
      />
    </div>
  )
}
