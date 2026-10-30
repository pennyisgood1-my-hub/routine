import { useSyncExternalStore } from 'react'
import type { z } from 'zod'

export type StoreErrorKind = 'load' | 'save'
export interface StoreError { kind: StoreErrorKind; key: string; message: string }

type ErrorListener = (e: StoreError) => void
const errorListeners = new Set<ErrorListener>()
/** 저장/로드 실패를 UI(토스트)로 전달 */
export function onStoreError(cb: ErrorListener): () => void {
  errorListeners.add(cb)
  return () => errorListeners.delete(cb)
}
function emitError(e: StoreError) {
  errorListeners.forEach((cb) => cb(e))
}

export interface Slice<T> {
  key: string
  get: () => T
  set: (next: T) => void
  update: (fn: (prev: T) => T) => void
  subscribe: (cb: () => void) => () => void
  /** 저장소를 지우고 기본값으로 */
  reset: () => void
  use: () => T
}

export interface SliceOptions<T> {
  key: string
  schema: z.ZodType<T>
  defaults: () => T
  /** 저장된 raw 객체를 현재 schemaVersion으로 올리는 함수. 현재는 v1만 존재. */
  migrate?: (raw: unknown) => unknown
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/** localStorage 한 키 = 한 슬라이스. zod 검증 통과한 값만 메모리에 올린다. */
export function createSlice<T>(opts: SliceOptions<T>): Slice<T> {
  const { key, schema, defaults } = opts
  const listeners = new Set<() => void>()
  let state: T | undefined

  const load = (): T => {
    const ls = safeStorage()
    if (!ls) return defaults()
    const raw = ls.getItem(key)
    if (raw === null) return defaults()
    try {
      let parsed: unknown = JSON.parse(raw)
      if (opts.migrate) parsed = opts.migrate(parsed)
      const r = schema.safeParse(parsed)
      if (r.success) return r.data
      // 깨진 데이터는 백업 키로 옮겨두고 기본값 사용
      ls.setItem(`${key}.corrupt.${Date.now()}`, raw)
      emitError({ kind: 'load', key, message: `저장된 데이터 형식이 맞지 않아 기본값으로 시작해요 (${key})` })
      return defaults()
    } catch {
      emitError({ kind: 'load', key, message: `저장된 데이터를 읽을 수 없어요 (${key})` })
      return defaults()
    }
  }

  const get = () => {
    if (state === undefined) state = load()
    return state
  }

  const persist = (next: T) => {
    const ls = safeStorage()
    if (!ls) return
    try {
      ls.setItem(key, JSON.stringify(next))
    } catch (e) {
      const quota = e instanceof Error && /quota/i.test(e.name + e.message)
      emitError({ kind: 'save', key, message: quota ? '저장 공간이 부족해 저장하지 못했어요' : '저장에 실패했어요' })
    }
  }

  const set = (next: T) => {
    state = next
    persist(next)
    listeners.forEach((cb) => cb())
  }

  const subscribe = (cb: () => void) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }

  return {
    key,
    get,
    set,
    update: (fn) => set(fn(get())),
    subscribe,
    reset: () => {
      safeStorage()?.removeItem(key)
      state = undefined
      listeners.forEach((cb) => cb())
    },
    use: () => useSyncExternalStore(subscribe, get, get),
  }
}
