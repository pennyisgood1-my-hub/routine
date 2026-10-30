import { describe, it, expect } from 'vitest'
import { parseNotes, splitDayCounter } from '../lib/notes'

describe('parseNotes', () => {
  it('### 제목 + - 항목 → 섹션', () => {
    const s = parseNotes(['### 약', '- 아침 식후', '- 저녁 식후', '### 금지', '술', ''])
    expect(s).toEqual([
      { title: '약', items: ['아침 식후', '저녁 식후'] },
      { title: '금지', items: ['술'] },
    ])
  })
  it('제목 없이 시작하면 제목 없는 섹션', () => {
    expect(parseNotes(['- a', '### b', 'c'])).toEqual([{ items: ['a'] }, { title: 'b', items: ['c'] }])
  })
  it('빈 입력', () => {
    expect(parseNotes(undefined)).toEqual([])
    expect(parseNotes([])).toEqual([])
  })
})

describe('splitDayCounter', () => {
  it('D+N 줄을 분리', () => {
    expect(splitDayCounter(['D+3', '메모'])).toEqual({ counter: 'D+3', rest: ['메모'] })
    expect(splitDayCounter(['메모'])).toEqual({ counter: undefined, rest: ['메모'] })
  })
})
