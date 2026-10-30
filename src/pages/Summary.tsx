import { useMemo, useRef, useState } from 'react'
import { exportBackup, importBackup, useLogs, useProducts, useSchedules } from '../store'
import { useToday } from '../lib/useToday'
import { currentMonth, formatKo, formatMonthKo, shiftMonth } from '../lib/dates'
import { summarizeMonth } from '../lib/progress'
import { NIGHT_TYPE_STYLE, SIGNAL_STYLE } from '../lib/labels'
import { NIGHT_TYPES, SIGNALS } from '../schema'
import { buildCsv, downloadText, exportPdf } from '../lib/export'
import { parseBackupJson } from '../lib/validate'
import { useToast } from '../components/Toast'
import { Modal, ConfirmDialog } from '../components/Modal'
import type { Backup } from '../schema'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xl font-extrabold leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

export default function SummaryPage() {
  const today = useToday()
  const schedules = useSchedules()
  const logs = useLogs()
  const products = useProducts()
  const toast = useToast()
  const [month, setMonth] = useState(() => currentMonth())
  const [busy, setBusy] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreText, setRestoreText] = useState('')
  const [restoreErrors, setRestoreErrors] = useState<string[]>([])
  const [pending, setPending] = useState<Backup | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const s = useMemo(() => summarizeMonth(month, schedules[month], logs, products, today), [month, schedules, logs, products, today])

  const onPdf = async () => {
    setBusy(true)
    try {
      await exportPdf(s, products)
      toast.show('PDF를 저장했어요', 'success')
    } catch (e) {
      console.error(e)
      toast.show('PDF 생성에 실패했어요', 'error')
    } finally {
      setBusy(false)
    }
  }
  const onCsv = () => {
    downloadText(`routine-${month}.csv`, buildCsv(s), 'text/csv;charset=utf-8')
    toast.show('CSV를 저장했어요', 'success')
  }
  const onJson = () => {
    downloadText(`routine-backup-${today}.json`, JSON.stringify(exportBackup(), null, 2), 'application/json')
    toast.show('전체 백업 JSON을 저장했어요', 'success')
  }

  const tryRestore = (text: string) => {
    const r = parseBackupJson(text)
    if (!r.ok) { setRestoreErrors(r.errors); return }
    setPending(r.data)
  }
  const onFile = async (f: File | undefined) => {
    if (!f) return
    setRestoreText(await f.text())
    setRestoreErrors([])
  }
  const doRestore = () => {
    if (!pending) return
    importBackup(pending)
    setPending(null)
    setRestoreOpen(false)
    setRestoreText('')
    toast.show('백업을 복원했어요', 'success')
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button type="button" className="btn-ghost h-11 w-11 px-0 text-xl" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="이전 달">‹</button>
        <h1 className="text-lg font-bold">{formatMonthKo(month)} 정리</h1>
        <button type="button" className="btn-ghost h-11 w-11 px-0 text-xl" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="다음 달">›</button>
      </header>

      {s.daysPlanned === 0 ? (
        <div className="card py-8 text-center text-sm text-slate-500 dark:text-slate-400">이 달에는 일정이 없어요. 캘린더에서 가져오기.</div>
      ) : (
        <>
          <section className="card space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">계획 {s.daysPlanned}일 중 오늘까지 {s.daysElapsed}일 집계</p>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="전체 완료율" value={`${s.overallPct}%`} />
              <Stat label="선크림 준수" value={`${s.sunscreenPct}%`} />
              <Stat label="기기 사용" value={`${s.deviceDone}`} sub={`계획 ${s.devicePlanned}회`} />
            </div>
            <div>
              <p className="label">밤 종류별 실행/계획</p>
              <div className="flex flex-wrap gap-1.5">
                {NIGHT_TYPES.filter((t) => s.nightTypeStats[t].planned > 0).map((t) => (
                  <span key={t} className={`chip ${NIGHT_TYPE_STYLE[t].badge}`}>{t} {s.nightTypeStats[t].done}/{s.nightTypeStats[t].planned}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="label">피부 신호등</p>
              <div className="flex gap-2">
                {SIGNALS.map((g) => (
                  <span key={g} className={`chip ${SIGNAL_STYLE[g].off}`}>{SIGNAL_STYLE[g].emoji} {g} {s.signals[g]}일</span>
                ))}
              </div>
            </div>
            {s.flagged.length > 0 && (
              <div>
                <p className="label">노랑·빨강 날짜</p>
                <ul className="space-y-1 text-sm">
                  {s.flagged.map((f) => (
                    <li key={f.date} className="flex gap-2">
                      <span>{SIGNAL_STYLE[f.signal].emoji}</span>
                      <span className="font-semibold">{formatKo(f.date, 'd일 (EEE)')}</span>
                      <span className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">{[f.skinNote, f.memo].filter(Boolean).join(' · ') || '메모 없음'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="card p-0">
            <h2 className="section-title px-4 pt-4">일별 표</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-[11px] font-bold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr className="whitespace-nowrap">
                    <th className="px-3 py-2">날짜</th><th className="px-2 py-2">밤</th><th className="px-2 py-2 text-center">아침</th><th className="px-2 py-2 text-center">밤</th><th className="px-2 py-2 text-center">기기</th><th className="px-2 py-2 text-center">선크림</th><th className="px-2 py-2 text-center">신호</th><th className="px-2 py-2">메모</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {s.rows.filter((r) => r.plan).map((r) => {
                    const p = r.progress!
                    const future = !r.elapsed
                    return (
                      <tr key={r.date} className={future ? 'text-slate-400' : ''}>
                        <td className="px-3 py-1.5 whitespace-nowrap">{formatKo(r.date, 'd일 (EEE)')}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap"><span className={`mr-1 inline-block h-2 w-2 rounded-full ${NIGHT_TYPE_STYLE[r.plan!.nightType].dot}`} />{r.plan!.nightType}</td>
                        <td className="px-2 py-1.5 text-center">{future ? '-' : `${p.morningDone}/${p.morningTotal}`}</td>
                        <td className="px-2 py-1.5 text-center">{future ? '-' : `${p.nightDone}/${p.nightTotal}`}</td>
                        <td className="px-2 py-1.5 text-center">{p.deviceApplicable ? (future ? r.plan!.device : p.deviceDone ? '✓' : '✗') : '-'}</td>
                        <td className="px-2 py-1.5 text-center">{future ? '-' : p.sunscreenDone ? '✓' : '✗'}</td>
                        <td className="px-2 py-1.5 text-center">{r.log?.signal ? SIGNAL_STYLE[r.log.signal].emoji : ''}</td>
                        <td className="max-w-40 truncate px-2 py-1.5">{[r.log?.skinNote, r.log?.memo].filter(Boolean).join(' / ')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2 className="section-title">자주 빼먹은 제품 TOP 5</h2>
            {s.missedTop.length ? (
              <ol className="space-y-1.5">
                {s.missedTop.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-center font-bold text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">{m.missed}/{m.planned}회</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-slate-400">빠뜨린 제품 없음 👍</p>}
          </section>
        </>
      )}

      <section className="card space-y-2">
        <h2 className="section-title">내보내기</h2>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="btn-primary px-2" onClick={onPdf} disabled={busy || s.daysPlanned === 0}>{busy ? '생성 중…' : 'PDF'}</button>
          <button type="button" className="btn-secondary px-2" onClick={onCsv} disabled={s.daysPlanned === 0}>CSV</button>
          <button type="button" className="btn-secondary px-2" onClick={onJson}>JSON 백업</button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">JSON 백업 = 일정 + 기록 + 제품 전체. 기기를 바꿀 때 아래 복원으로 그대로 옮겨요.</p>
        <button type="button" className="btn-ghost w-full ring-1 ring-slate-200 dark:ring-slate-700" onClick={() => setRestoreOpen(true)}>JSON 백업 복원</button>
      </section>

      <Modal
        open={restoreOpen}
        onClose={() => { setRestoreOpen(false); setRestoreText(''); setRestoreErrors([]) }}
        title="백업 복원"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>파일 선택</button>
            <button type="button" className="btn-primary flex-1" disabled={!restoreText.trim()} onClick={() => tryRestore(restoreText)}>검증 후 복원</button>
          </>
        }
      >
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">백업 파일을 선택하거나 내용을 붙여넣으세요. 현재 데이터는 모두 덮어써져요.</p>
        <textarea className="input min-h-40 font-mono text-xs" value={restoreText} onChange={(e) => { setRestoreText(e.target.value); setRestoreErrors([]) }} placeholder='{"schemaVersion":1,"app":"routine",...}' spellCheck={false} />
        {restoreErrors.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 pl-7 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {restoreErrors.slice(0, 15).map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        title="정말 복원할까요?"
        danger
        confirmLabel="덮어쓰고 복원"
        onCancel={() => setPending(null)}
        onConfirm={doRestore}
        message={pending ? (
          <p>
            백업 시각 {new Date(pending.exportedAt).toLocaleString('ko-KR')} · 제품 {pending.products.length}개 · 일정 {Object.keys(pending.schedules).length}개월 · 기록 {Object.keys(pending.logs).length}일.<br />
            지금 기기의 데이터는 모두 교체돼요.
          </p>
        ) : null}
      />
    </div>
  )
}
