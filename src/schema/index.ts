import { z } from 'zod'

/**
 * 데이터 스키마 — 외부에서 매달 JSON으로 붙여넣는 형식이므로 필드명/값을 임의로 바꾸지 않는다.
 */
export const SCHEMA_VERSION = 1 as const

export const ACTIVE_TAGS = [
  'retinoid', 'bha', 'aha', 'vitc', 'niacinamide', 'txa', 'sunscreen', 'barrier',
  'hydration', 'cleanser', 'oil_cleanser', 'device', 'softener', 'pad', 'pack', 'spot',
] as const
export const ActiveTagSchema = z.enum(ACTIVE_TAGS)
export type ActiveTag = z.infer<typeof ActiveTagSchema>

export const CATEGORIES = ['클렌징', '패드·팩', '선케어', '크림', '세럼', '앰플', '토너·미스트', '기기', '기타'] as const
export const CategorySchema = z.enum(CATEGORIES)
export type Category = z.infer<typeof CategorySchema>

export const ProductIdSchema = z.string().min(1).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
  message: '영문·숫자·하이픈(-)·밑줄(_)만 사용',
})

export const ProductSchema = z.object({
  id: ProductIdSchema,
  name: z.string().min(1),
  category: CategorySchema,
  tags: z.array(ActiveTagSchema),
  note: z.string().optional(),
  active: z.boolean(),
})
export type Product = z.infer<typeof ProductSchema>

export const NIGHT_TYPES = ['레티날', '미백', '모공', '휴식', '연화제', '회복'] as const
export const NightTypeSchema = z.enum(NIGHT_TYPES)
export type NightType = z.infer<typeof NightTypeSchema>

export const DEVICE_SLOTS = ['아침', '밤', '쉼'] as const
export const DeviceSlotSchema = z.enum(DEVICE_SLOTS)
export type DeviceSlot = z.infer<typeof DeviceSlotSchema>

export const DateStrSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'YYYY-MM-DD 형식이어야 함' })
export const MonthStrSchema = z.string().regex(/^\d{4}-\d{2}$/, { message: 'YYYY-MM 형식이어야 함' })

export const DayPlanSchema = z.object({
  date: DateStrSchema,
  nightType: NightTypeSchema,
  morning: z.array(z.string().min(1)),
  night: z.array(z.string().min(1)),
  device: DeviceSlotSchema,
  notes: z.array(z.string()).optional(),
  checkpoint: z.boolean().optional(),
})
export type DayPlan = z.infer<typeof DayPlanSchema>

export const MonthScheduleSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    month: MonthStrSchema,
    days: z.array(DayPlanSchema),
    globalNotes: z.array(z.string()).optional(),
  })
  .superRefine((s, ctx) => {
    const seen = new Set<string>()
    s.days.forEach((d, i) => {
      if (!d.date.startsWith(s.month + '-')) {
        ctx.addIssue({ code: 'custom', path: ['days', i, 'date'], message: `${d.date} 는 ${s.month} 에 속하지 않음` })
      }
      if (seen.has(d.date)) {
        ctx.addIssue({ code: 'custom', path: ['days', i, 'date'], message: `${d.date} 날짜가 중복됨` })
      }
      seen.add(d.date)
    })
  })
export type MonthSchedule = z.infer<typeof MonthScheduleSchema>

export const SIGNALS = ['초록', '노랑', '빨강'] as const
export const SignalSchema = z.enum(SIGNALS)
export type Signal = z.infer<typeof SignalSchema>

export const DayLogSchema = z.object({
  date: DateStrSchema,
  doneMorning: z.array(z.string()),
  doneNight: z.array(z.string()),
  deviceDone: z.boolean(),
  sunscreenDone: z.boolean(),
  signal: SignalSchema.optional(),
  memo: z.string().optional(),
  skinNote: z.string().optional(),
})
export type DayLog = z.infer<typeof DayLogSchema>

export const ConflictRuleSchema = z.object({
  a: ActiveTagSchema,
  b: ActiveTagSchema,
  level: z.enum(['금지', '주의']),
  scope: z.enum(['같은 시간', '같은 날']),
  reason: z.string(),
})
export type ConflictRule = z.infer<typeof ConflictRuleSchema>

/* ---------- 저장 컨테이너 (localStorage) ---------- */

export const ThemeSchema = z.enum(['system', 'light', 'dark'])
export type Theme = z.infer<typeof ThemeSchema>

export const ProductsStoreSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  products: z.array(ProductSchema),
})
export type ProductsStore = z.infer<typeof ProductsStoreSchema>

export const SchedulesStoreSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  months: z.record(MonthStrSchema, MonthScheduleSchema),
})
export type SchedulesStore = z.infer<typeof SchedulesStoreSchema>

export const LogsStoreSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  logs: z.record(DateStrSchema, DayLogSchema),
})
export type LogsStore = z.infer<typeof LogsStoreSchema>

export const SettingsStoreSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  theme: ThemeSchema,
})
export type SettingsStore = z.infer<typeof SettingsStoreSchema>

/** 전체 백업 파일 (정리 탭 → JSON 내보내기) */
export const BackupSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  app: z.literal('routine'),
  exportedAt: z.string(),
  products: z.array(ProductSchema),
  schedules: z.record(MonthStrSchema, MonthScheduleSchema),
  logs: z.record(DateStrSchema, DayLogSchema),
  settings: SettingsStoreSchema.optional(),
})
export type Backup = z.infer<typeof BackupSchema>
