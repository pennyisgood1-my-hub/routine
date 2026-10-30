// 시드 일정 생성기 — 피부과 처방(이소트레티노인) 기간용 매일 동일 루틴.
// `node scripts/gen-schedule.mjs` → src/data/schedule.2026-10.json (10/30~31), src/data/schedule.2026-11.json
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const pad = (n) => String(n).padStart(2, '0')
const START = new Date(2026, 9, 30) // 2026-10-30 저녁 = D+0
const dplus = (y, m, d) => Math.round((new Date(y, m - 1, d) - START) / 86400000)

// 매일 동일 처방 루틴. 선크림(drg-sun)은 앱의 "선크림 바름" 토글로 집계됨.
const MORNING = ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'drg-sun', 'rx-meds']
const NIGHT = ['bplain-foam', 'acnin', 'torriden-serum', 'cream-rx', 'rx-meds']

// "### 제목" / "- 항목" 규칙 → 앱에서 섹션·불릿으로 렌더 (스키마는 string[] 그대로)
const GLOBAL_NOTES = [
  '### 💊 처방 약 (10/30 저녁 = D+0)',
  '- 니메겐(이소트레티노인) + 프리마란: 아침·저녁 식후 1회씩',
  '- 빈속 금지. 아침 거르면 점심 식후로',
  '- 아크닌액: 아침·저녁 세안 후 트러블 부위에, 세럼 전',
  '### ☀️ 선크림 (닥터지 그린 마일드 업 선 플러스)',
  '- 손가락 두 마디, 두 번에 나눠 바르기',
  '- 속눈썹에서 1cm 띄우기',
  '### 🚫 복용 중 금지',
  '- 압출·스패츌러·코팩·왁싱·헌혈',
  '- 비타민A 영양제, 술',
  '- 끝난 뒤 6개월까지 압출·레이저 X',
  '- 다른 병원(치과·항생제)에서 "이소트레티노인 복용 중" 말하기',
  '### ⏸️ 중단 제품 (재진 때 의사 확인 후 복귀)',
  '- 엑소 레티날, 떡솝 쌀·초록, 스트라이덱스',
  '- 나이아신아마이드 20%, 트라넥삼산 6%, B3징크, 비타민C 앰플(미개봉·냉장)',
  '- 부스터 프로 전 모드, 일소 피지연화제·스패츌러',
  '- 티트리 마스크팩, 마데카21 토닝, 쿨링 젤크림, 코 오일 마사지',
  '- 설정 탭에서 "사용 중지"로 꺼두기',
  '### 🧴 수시',
  '- 립밤, 후시덤 미스트',
  '- 화장한 날 밤: 클린잇제로 → 물 묻혀 유화 먼저',
  '### 📝 피부 메모 형식',
  '- 입술0-3 코피O/X 붉기0-3 따가움O/X 트러블n 기분0-3',
  '- 2 이상 또는 O가 3일 연속이면 "재진 때 말하기"',
  '### 🚦 신호등 (복용 중)',
  '- 초록: 건조·입술 틈 → 그대로',
  '- 노랑: 따갑거나 붉기 2↑ → 선크림·크림만(아크닌은 의사 지시), 크림 늘리기',
  '- 빨강: 심한 각질·화끈거림·기분 저하 → 바로 병원·약국',
]

function day(y, m, d, extraNotes = [], over = {}) {
  const plan = {
    date: `${y}-${pad(m)}-${pad(d)}`,
    nightType: '회복',
    morning: [...MORNING],
    night: [...NIGHT],
    device: '쉼',
    notes: [`D+${dplus(y, m, d)}`, ...extraNotes],
    ...over,
  }
  return plan
}

const oct = {
  schemaVersion: 1,
  month: '2026-10',
  globalNotes: GLOBAL_NOTES,
  days: [
    day(2026, 10, 30, ['처방 첫날 — 저녁부터 시작 (아침은 처방 전)'], { morning: [] }),
    day(2026, 10, 31),
  ],
}

function novNotes(d) {
  const n = []
  if (d >= 1 && d <= 7) n.push('🛒 올영 블프(~11/7): 일리윤 세라마이드 아토 집중 크림 세일 확인 (아직 안 삼)')
  if (d === 5) n.push('📌 재진 날짜 확정하기 (11/7~11/9 중 하나로 예약)')
  if (d >= 7 && d <= 9) n.push('🏥 재진 후보일 — 확정되면 여기 메모')
  if (d === 9) n.push('💊 약 봉투 기준 10일치 소진 예정 (10/30 저녁부터 20회 → 11/9 아침분이 마지막). 재진 전에 남은 양 확인')
  if (d === 10) n.push('재진 이후: 의사 지시대로. 중단 제품 복귀는 의사 확인 후에만')
  if (d === 14) n.push('📷 체크포인트 사진 (같은 장소·조명·각도, 세안 직후 + 오후, 정면·양옆·코 가까이) — 처방 전후 비교용')
  if (d >= 25 && d <= 27) n.push('🛒 올영데이 (선크림·크림 재구매 후보)')
  if (d === 30) n.push('🛒 연말 올영세일 시작 (선크림·크림 재구매 후보)')
  return n
}

const nov = {
  schemaVersion: 1,
  month: '2026-11',
  globalNotes: GLOBAL_NOTES,
  days: Array.from({ length: 30 }, (_, i) => {
    const d = i + 1
    return day(2026, 11, d, novNotes(d), d === 14 ? { checkpoint: true } : {})
  }),
}

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
for (const s of [oct, nov]) {
  const out = join(dataDir, `schedule.${s.month}.json`)
  writeFileSync(out, JSON.stringify(s, null, 2) + '\n')
  console.log('wrote', `src/data/schedule.${s.month}.json`, s.days.length, 'days')
}
