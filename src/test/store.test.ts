import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { createSlice, onStoreError } from '../store/storage'

const Schema = z.object({ schemaVersion: z.literal(1), items: z.array(z.string()) })
type S = z.infer<typeof Schema>

describe('createSlice (localStorage)', () => {
  beforeEach(() => localStorage.clear())

  it('기본값 → set → 새 슬라이스가 다시 읽음 (새로고침 시뮬레이션)', () => {
    const a = createSlice<S>({ key: 'k', schema: Schema, defaults: () => ({ schemaVersion: 1, items: [] }) })
    expect(a.get().items).toEqual([])
    a.update((s) => ({ ...s, items: ['x'] }))
    const b = createSlice<S>({ key: 'k', schema: Schema, defaults: () => ({ schemaVersion: 1, items: [] }) })
    expect(b.get().items).toEqual(['x'])
  })

  it('깨진 데이터는 백업 키로 옮기고 기본값 + 에러 이벤트', () => {
    localStorage.setItem('k', '{"schemaVersion":1,"items":"oops"}')
    const errs: string[] = []
    const off = onStoreError((e) => errs.push(e.kind))
    const a = createSlice<S>({ key: 'k', schema: Schema, defaults: () => ({ schemaVersion: 1, items: ['d'] }) })
    expect(a.get().items).toEqual(['d'])
    expect(errs).toEqual(['load'])
    expect(Object.keys(localStorage).some((k) => k.startsWith('k.corrupt.'))).toBe(true)
    off()
  })

  it('migrate 훅이 먼저 적용됨', () => {
    localStorage.setItem('k', '{"items":["old"]}')
    const a = createSlice<S>({
      key: 'k', schema: Schema, defaults: () => ({ schemaVersion: 1, items: [] }),
      migrate: (raw) => ({ ...(raw as object), schemaVersion: 1 }),
    })
    expect(a.get().items).toEqual(['old'])
  })

  it('저장 실패 시 에러 이벤트 (quota)', () => {
    const a = createSlice<S>({ key: 'k', schema: Schema, defaults: () => ({ schemaVersion: 1, items: [] }) })
    const errs: string[] = []
    const off = onStoreError((e) => errs.push(e.message))
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('exceeded'); err.name = 'QuotaExceededError'; throw err
    })
    a.set({ schemaVersion: 1, items: ['y'] })
    spy.mockRestore()
    off()
    expect(errs[0]).toMatch(/저장 공간/)
    expect(a.get().items).toEqual(['y']) // 메모리 상태는 유지
  })

  it('subscribe 알림 및 reset', () => {
    const a = createSlice<S>({ key: 'k', schema: Schema, defaults: () => ({ schemaVersion: 1, items: [] }) })
    const cb = vi.fn()
    a.subscribe(cb)
    a.set({ schemaVersion: 1, items: ['z'] })
    expect(cb).toHaveBeenCalledTimes(1)
    a.reset()
    expect(localStorage.getItem('k')).toBeNull()
    expect(a.get().items).toEqual([])
  })
})
