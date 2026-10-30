import { useState } from 'react'
import { Modal } from './Modal'
import { useToast } from './Toast'
import { parseMonthScheduleJson } from '../lib/validate'
import { SEED_SCHEDULES, scheduleActions, useProducts, useSchedules } from '../store'
import { formatMonthKo } from '../lib/dates'

interface Props {
  open: boolean
  onClose: () => void
  /** 가져온 뒤 호출 (해당 월) */
  onImported?: (month: string) => void
}

const EXAMPLE = `{
  "schemaVersion": 1,
  "month": "2026-12",
  "globalNotes": ["선크림 매일"],
  "days": [
    { "date": "2026-12-01", "nightType": "미백",
      "morning": ["bplain-foam", "b3zinc", "anua-pdrn", "torriden-cream", "dermablock-daily"],
      "night": ["bplain-foam", "torriden-serum", "txa6", "madeca21-soothing"],
      "device": "밤", "notes": [] }
  ]
}`

export function ImportScheduleModal({ open, onClose, onImported }: Props) {
  const toast = useToast()
  const products = useProducts()
  const schedules = useSchedules()
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [pendingReplace, setPendingReplace] = useState<string | null>(null)

  const close = () => { setText(''); setErrors([]); setPendingReplace(null); onClose() }

  const run = (force = false) => {
    const r = parseMonthScheduleJson(text, new Set(products.map((p) => p.id)))
    if (!r.ok) { setErrors(r.errors); return }
    if (!force && schedules[r.data.month]) { setPendingReplace(r.data.month); return }
    scheduleActions.importMonth(r.data)
    r.warnings.forEach((w) => toast.show(w, 'info'))
    toast.show(`${formatMonthKo(r.data.month)} 일정을 가져왔어요 (${r.data.days.length}일)`, 'success')
    onImported?.(r.data.month)
    close()
  }

  const loadSeed = (month: string) => {
    setText(JSON.stringify(SEED_SCHEDULES[month], null, 2))
    setErrors([])
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="일정 가져오기"
      footer={
        pendingReplace ? (
          <>
            <button type="button" className="btn-secondary flex-1" onClick={() => setPendingReplace(null)}>취소</button>
            <button type="button" className="btn-danger flex-1" onClick={() => run(true)}>{formatMonthKo(pendingReplace)} 교체</button>
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={() => setText(EXAMPLE)}>예시</button>
            {Object.keys(SEED_SCHEDULES).map((m) => (
              <button key={m} type="button" className="btn-secondary" onClick={() => loadSeed(m)}>{m} 시드</button>
            ))}
            <button type="button" className="btn-primary flex-1" onClick={() => run(false)} disabled={!text.trim()}>검증 후 가져오기</button>
          </>
        )
      }
    >
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        MonthSchedule JSON을 붙여넣으세요. 같은 월이 이미 있으면 일정만 교체되고 체크 기록은 보존돼요.
      </p>
      <textarea
        className="input min-h-56 font-mono text-xs leading-relaxed"
        placeholder='{"schemaVersion":1,"month":"2026-12","days":[...]}'
        value={text}
        onChange={(e) => { setText(e.target.value); setErrors([]); setPendingReplace(null) }}
        spellCheck={false}
      />
      {pendingReplace && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {formatMonthKo(pendingReplace)} 일정이 이미 있어요. 교체할까요? (기록은 그대로)
        </p>
      )}
      {errors.length > 0 && (
        <div className="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/40">
          <p className="mb-1 text-sm font-bold text-rose-700 dark:text-rose-200">검증 실패 — 아래 항목을 고쳐 주세요</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-rose-700 dark:text-rose-200">
            {errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
            {errors.length > 20 && <li>… 외 {errors.length - 20}개</li>}
          </ul>
        </div>
      )}
    </Modal>
  )
}
