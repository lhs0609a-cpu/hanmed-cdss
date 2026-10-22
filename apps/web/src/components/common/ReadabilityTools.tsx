import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Search, Type, X } from 'lucide-react'
import { useAccessibility, type FontScale } from '@/contexts/AccessibilityContext'
import { ProtectedRegion } from '@/components/cases/ProtectedCaseText'
import './readability-tools.css'

interface Reading {
  text: string
  caseId?: string
  watermark?: { label: string; issuedAt: string; traceId: string }
}

const sizes: { value: FontScale; label: string; percent: string }[] = [
  { value: 'small', label: '작게', percent: '90%' },
  { value: 'normal', label: '중간', percent: '100%' },
  { value: 'large', label: '크게', percent: '120%' },
]

export function ReadabilityTools() {
  const { fontScale, setFontScale } = useAccessibility()
  const [magnifying, setMagnifying] = useState(false)
  const [reading, setReading] = useState<Reading | null>(null)
  const layer = useRef<HTMLDivElement>(null)
  const lensButton = useRef<HTMLButtonElement>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement>(document.body)
  const location = useLocation()

  useEffect(() => { setReading(null) }, [location.pathname])

  // Keep the controls inside the active modal's focus scope. A manual popover
  // paints in the top layer, so transformed or scrolling dialogs cannot clip it.
  useEffect(() => {
    const updateTarget = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], dialog[open]'))
        .filter((dialog) => dialog.getClientRects().length > 0)
      setPortalTarget(dialogs[dialogs.length - 1] || document.body)
    }
    updateTarget()
    const observer = new MutationObserver(updateTarget)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'aria-modal'] })
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const element = layer.current
    if (!element || typeof element.showPopover !== 'function') return
    element.setAttribute('popover', 'manual')
    element.showPopover()
    return () => { if (element.isConnected && element.matches(':popover-open')) element.hidePopover() }
  }, [portalTarget])

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !magnifying) return
      event.preventDefault()
      event.stopPropagation()
      setMagnifying(false)
      setReading(null)
      lensButton.current?.focus()
    }
    window.addEventListener('keydown', escape, true)
    return () => {
      window.removeEventListener('keydown', escape, true)
    }
  }, [magnifying])

  useEffect(() => {
    if (!magnifying) return
    const read = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || target.closest('[data-readability-tools], input, textarea, select, [contenteditable="true"], [aria-hidden="true"]')) return
      const block = target.closest('p, li, h1, h2, h3, h4, h5, h6, label, button, a, td, th, pre, blockquote') || target
      if (!(block instanceof HTMLElement)) return
      const text = block.innerText?.trim()
      if (!text || text.length > 12000) return
      const protectedRegion = block.closest<HTMLElement>('.ongo-protected')
      if (protectedRegion) {
        try {
          const watermark = JSON.parse(protectedRegion.dataset.watermark || '')
          if (!protectedRegion.dataset.caseId || !watermark.label) return
          setReading({ text, caseId: protectedRegion.dataset.caseId, watermark })
        } catch { return }
      } else {
        setReading({ text })
      }
    }
    document.addEventListener('pointerover', read)
    document.addEventListener('focusin', read)
    return () => {
      document.removeEventListener('pointerover', read)
      document.removeEventListener('focusin', read)
    }
  }, [magnifying])

  const enlargedText = <p className="readability-reading">{reading?.text || '읽고 싶은 글씨에 마우스를 올리거나, 화면을 터치하거나, Tab 키로 이동하세요.'}</p>

  return createPortal(
    <div ref={layer} data-readability-tools className="readability-layer">
      {magnifying && <aside data-readability-tools className="readability-magnifier" aria-label="글자 확대경">
        <div className="readability-heading">
          <strong>글자 확대경</strong>
          <button type="button" onClick={() => { setMagnifying(false); setReading(null); lensButton.current?.focus() }} aria-label="확대경 닫기"><X size={22} /></button>
        </div>
        <div className="readability-reading-scroll">
          {reading?.caseId && reading.watermark
            ? <ProtectedRegion caseId={reading.caseId} watermark={reading.watermark}>{enlargedText}</ProtectedRegion>
            : enlargedText}
        </div>
      </aside>}
      <section data-readability-tools className="readability-tools" aria-label="가독성 설정">
          <div className="readability-heading">
            <strong><Type size={18} aria-hidden="true" /> 가독성</strong>
            <span>편하게 읽기</span>
          </div>
          <div className="readability-sizes" role="group" aria-label="화면 크기">
            {sizes.map((size) => <button key={size.value} type="button" aria-pressed={fontScale === size.value} onClick={() => setFontScale(size.value)}>
              <strong>{size.label}</strong><span>{size.percent}</span>
            </button>)}
          <button ref={lensButton} type="button" className="readability-lens-toggle" aria-label={`확대경 ${magnifying ? '끄기' : '켜기'}`} aria-pressed={magnifying} onClick={() => { setMagnifying(!magnifying); setReading(null) }}>
            <Search size={20} /><strong>확대경</strong>
          </button>
          </div>
          {fontScale === 'xlarge' && <p className="readability-hint">현재: 매우 크게 (130%)</p>}
      </section>
    </div>, portalTarget,
  )
}
