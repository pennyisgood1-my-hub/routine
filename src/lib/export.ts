import type { MonthSummary } from './progress'
import type { Product } from '../schema'
import { formatKo, formatMonthKo } from './dates'
import { NIGHT_TYPE_STYLE, SIGNAL_STYLE } from './labels'
import { NIGHT_TYPES, SIGNALS } from '../schema'

export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

function csvCell(v: string | number | undefined): string {
  const s = v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 월간 정리표 CSV (UTF-8 BOM → 엑셀에서 한글 OK) */
export function buildCsv(s: MonthSummary): string {
  const header = ['날짜', '요일', '밤 종류', '아침 완료', '밤 완료', '기기', '선크림', '신호등', '피부 메모', '메모']
  const rows = s.rows.filter((r) => r.plan).map((r) => {
    const p = r.progress!
    return [
      r.date,
      formatKo(r.date, 'EEE'),
      r.plan!.nightType,
      `${p.morningDone}/${p.morningTotal}`,
      `${p.nightDone}/${p.nightTotal}`,
      p.deviceApplicable ? (p.deviceDone ? 'O' : 'X') : '-',
      p.sunscreenDone ? 'O' : 'X',
      r.log?.signal ?? '',
      r.log?.skinNote ?? '',
      r.log?.memo ?? '',
    ].map(csvCell).join(',')
  })
  return '﻿' + [header.join(','), ...rows].join('\r\n')
}

/* ---------------- PDF ---------------- */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * PDF용 HTML. html2canvas 가 oklch 색을 못 읽으므로 Tailwind 클래스 없이 hex 인라인 스타일만 사용.
 */
export function buildPdfHtml(s: MonthSummary, _products: Product[]): string {
  const font = "font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', Roboto, sans-serif;"
  const card = (label: string, value: string, sub = '') =>
    `<div style="flex:1;min-width:120px;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:#f8fafc">
      <div style="font-size:11px;color:#64748b;font-weight:600">${esc(label)}</div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:2px">${esc(value)}</div>
      ${sub ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${esc(sub)}</div>` : ''}
    </div>`

  const ntRows = NIGHT_TYPES.filter((t) => s.nightTypeStats[t].planned > 0)
    .map((t) => `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 8px 2px 0;font-size:12px"><span style="width:8px;height:8px;border-radius:99px;background:${NIGHT_TYPE_STYLE[t].hex};display:inline-block"></span>${t} ${s.nightTypeStats[t].done}/${s.nightTypeStats[t].planned}</span>`)
    .join('')
  const sigRow = SIGNALS.map((g) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:12px"><span style="width:10px;height:10px;border-radius:99px;background:${SIGNAL_STYLE[g].hex};display:inline-block"></span>${g} ${s.signals[g]}일</span>`).join('')

  const trs = s.rows.filter((r) => r.plan).map((r, i) => {
    const p = r.progress!
    const sig = r.log?.signal
    const bg = i % 2 ? '#ffffff' : '#f8fafc'
    const sigCell = sig ? `<span style="display:inline-block;width:10px;height:10px;border-radius:99px;background:${SIGNAL_STYLE[sig].hex}"></span>` : ''
    const memo = [r.log?.skinNote, r.log?.memo].filter(Boolean).join(' / ')
    const dim = r.elapsed ? '' : 'color:#94a3b8;'
    return `<tr style="background:${bg};${dim}">
      <td style="padding:5px 6px;white-space:nowrap">${formatKo(r.date, 'd일 (EEE)')}</td>
      <td style="padding:5px 6px;white-space:nowrap"><span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:${NIGHT_TYPE_STYLE[r.plan!.nightType].hex};margin-right:4px"></span>${r.plan!.nightType}</td>
      <td style="padding:5px 6px;text-align:center">${r.elapsed ? `${p.morningDone}/${p.morningTotal}` : '-'}</td>
      <td style="padding:5px 6px;text-align:center">${r.elapsed ? `${p.nightDone}/${p.nightTotal}` : '-'}</td>
      <td style="padding:5px 6px;text-align:center">${p.deviceApplicable ? (r.elapsed ? (p.deviceDone ? 'O' : 'X') : r.plan!.device) : '-'}</td>
      <td style="padding:5px 6px;text-align:center">${r.elapsed ? (p.sunscreenDone ? 'O' : 'X') : '-'}</td>
      <td style="padding:5px 6px;text-align:center">${sigCell}</td>
      <td style="padding:5px 6px;max-width:220px;word-break:break-all">${esc(memo)}</td>
    </tr>`
  }).join('')

  const missed = s.missedTop.length
    ? `<ol style="margin:4px 0 0 18px;padding:0;font-size:12px">${s.missedTop.map((m) => `<li>${esc(m.name)} — ${m.missed}/${m.planned}회 빠짐</li>`).join('')}</ol>`
    : '<p style="font-size:12px;color:#64748b;margin:4px 0 0">빠뜨린 제품 없음</p>'

  const flagged = s.flagged.length
    ? `<ul style="margin:4px 0 0 18px;padding:0;font-size:12px">${s.flagged.map((f) => `<li>${formatKo(f.date, 'd일 (EEE)')} ${f.signal}${f.skinNote ? ` · ${esc(f.skinNote)}` : ''}${f.memo ? ` · ${esc(f.memo)}` : ''}</li>`).join('')}</ul>`
    : '<p style="font-size:12px;color:#64748b;margin:4px 0 0">없음</p>'

  return `<div style="${font}color:#0f172a;background:#ffffff;width:794px;padding:36px 40px;box-sizing:border-box;line-height:1.4">
    <h1 style="font-size:22px;font-weight:800;margin:0 0 2px">${formatMonthKo(s.month)} 루틴 정리</h1>
    <p style="font-size:11px;color:#64748b;margin:0 0 14px">계획 ${s.daysPlanned}일 · 집계 ${s.daysElapsed}일 · 생성 ${new Date().toLocaleDateString('ko-KR')}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${card('전체 완료율', `${s.overallPct}%`)}
      ${card('선크림 준수율', `${s.sunscreenPct}%`)}
      ${card('기기 사용', `${s.deviceDone}/${s.devicePlanned}`, '실행/계획')}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">
        <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:4px">밤 종류별 실행/계획</div>${ntRows}
      </div>
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">
        <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:4px">피부 신호등</div>${sigRow}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:14px">
      <thead><tr style="background:#ede9fe;color:#4c1d95">
        <th style="padding:6px;text-align:left">날짜</th><th style="padding:6px;text-align:left">밤</th><th style="padding:6px">아침</th><th style="padding:6px">밤</th><th style="padding:6px">기기</th><th style="padding:6px">선크림</th><th style="padding:6px">신호</th><th style="padding:6px;text-align:left">메모</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>
    <div style="display:flex;gap:8px">
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">
        <div style="font-size:12px;font-weight:700">자주 빼먹은 제품 TOP 5</div>${missed}
      </div>
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">
        <div style="font-size:12px;font-weight:700">노랑·빨강 날짜</div>${flagged}
      </div>
    </div>
  </div>`
}

/**
 * A4 세로 PDF. html2canvas 로 렌더 → 이미지 → 페이지 분할. 한글은 시스템 폰트로 그려지므로 깨지지 않음.
 * Tailwind v4 가 oklch 색을 쓰면 html2canvas(1.4)가 파싱에 실패하므로, 앱 CSS 가 전혀 없는 srcdoc iframe 안에서 렌더한다.
 */
export async function exportPdf(s: MonthSummary, products: Product[]): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1200px;border:0;opacity:0;pointer-events:none'
  iframe.srcdoc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#ffffff;color:#0f172a}*{box-sizing:border-box}table{border-collapse:collapse}</style></head><body>${buildPdfHtml(s, products)}</body></html>`
  document.body.appendChild(iframe)
  try {
    await new Promise<void>((resolve) => { iframe.onload = () => resolve() })
    const doc = iframe.contentDocument!
    const target = doc.body.firstElementChild as HTMLElement
    iframe.style.height = `${target.scrollHeight + 20}px`
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, windowWidth: 794 })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageW = 210
    const pageH = 297
    const pxPerPage = Math.floor((canvas.width * pageH) / pageW)
    let y = 0
    let page = 0
    while (y < canvas.height) {
      const sliceH = Math.min(pxPerPage, canvas.height - y)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceH
      const ctx = slice.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
      if (page > 0) pdf.addPage()
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, (sliceH * pageW) / canvas.width)
      y += sliceH
      page++
    }
    pdf.save(`routine-${s.month}.pdf`)
  } finally {
    iframe.remove()
  }
}
