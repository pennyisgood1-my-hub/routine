import { parseNotes } from '../lib/notes'

/** "### 제목" / "- 항목" 규칙으로 쓴 notes 를 섹션 + 불릿으로 렌더 */
export function NoteList({ notes, className = '' }: { notes: string[] | undefined; className?: string }) {
  const sections = parseNotes(notes)
  if (!sections.length) return null
  return (
    <div className={'space-y-3 ' + className}>
      {sections.map((s, i) => (
        <section key={i}>
          {s.title && <h4 className="mb-1 text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.title}</h4>}
          <ul className="space-y-1 text-sm leading-snug text-slate-700 dark:text-slate-300">
            {s.items.map((it, j) => (
              <li key={j} className="flex gap-2">
                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" aria-hidden="true" />
                <span className="min-w-0 flex-1">{it}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
