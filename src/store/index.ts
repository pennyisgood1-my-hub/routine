import {
  LogsStoreSchema, ProductsStoreSchema, SchedulesStoreSchema, SettingsStoreSchema, MonthScheduleSchema,
  SCHEMA_VERSION,
  type Backup, type DayLog, type LogsStore, type MonthSchedule, type Product, type ProductsStore,
  type SchedulesStore, type SettingsStore, type Signal, type Theme,
} from '../schema'
import { DEFAULT_PRODUCTS } from '../data/products'
import seedOct2026 from '../data/schedule.2026-10.json'
import seedNov2026 from '../data/schedule.2026-11.json'
import { createSlice } from './storage'
export { onStoreError } from './storage'
import { emptyLog } from '../lib/progress'
import { shiftScheduleFrom } from '../lib/shift'

export const APP_VERSION = __APP_VERSION__
export const STORAGE_KEYS = {
  products: 'routine.v1.products',
  schedules: 'routine.v1.schedules',
  logs: 'routine.v1.logs',
  settings: 'routine.v1.settings',
} as const

/** 내장 시드 일정 (2026-10 처방 시작 이틀 + 2026-11). 첫 실행 시 자동 등록. */
export const SEED_SCHEDULES: Record<string, MonthSchedule> = {
  '2026-10': MonthScheduleSchema.parse(seedOct2026),
  '2026-11': MonthScheduleSchema.parse(seedNov2026),
}

/** 미래 버전 마이그레이션 자리. 현재 v1만 존재하므로 그대로 통과. */
export function migrateV1(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && !('schemaVersion' in raw)) {
    return { ...(raw as object), schemaVersion: SCHEMA_VERSION }
  }
  return raw
}

export const productsSlice = createSlice<ProductsStore>({
  key: STORAGE_KEYS.products,
  schema: ProductsStoreSchema,
  defaults: () => ({ schemaVersion: SCHEMA_VERSION, products: DEFAULT_PRODUCTS.map((p) => ({ ...p, tags: [...p.tags] })) }),
  migrate: migrateV1,
})

export const schedulesSlice = createSlice<SchedulesStore>({
  key: STORAGE_KEYS.schedules,
  schema: SchedulesStoreSchema,
  defaults: () => ({ schemaVersion: SCHEMA_VERSION, months: { ...SEED_SCHEDULES } }),
  migrate: migrateV1,
})

export const logsSlice = createSlice<LogsStore>({
  key: STORAGE_KEYS.logs,
  schema: LogsStoreSchema,
  defaults: () => ({ schemaVersion: SCHEMA_VERSION, logs: {} }),
  migrate: migrateV1,
})

export const settingsSlice = createSlice<SettingsStore>({
  key: STORAGE_KEYS.settings,
  schema: SettingsStoreSchema,
  defaults: () => ({ schemaVersion: SCHEMA_VERSION, theme: 'system' }),
  migrate: migrateV1,
})

/* ---------- hooks ---------- */
export const useProducts = () => productsSlice.use().products
export const useSchedules = () => schedulesSlice.use().months
export const useLogs = () => logsSlice.use().logs
export const useSettings = () => settingsSlice.use()

/* ---------- 로그 액션 ---------- */
function updateLog(date: string, fn: (log: DayLog) => DayLog) {
  logsSlice.update((s) => ({ ...s, logs: { ...s.logs, [date]: fn(s.logs[date] ?? emptyLog(date)) } }))
}
function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}
export const logActions = {
  toggleMorning: (date: string, id: string) => updateLog(date, (l) => ({ ...l, doneMorning: toggleIn(l.doneMorning, id) })),
  toggleNight: (date: string, id: string) => updateLog(date, (l) => ({ ...l, doneNight: toggleIn(l.doneNight, id) })),
  setDeviceDone: (date: string, v: boolean) => updateLog(date, (l) => ({ ...l, deviceDone: v })),
  setSunscreenDone: (date: string, v: boolean) => updateLog(date, (l) => ({ ...l, sunscreenDone: v })),
  setSignal: (date: string, s: Signal | undefined) => updateLog(date, (l) => {
    const { signal: _omit, ...rest } = l
    return s ? { ...rest, signal: s } : rest
  }),
  setMemo: (date: string, memo: string) => updateLog(date, (l) => ({ ...l, memo: memo || undefined })),
  setSkinNote: (date: string, skinNote: string) => updateLog(date, (l) => ({ ...l, skinNote: skinNote || undefined })),
  setAllMorning: (date: string, ids: string[], done: boolean) => updateLog(date, (l) => ({
    ...l, doneMorning: done ? Array.from(new Set([...l.doneMorning, ...ids])) : l.doneMorning.filter((x) => !ids.includes(x)),
  })),
  setAllNight: (date: string, ids: string[], done: boolean) => updateLog(date, (l) => ({
    ...l, doneNight: done ? Array.from(new Set([...l.doneNight, ...ids])) : l.doneNight.filter((x) => !ids.includes(x)),
  })),
}

/* ---------- 일정 액션 ---------- */
export const scheduleActions = {
  /** 해당 월 교체 (로그는 보존) */
  importMonth: (ms: MonthSchedule) => schedulesSlice.update((s) => ({ ...s, months: { ...s.months, [ms.month]: ms } })),
  removeMonth: (month: string) => schedulesSlice.update((s) => {
    const months = { ...s.months }
    delete months[month]
    return { ...s, months }
  }),
  shiftFrom: (date: string) => {
    const month = date.slice(0, 7)
    schedulesSlice.update((s) => {
      const ms = s.months[month]
      if (!ms) return s
      return { ...s, months: { ...s.months, [month]: shiftScheduleFrom(ms, date) } }
    })
  },
}

/* ---------- 제품 액션 ---------- */
export const productActions = {
  upsert: (p: Product) => productsSlice.update((s) => {
    const idx = s.products.findIndex((x) => x.id === p.id)
    const products = [...s.products]
    if (idx >= 0) products[idx] = p
    else products.push(p)
    return { ...s, products }
  }),
  setActive: (id: string, active: boolean) => productsSlice.update((s) => ({
    ...s, products: s.products.map((p) => (p.id === id ? { ...p, active } : p)),
  })),
  remove: (id: string) => productsSlice.update((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) })),
  resetToDefaults: () => productsSlice.reset(),
}

/* ---------- 설정 ---------- */
export const settingsActions = {
  setTheme: (theme: Theme) => settingsSlice.update((s) => ({ ...s, theme })),
}

/* ---------- 백업 / 복원 / 전체 삭제 ---------- */
export function exportBackup(): Backup {
  return {
    schemaVersion: SCHEMA_VERSION,
    app: 'routine',
    exportedAt: new Date().toISOString(),
    products: productsSlice.get().products,
    schedules: schedulesSlice.get().months,
    logs: logsSlice.get().logs,
    settings: settingsSlice.get(),
  }
}

export function importBackup(b: Backup) {
  productsSlice.set({ schemaVersion: SCHEMA_VERSION, products: b.products })
  schedulesSlice.set({ schemaVersion: SCHEMA_VERSION, months: b.schedules })
  logsSlice.set({ schemaVersion: SCHEMA_VERSION, logs: b.logs })
  if (b.settings) settingsSlice.set(b.settings)
}

export function clearAllData() {
  productsSlice.reset()
  schedulesSlice.reset()
  logsSlice.reset()
  settingsSlice.reset()
}
