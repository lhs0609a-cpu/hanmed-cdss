/**
 * 처방전/안내문 인쇄 — 별도 PDF 라이브러리 의존을 만들지 않고
 * window.print() 와 격리된 인쇄 컨테이너로 처방전을 양식화한다.
 *
 * 한의사 가정:
 *   - 한의원 헤더(상호·주소·전화·면허) + 환자 정보 + 처방 내용 + 도장 자리.
 *   - PDF 라이브러리(jspdf 등) 도입 시 PrescriptionTemplate 의 HTML 을 그대로 입력으로 사용.
 *
 * 정책:
 *   - print 직전 화면에 미리보기 노출.
 *   - 인쇄 후 미리보기 element 를 제거하여 메모리 누수 방지.
 */

export interface PrescriptionPrintData {
  // 한의원 헤더
  clinicName: string
  clinicAddress?: string
  clinicPhone?: string
  doctorName: string
  doctorLicense?: string

  // 환자
  patientName: string
  patientAge?: string | number
  patientGender?: string
  visitDate: string

  // 진단/처방
  diagnosis: string
  prescription: string // free text or formatted
  herbs?: Array<{ name: string; amount: string; role?: string }>
  dosage: string
  duration: string
  instructions?: string
  cautions?: string
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(data: PrescriptionPrintData): string {
  const herbsRows =
    (data.herbs ?? [])
      .map(
        (h) =>
          `<tr><td>${escapeHtml(h.name)}</td><td>${escapeHtml(h.amount)}</td><td>${escapeHtml(h.role ?? '')}</td></tr>`,
      )
      .join('') ||
    '<tr><td colspan="3" style="text-align:center;color:#888">약재 상세는 처방란 참고</td></tr>'

  return `
  <div class="rx-page">
    <header class="rx-header">
      <div class="rx-clinic">
        <div class="rx-clinic-name">${escapeHtml(data.clinicName)}</div>
        ${data.clinicAddress ? `<div class="rx-clinic-line">${escapeHtml(data.clinicAddress)}</div>` : ''}
        ${data.clinicPhone ? `<div class="rx-clinic-line">전화: ${escapeHtml(data.clinicPhone)}</div>` : ''}
      </div>
      <div class="rx-title">한약 처방전</div>
    </header>

    <section class="rx-patient">
      <div><strong>환자</strong>: ${escapeHtml(data.patientName)} ${data.patientAge ? `· ${escapeHtml(String(data.patientAge))}` : ''} ${data.patientGender ? `· ${escapeHtml(data.patientGender)}` : ''}</div>
      <div><strong>진료일</strong>: ${escapeHtml(data.visitDate)}</div>
    </section>

    <section class="rx-section">
      <h3>진단/변증 추론 (참고용)</h3>
      <p>${escapeHtml(data.diagnosis)}</p>
    </section>

    <section class="rx-section">
      <h3>처방</h3>
      <p>${escapeHtml(data.prescription)}</p>
      <table class="rx-table">
        <thead><tr><th>약재</th><th>용량</th><th>군신좌사</th></tr></thead>
        <tbody>${herbsRows}</tbody>
      </table>
    </section>

    <section class="rx-section rx-grid">
      <div><strong>복용법</strong>: ${escapeHtml(data.dosage)}</div>
      <div><strong>기간</strong>: ${escapeHtml(data.duration)}</div>
    </section>

    ${data.instructions ? `<section class="rx-section"><h3>복약 지도</h3><p>${escapeHtml(data.instructions)}</p></section>` : ''}
    ${data.cautions ? `<section class="rx-section"><h3>주의사항</h3><p>${escapeHtml(data.cautions)}</p></section>` : ''}

    <footer class="rx-footer">
      <div class="rx-doctor">한의사: ${escapeHtml(data.doctorName)} ${data.doctorLicense ? ` (면허 ${escapeHtml(data.doctorLicense)})` : ''}</div>
      <div class="rx-stamp">(서명/인)</div>
    </footer>
    <p class="rx-disclaimer">
      본 처방은 한의사의 진료에 따라 발행된 것이며, 본 양식은 임상 보조 출력물입니다.
    </p>
  </div>
  `
}

const STYLES = `
@page { size: A4; margin: 18mm; }
body * { visibility: hidden; }
.rx-print, .rx-print * { visibility: visible; }
.rx-print { position: absolute; inset: 0; padding: 24px; font-family: 'Pretendard', system-ui, sans-serif; color: #111; }
.rx-page { max-width: 720px; margin: 0 auto; }
.rx-header { display: flex; justify-content: space-between; align-items: end; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
.rx-clinic-name { font-size: 18px; font-weight: 700; }
.rx-clinic-line { font-size: 12px; color: #444; }
.rx-title { font-size: 22px; font-weight: 800; letter-spacing: 4px; }
.rx-patient { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #aaa; margin-bottom: 12px; }
.rx-section { margin: 12px 0; }
.rx-section h3 { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.rx-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
.rx-table th, .rx-table td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
.rx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rx-footer { display: flex; justify-content: space-between; align-items: end; margin-top: 24px; border-top: 1px solid #111; padding-top: 12px; }
.rx-stamp { width: 80px; height: 80px; border: 1px dashed #888; display: flex; align-items: center; justify-content: center; color: #888; font-size: 11px; }
.rx-disclaimer { margin-top: 8px; font-size: 10px; color: #666; }
`

/** 즉시 인쇄 다이얼로그 노출. iframe 격리로 페이지 스타일 충돌 회피. */
export function printPrescription(data: PrescriptionPrintData): void {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) return
  doc.open()
  doc.write(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>처방전</title>
<style>${STYLES}</style></head>
<body class="rx-print">${buildHtml(data)}</body></html>`)
  doc.close()

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => document.body.removeChild(iframe), 800)
    }
  }
}

/** 환자 안내문(복약 지도) 인쇄 — 처방전과 동일 양식의 간소판. */
export function printPatientInstructions(data: {
  clinicName: string
  patientName: string
  visitDate: string
  body: string
}): void {
  printPrescription({
    clinicName: data.clinicName,
    doctorName: '담당 한의사',
    patientName: data.patientName,
    visitDate: data.visitDate,
    diagnosis: '환자 안내문',
    prescription: data.body,
    dosage: '안내문 참조',
    duration: '-',
  })
}
