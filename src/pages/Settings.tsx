import { useMemo, useState } from 'react'
import { APP_VERSION, STORAGE_KEYS, clearAllData, productActions, settingsActions, useProducts, useSettings } from '../store'
import { CATEGORIES, SCHEMA_VERSION, type Product, type Theme } from '../schema'
import { TAG_LABEL } from '../lib/labels'
import { ProductForm } from '../components/ProductForm'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'

const THEMES: { v: Theme; label: string }[] = [
  { v: 'system', label: '시스템' },
  { v: 'light', label: '라이트' },
  { v: 'dark', label: '다크' },
]

function storageBytes(): number {
  try {
    return Object.values(STORAGE_KEYS).reduce((n, k) => n + (localStorage.getItem(k)?.length ?? 0) * 2, 0)
  } catch {
    return 0
  }
}

export default function SettingsPage() {
  const products = useProducts()
  const settings = useSettings()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>()
  const [formKey, setFormKey] = useState(0)
  const [showInactive, setShowInactive] = useState(true)
  const [resetOpen, setResetOpen] = useState(false)
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const grouped = useMemo(() => CATEGORIES.map((c) => ({ c, items: products.filter((p) => p.category === c && (showInactive || p.active)) })).filter((g) => g.items.length), [products, showInactive])

  const openAdd = () => { setEditing(undefined); setFormKey((k) => k + 1); setFormOpen(true) }
  const openEdit = (p: Product) => { setEditing(p); setFormKey((k) => k + 1); setFormOpen(true) }
  const save = (p: Product) => {
    productActions.upsert(p)
    setFormOpen(false)
    toast.show(editing ? '제품을 수정했어요' : '제품을 추가했어요', 'success')
  }

  const wipe = () => {
    clearAllData()
    setWipeStep(0)
    toast.show('모든 데이터를 삭제했어요. 기본값으로 시작합니다', 'success')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">설정</h1>

      <section className="card">
        <h2 className="section-title">화면</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="다크모드">
          {THEMES.map((t) => (
            <button key={t.v} type="button" role="radio" aria-checked={settings.theme === t.v} onClick={() => settingsActions.setTheme(t.v)} className={settings.theme === t.v ? 'btn-primary' : 'btn-secondary'}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title mb-0">제품 마스터 ({products.filter((p) => p.active).length}/{products.length} 사용 중)</h2>
          <button type="button" className="btn-primary min-h-9 px-3 text-xs" onClick={openAdd}>+ 추가</button>
        </div>
        <label className="mb-2 flex min-h-9 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> 사용 중지 제품도 보기
        </label>
        <div className="space-y-3">
          {grouped.map(({ c, items }) => (
            <div key={c}>
              <p className="mb-1 text-xs font-bold text-slate-400">{c}</p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEdit(p)}>
                      <span className={'block text-sm font-medium ' + (p.active ? '' : 'text-slate-400 line-through')}>{p.name}</span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{p.id}</span>
                        {p.tags.length ? ' · ' + p.tags.map((t) => TAG_LABEL[t]).join(', ') : ''}
                        {p.note ? ` · ${p.note}` : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.active}
                      aria-label={`${p.name} 사용 여부`}
                      onClick={() => productActions.setActive(p.id, !p.active)}
                      className={'flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ' + (p.active ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700')}
                    >
                      <span className={'h-6 w-6 rounded-full bg-white shadow transition ' + (p.active ? 'translate-x-5' : '')} />
                    </button>
                    <button type="button" className="btn-ghost h-9 w-9 shrink-0 px-0 text-slate-400" aria-label={`${p.name} 삭제`} onClick={() => setRemoveId(p.id)}>🗑</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-3 w-full ring-1 ring-slate-200 dark:ring-slate-700" onClick={() => setResetOpen(true)}>내장 제품 목록으로 되돌리기</button>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">데이터</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">모든 데이터는 이 기기의 브라우저 저장소에만 있어요. 백업은 정리 탭 → JSON 백업.</p>
        <button type="button" className="btn-danger w-full" onClick={() => setWipeStep(1)}>데이터 전체 삭제</button>
      </section>

      <section className="card text-xs text-slate-500 dark:text-slate-400">
        <h2 className="section-title">정보</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt>앱 버전</dt><dd className="font-mono">{APP_VERSION}</dd>
          <dt>schemaVersion</dt><dd className="font-mono">{SCHEMA_VERSION}</dd>
          <dt>저장 용량</dt><dd className="font-mono">{(storageBytes() / 1024).toFixed(1)} KB</dd>
          <dt>저장 위치</dt><dd>localStorage (오프라인 전용, 서버 없음)</dd>
        </dl>
      </section>

      <ProductForm key={formKey} open={formOpen} initial={editing} existingIds={products.map((p) => p.id)} onClose={() => setFormOpen(false)} onSave={save} />

      <ConfirmDialog
        open={resetOpen}
        title="내장 제품 목록으로 되돌리기"
        danger
        confirmLabel="되돌리기"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => { productActions.resetToDefaults(); setResetOpen(false); toast.show('제품 목록을 초기화했어요', 'success') }}
        message="추가·수정한 제품이 모두 사라지고 앱에 내장된 28개 제품으로 돌아가요. 일정과 기록은 그대로예요."
      />

      <ConfirmDialog
        open={!!removeId}
        title="제품 삭제"
        danger
        confirmLabel="삭제"
        onCancel={() => setRemoveId(null)}
        onConfirm={() => { if (removeId) productActions.remove(removeId); setRemoveId(null); toast.show('제품을 삭제했어요', 'success') }}
        message={<p>일정에 이 제품 id가 남아 있으면 "미등록"으로 표시돼요. 보통은 삭제 대신 <b>사용 중지</b>를 권해요.</p>}
      />

      <ConfirmDialog
        open={wipeStep === 1}
        title="데이터 전체 삭제 (1/2)"
        danger
        confirmLabel="계속"
        onCancel={() => setWipeStep(0)}
        onConfirm={() => setWipeStep(2)}
        message="일정, 체크 기록, 제품, 설정이 모두 삭제돼요. 먼저 정리 탭에서 JSON 백업을 받아 두셨나요?"
      />
      <ConfirmDialog
        open={wipeStep === 2}
        title="정말 삭제할까요? (2/2)"
        danger
        confirmLabel="모두 삭제"
        onCancel={() => setWipeStep(0)}
        onConfirm={wipe}
        message="되돌릴 수 없어요. 삭제 후에는 내장 제품 목록과 내장 시드 일정으로 다시 시작해요."
      />
    </div>
  )
}
