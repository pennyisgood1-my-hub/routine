import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Kind = 'info' | 'success' | 'error'
interface ToastItem { id: number; message: string; kind: Kind }
interface ToastApi { show: (message: string, kind?: Kind) => void }

const Ctx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const show = useCallback((message: string, kind: Kind = 'info') => {
    const id = ++seq.current
    setItems((xs) => [...xs, { id, message, kind }])
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === 'error' ? 5000 : 2800)
  }, [])
  const api = useMemo(() => ({ show }), [show])
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={
              'pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium shadow-lg ' +
              (t.kind === 'error'
                ? 'bg-rose-600 text-white'
                : t.kind === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900')
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('ToastProvider 없음')
  return api
}
