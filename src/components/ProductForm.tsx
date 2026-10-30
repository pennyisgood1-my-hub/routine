import { useState } from 'react'
import { ACTIVE_TAGS, CATEGORIES, ProductSchema, type ActiveTag, type Category, type Product } from '../schema'
import { TAG_LABEL } from '../lib/labels'
import { formatZodIssues } from '../lib/validate'
import { Modal } from './Modal'

interface Props {
  open: boolean
  initial?: Product
  existingIds: string[]
  onClose: () => void
  onSave: (p: Product) => void
}

function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || `p-${Date.now().toString(36)}`
}

export function ProductForm({ open, initial, existingIds, onClose, onSave }: Props) {
  // 부모가 열 때마다 key 를 바꿔 다시 마운트하므로 초기값은 useState 초기화로 충분
  const [name, setName] = useState(initial?.name ?? '')
  const [id, setId] = useState(initial?.id ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? '크림')
  const [tags, setTags] = useState<ActiveTag[]>(initial?.tags ?? [])
  const [note, setNote] = useState(initial?.note ?? '')
  const [active, setActive] = useState(initial?.active ?? true)
  const [errors, setErrors] = useState<string[]>([])

  const submit = () => {
    const finalId = (id.trim() || slugify(name)).trim()
    const candidate = { id: finalId, name: name.trim(), category, tags, note: note.trim() || undefined, active }
    const r = ProductSchema.safeParse(candidate, { reportInput: true })
    if (!r.success) { setErrors(formatZodIssues(r.error)); return }
    if (!initial && existingIds.includes(finalId)) { setErrors([`id "${finalId}" 는 이미 있어요`]); return }
    onSave(r.data)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? '제품 수정' : '제품 추가'}
      footer={
        <>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>취소</button>
          <button type="button" className="btn-primary flex-1" onClick={submit}>저장</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="pf-name">이름 *</label>
          <input id="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 토리든 다이브인 세럼" />
        </div>
        <div>
          <label className="label" htmlFor="pf-id">id (영문 slug · 일정 JSON에서 쓰는 이름){initial ? ' — 수정 불가' : ''}</label>
          <input id="pf-id" className="input font-mono" value={id} onChange={(e) => setId(e.target.value)} placeholder="비우면 자동 생성" disabled={!!initial} />
        </div>
        <div>
          <label className="label" htmlFor="pf-cat">카테고리</label>
          <select id="pf-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <p className="label">태그 (충돌 규칙에 쓰여요)</p>
          <div className="flex flex-wrap gap-1.5">
            {ACTIVE_TAGS.map((t) => {
              const on = tags.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTags((xs) => (on ? xs.filter((x) => x !== t) : [...xs, t]))}
                  className={`chip min-h-9 px-3 ring-1 ${on ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600'}`}
                >
                  {TAG_LABEL[t]}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pf-note">한 줄 주의사항</label>
          <input id="pf-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: T존만, 20% 고함량" />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-violet-600" checked={active} onChange={(e) => setActive(e.target.checked)} />
          현재 사용 중
        </label>
        {errors.length > 0 && (
          <ul className="list-disc rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 pl-7 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </div>
    </Modal>
  )
}
