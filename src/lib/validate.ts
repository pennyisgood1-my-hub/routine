import { z } from 'zod'
import { BackupSchema, MonthScheduleSchema, type Backup, type MonthSchedule } from '../schema'

export type ParseResult<T> = { ok: true; data: T; warnings: string[] } | { ok: false; errors: string[] }

function pathToStr(path: PropertyKey[]): string {
  if (!path.length) return '(루트)'
  return path.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`
    return acc ? `${acc}.${String(seg)}` : String(seg)
  }, '')
}

function typeOf(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return '배열'
  switch (typeof v) {
    case 'string': return '문자열'
    case 'number': return '숫자'
    case 'boolean': return '불리언'
    case 'undefined': return '없음'
    case 'object': return '객체'
    default: return typeof v
  }
}

const EXPECTED_KO: Record<string, string> = {
  string: '문자열', number: '숫자', boolean: '불리언(true/false)', array: '배열', object: '객체', literal: '고정값',
}

/** zod 이슈 → 한국어 한 줄 메시지 */
export function formatZodIssues(error: z.ZodError): string[] {
  const out: string[] = []
  const walk = (issues: z.core.$ZodIssue[]) => {
    for (const issue of issues) {
      const at = pathToStr(issue.path)
      switch (issue.code) {
        case 'invalid_type': {
          const exp = EXPECTED_KO[issue.expected] ?? issue.expected
          const received = 'input' in issue ? typeOf(issue.input) : '다른 타입'
          out.push(`${at}: ${exp}이어야 하는데 ${received}이(가) 왔어요`)
          break
        }
        case 'invalid_value': {
          const vals = issue.values.map((v) => JSON.stringify(v)).join(', ')
          out.push(`${at}: 허용되지 않는 값. 가능한 값 → ${vals}`)
          break
        }
        case 'too_small':
          out.push(issue.origin === 'string' ? `${at}: 비어 있으면 안 돼요` : `${at}: 값이 너무 작아요 (최소 ${String(issue.minimum)})`)
          break
        case 'too_big':
          out.push(`${at}: 값이 너무 커요 (최대 ${String(issue.maximum)})`)
          break
        case 'invalid_format':
          out.push(`${at}: 형식이 틀렸어요 — ${issue.message}`)
          break
        case 'unrecognized_keys':
          out.push(`${at}: 알 수 없는 필드 ${issue.keys.join(', ')}`)
          break
        case 'invalid_union':
          issue.errors.forEach((e) => walk(e))
          break
        case 'invalid_key':
          out.push(`${at}: 키 형식이 틀렸어요`)
          break
        case 'custom':
        default:
          out.push(`${at}: ${issue.message}`)
      }
    }
  }
  walk(error.issues)
  return Array.from(new Set(out))
}

function parseJsonText(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  if (!trimmed) return { ok: false, error: '내용이 비어 있어요' }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const m = /position (\d+)/.exec(msg)
    if (m) {
      const pos = Number(m[1])
      const line = trimmed.slice(0, pos).split('\n').length
      return { ok: false, error: `JSON 문법 오류 (${line}번째 줄 근처). 쉼표·따옴표·괄호를 확인해 주세요` }
    }
    return { ok: false, error: `JSON 문법 오류: ${msg}` }
  }
}

/** MonthSchedule JSON 텍스트 검증. 알 수 없는 제품 id는 경고로만 알림(가져오기는 진행). */
export function parseMonthScheduleJson(text: string, knownProductIds?: Set<string>): ParseResult<MonthSchedule> {
  const j = parseJsonText(text)
  if (!j.ok) return { ok: false, errors: [j.error] }
  const r = MonthScheduleSchema.safeParse(j.value, { reportInput: true })
  if (!r.success) return { ok: false, errors: formatZodIssues(r.error) }
  const warnings: string[] = []
  if (knownProductIds) {
    const unknown = new Set<string>()
    r.data.days.forEach((d) => [...d.morning, ...d.night].forEach((id) => { if (!knownProductIds.has(id)) unknown.add(id) }))
    if (unknown.size) warnings.push(`등록되지 않은 제품 id: ${Array.from(unknown).join(', ')} — 설정 탭에서 추가하면 이름이 표시돼요`)
  }
  if (r.data.days.length === 0) warnings.push('days 가 비어 있어요')
  return { ok: true, data: r.data, warnings }
}

export function parseBackupJson(text: string): ParseResult<Backup> {
  const j = parseJsonText(text)
  if (!j.ok) return { ok: false, errors: [j.error] }
  const r = BackupSchema.safeParse(j.value, { reportInput: true })
  if (!r.success) return { ok: false, errors: formatZodIssues(r.error) }
  return { ok: true, data: r.data, warnings: [] }
}
