/**
 * notes / globalNotes(string[]) 를 마크다운 느낌으로 해석한다.
 *   "### 제목"  → 섹션 제목
 *   "- 내용"    → 항목 (접두사 없는 줄도 항목으로 취급)
 * 스키마는 그대로 string[] 이므로 외부 JSON 형식은 바뀌지 않는다.
 */
export interface NoteSection {
  title?: string
  items: string[]
}

export function parseNotes(notes: string[] | undefined): NoteSection[] {
  const out: NoteSection[] = []
  let cur: NoteSection | null = null
  for (const raw of notes ?? []) {
    const line = raw.trim()
    if (!line) continue
    const h = /^#{1,6}\s+(.+)$/.exec(line)
    if (h) {
      cur = { title: h[1].trim(), items: [] }
      out.push(cur)
      continue
    }
    if (!cur) {
      cur = { items: [] }
      out.push(cur)
    }
    cur.items.push(line.replace(/^[-*•]\s+/, ''))
  }
  return out
}

const DPLUS_RE = /^D\+\d+$/

/** notes 에서 "D+N" 카운터 줄을 분리한다 (헤더 칩으로 표시용) */
export function splitDayCounter(notes: string[] | undefined): { counter?: string; rest: string[] } {
  const rest: string[] = []
  let counter: string | undefined
  for (const n of notes ?? []) {
    const t = n.trim()
    if (!counter && DPLUS_RE.test(t)) counter = t
    else rest.push(n)
  }
  return { counter, rest }
}
