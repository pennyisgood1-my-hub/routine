import { useMemo, useState } from 'react'
import { logActions, useLogs, useProducts, useSchedules } from '../store'
import { CONFLICT_RULES } from '../data/rules'
import { buildAdvisories, productMap } from '../lib/rules'
import { dayProgress, emptyLog, morningChecklist, sunscreenProducts } from '../lib/progress'
import { addDaysStr, formatKo, monthOf, formatMonthKo } from '../lib/dates'
import { NightTypeBadge } from './NightTypeBadge'
import { ProgressBar } from './ProgressBar'
import { Checklist } from './Checklist'
import { SignalPicker } from './SignalPicker'
import { AdvisoryCard } from './AdvisoryCard'
import { ImportScheduleModal } from './ImportScheduleModal'
import { NoteList } from './NoteList'
import { splitDayCounter } from '../lib/notes'
import type { DayPlan } from '../schema'

interface Props {
  date: string
  isToday?: boolean
}

function findPlan(months: Record<string, { days: DayPlan[] }>, date: string): DayPlan | undefined {
  return months[monthOf(date)]?.days.find((d) => d.date === date)
}

export function DayView({ date, isToday }: Props) {
  const products = useProducts()
  const schedules = useSchedules()
  const logs = useLogs()
  const [importOpen, setImportOpen] = useState(false)
  const [showGlobal, setShowGlobal] = useState(false)

  const month = monthOf(date)
  const ms = schedules[month]
  const plan = findPlan(schedules, date)
  const log = logs[date] ?? emptyLog(date)
  const pmap = useMemo(() => productMap(products), [products])

  const advisories = useMemo(() => {
    if (!plan) return []
    return buildAdvisories({
      plan,
      prevPlan: findPlan(schedules, addDaysStr(date, -1)),
      nextPlan: findPlan(schedules, addDaysStr(date, 1)),
      products,
      rules: CONFLICT_RULES,
    })
  }, [plan, schedules, date, products])

  if (!plan) {
    return (
      <div className="card flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-lg font-bold">{formatKo(date, 'M월 d일 (EEE)')}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {ms ? '이 날짜는 일정에 없어요.' : `${formatMonthKo(month)} 일정이 아직 없어요.`}
        </p>
        <button type="button" className="btn-primary" onClick={() => setImportOpen(true)}>
          {ms ? '일정 다시 가져오기' : '이번 달 일정 가져오기'}
        </button>
        <ImportScheduleModal open={importOpen} onClose={() => setImportOpen(false)} />
      </div>
    )
  }

  const morningIds = morningChecklist(plan, products)
  const sunIds = sunscreenProducts(plan, products)
  const { counter, rest: dayNotes } = splitDayCounter(plan.notes)
  const progress = dayProgress(plan, log, products)
  const toItems = (ids: string[]) => ids.map((id) => ({ id, product: pmap.get(id) }))
  const allMorningDone = morningIds.length > 0 && morningIds.every((id) => log.doneMorning.includes(id))
  const allNightDone = plan.night.length > 0 && plan.night.every((id) => log.doneNight.includes(id))

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <header className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{isToday ? '오늘' : formatKo(date, 'yyyy년')}</p>
            <h1 className="text-xl font-bold leading-tight">{formatKo(date, 'M월 d일 EEEE')}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {counter && <span className="chip bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{counter}</span>}
            {plan.checkpoint && <span className="chip bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-200">📷 체크포인트</span>}
            <NightTypeBadge type={plan.nightType} />
          </div>
        </div>
        <ProgressBar done={progress.done} total={progress.total} />
        <SignalPicker value={log.signal} onChange={(s) => logActions.setSignal(date, s)} />
      </header>

      {/* 선크림 토글 */}
      <button
        type="button"
        role="switch"
        aria-checked={log.sunscreenDone}
        onClick={() => logActions.setSunscreenDone(date, !log.sunscreenDone)}
        className={
          'flex min-h-16 w-full items-center justify-between rounded-2xl px-4 text-left shadow-sm ring-1 transition ' +
          (log.sunscreenDone
            ? 'bg-amber-400 text-amber-950 ring-amber-500'
            : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800')
        }
      >
        <span>
          <span className="block text-base font-bold">☀️ 선크림 바름</span>
          <span className={'block text-xs ' + (log.sunscreenDone ? 'text-amber-900' : 'text-slate-500 dark:text-slate-400')}>
            {sunIds.length ? sunIds.map((id) => pmap.get(id)?.name ?? id).join(', ') : '아침 마지막 단계 · 두 겹 나눠 바르기'}
          </span>
        </span>
        <span className={'ml-3 flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ' + (log.sunscreenDone ? 'bg-amber-700/40' : 'bg-slate-300 dark:bg-slate-700')}>
          <span className={'h-6 w-6 rounded-full bg-white shadow transition ' + (log.sunscreenDone ? 'translate-x-6' : '')} />
        </span>
      </button>

      {/* 아침 */}
      <section className="card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="section-title mb-0">🌅 아침 <span className="font-normal">{progress.morningDone}/{progress.morningTotal}</span></h2>
          <button type="button" className="btn-ghost min-h-9 px-2 text-xs" onClick={() => logActions.setAllMorning(date, morningIds, !allMorningDone)}>
            {allMorningDone ? '전체 해제' : '전체 완료'}
          </button>
        </div>
        <Checklist items={toItems(morningIds)} checked={log.doneMorning} onToggle={(id) => logActions.toggleMorning(date, id)} emptyText="아침 루틴 없음" />
      </section>

      {/* 밤 */}
      <section className="card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="section-title mb-0">🌙 밤 <span className="font-normal">{progress.nightDone}/{progress.nightTotal}</span></h2>
          {plan.night.length > 0 && (
            <button type="button" className="btn-ghost min-h-9 px-2 text-xs" onClick={() => logActions.setAllNight(date, plan.night, !allNightDone)}>
              {allNightDone ? '전체 해제' : '전체 완료'}
            </button>
          )}
        </div>
        <Checklist items={toItems(plan.night)} checked={log.doneNight} onToggle={(id) => logActions.toggleNight(date, id)} emptyText={plan.nightType === '휴식' ? '휴식 — 보습만' : '밤 루틴 없음'} />
      </section>

      {/* 기기 */}
      <section className={'card ' + (plan.device === '쉼' ? 'opacity-60' : '')}>
        <button
          type="button"
          role="checkbox"
          aria-checked={progress.deviceDone}
          disabled={plan.device === '쉼'}
          onClick={() => logActions.setDeviceDone(date, !log.deviceDone)}
          className="flex min-h-11 w-full items-center gap-3 text-left disabled:cursor-not-allowed"
        >
          <span
            className={
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ' +
              (progress.deviceDone ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 dark:border-slate-600')
            }
            aria-hidden="true"
          >
            {progress.deviceDone ? '✓' : ''}
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">⚡ 기기 · 오늘 슬롯: <b>{plan.device}</b></span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {plan.device === '쉼' ? '오늘은 기기 쉬는 날' : (products.find((p) => p.tags.includes('device') && p.active)?.note ?? '')}
            </span>
          </span>
        </button>
      </section>

      <AdvisoryCard advisories={advisories} />

      {/* 노트 */}
      {(dayNotes.length || ms?.globalNotes?.length) ? (
        <section className="card">
          <h2 className="section-title">📝 오늘 메모</h2>
          {dayNotes.length ? <NoteList notes={dayNotes} /> : <p className="text-sm text-slate-400">특이사항 없음</p>}
          {ms?.globalNotes?.length ? (
            <div className="mt-3">
              <button type="button" className="btn-ghost min-h-9 px-2 text-xs" onClick={() => setShowGlobal((v) => !v)}>
                {showGlobal ? '▾' : '▸'} 이번 달 공통 규칙
              </button>
              {showGlobal && <NoteList notes={ms.globalNotes} className="mt-2" />}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 기록 */}
      <section className="card space-y-3">
        <h2 className="section-title">✍️ 기록</h2>
        <div>
          <label className="label" htmlFor={`skin-${date}`}>피부 메모 (트러블·붉은기 위치)</label>
          <input id={`skin-${date}`} className="input" placeholder="예: 콧볼 붉은기 ↑, 턱 좁쌀 1" value={log.skinNote ?? ''} onChange={(e) => logActions.setSkinNote(date, e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`memo-${date}`}>메모</label>
          <textarea id={`memo-${date}`} className="input min-h-20 py-2" placeholder="오늘 느낀 점, 바꾼 것" value={log.memo ?? ''} onChange={(e) => logActions.setMemo(date, e.target.value)} />
        </div>
      </section>
    </div>
  )
}
