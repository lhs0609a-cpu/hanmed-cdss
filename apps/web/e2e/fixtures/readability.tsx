import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AccessibilityProvider } from '../../src/contexts/AccessibilityContext'
import { ReadabilityTools } from '../../src/components/common/ReadabilityTools'
import { CaseEvidencePanel } from '../../src/components/evidence/CaseEvidencePanel'
import '../../src/index.css'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter><AccessibilityProvider>
    <main style={{ padding: 16, paddingTop: 220 }}>
      <p data-testid="sample" style={{ fontSize: 12 }}>작은 글씨도 편하게 읽을 수 있습니다.</p>
      <button type="button">키보드로 읽는 문장</button>
      <CaseEvidencePanel kind="pattern" name="혈허" />
    </main>
    <ReadabilityTools />
  </AccessibilityProvider></BrowserRouter>,
)
