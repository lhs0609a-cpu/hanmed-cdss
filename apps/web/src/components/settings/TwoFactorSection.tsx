import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ShieldCheck,
  ShieldOff,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Key,
  Download,
} from 'lucide-react'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'

type Mode = 'idle' | 'setup' | 'disabling' | 'showingBackupCodes' | 'regenerating'

interface SetupResponse {
  secret: string
  otpAuthUrl: string
}

interface EnableResponse {
  message: string
  backupCodes: string[]
  warning: string
}

/**
 * 2단계 인증 설정 섹션. 현재 활성화 상태를 모르므로 사용자가 명시적으로
 * "활성화" 또는 "비활성화" 버튼을 눌러 흐름을 시작한다.
 */
export function TwoFactorSection() {
  const [mode, setMode] = useState<Mode>('idle')
  const [setup, setSetup] = useState<SetupResponse | null>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  useEffect(() => {
    setError('')
    setCode('')
  }, [mode])

  const downloadBackupCodes = (codes: string[]) => {
    const content = [
      '온고지신 AI - 2단계 인증 백업 코드',
      `발급 시각: ${new Date().toLocaleString('ko-KR')}`,
      '',
      '인증 앱을 사용할 수 없을 때 아래 코드 중 하나를 입력하여 로그인할 수 있습니다.',
      '각 코드는 1회만 사용 가능하며, 사용 후 자동으로 무효화됩니다.',
      '안전한 곳에 보관하고 분실 시 즉시 재발급하세요.',
      '',
      ...codes.map((c, i) => `${String(i + 1).padStart(2, ' ')}. ${c}`),
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ongojisin-2fa-backup-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const startSetup = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post<SetupResponse>('/auth/2fa/setup')
      setSetup(res.data)
      setMode('setup')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const enable = async () => {
    if (code.length !== 6) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post<EnableResponse>('/auth/2fa/enable', { code })
      toast.success('2단계 인증이 활성화되었습니다.')
      setBackupCodes(res.data.backupCodes)
      setMode('showingBackupCodes')
      setSetup(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const regenerateCodes = async () => {
    if (code.length !== 6) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post<EnableResponse>('/auth/2fa/backup-codes/regenerate', { code })
      toast.success('백업 코드가 재발급되었습니다.')
      setBackupCodes(res.data.backupCodes)
      setMode('showingBackupCodes')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const disable = async () => {
    if (code.length !== 6) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/auth/2fa/disable', { code })
      toast.success('2단계 인증이 비활성화되었습니다.')
      setMode('idle')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const copySecret = async () => {
    if (!setup) return
    try {
      await navigator.clipboard.writeText(setup.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('복사에 실패했습니다. 직접 선택하여 복사해주세요.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-600" />
          2단계 인증 (TOTP)
        </CardTitle>
        <CardDescription>
          Google Authenticator, Authy 등의 인증 앱을 추가 보안 단계로 사용합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              비밀번호 외에 인증 앱의 6자리 코드를 추가로 요구합니다. 관리자/임상의 계정에 권장됩니다.
              인증 앱 분실에 대비해 백업 코드 10개가 함께 발급됩니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={startSetup} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '활성화'}
              </Button>
              <Button variant="outline" onClick={() => setMode('regenerating')}>
                <Key className="h-4 w-4 mr-1" />
                백업 코드 재발급
              </Button>
              <Button variant="outline" onClick={() => setMode('disabling')}>
                <ShieldOff className="h-4 w-4 mr-1" />
                비활성화
              </Button>
            </div>
          </div>
        )}

        {mode === 'showingBackupCodes' && backupCodes && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-900 flex gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <strong>이 백업 코드는 다시 표시되지 않습니다.</strong> 인증 앱을 분실했을 때 로그인하는 데 사용됩니다.
                안전한 곳(비밀번호 매니저, 인쇄)에 즉시 보관하세요. 각 코드는 1회만 사용 가능합니다.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm">
              {backupCodes.map((c, i) => (
                <div key={c} className="flex items-baseline gap-2">
                  <span className="text-gray-400 text-xs w-5 text-right">{i + 1}.</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => downloadBackupCodes(backupCodes)}>
                <Download className="h-4 w-4 mr-1" />
                .txt로 다운로드
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(backupCodes.join('\n'))
                    toast.success('백업 코드를 클립보드에 복사했습니다.')
                  } catch {
                    toast.error('복사 실패. 직접 선택하여 복사해주세요.')
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                전체 복사
              </Button>
              <Button
                onClick={() => {
                  setBackupCodes(null)
                  setMode('idle')
                }}
              >
                저장 완료
              </Button>
            </div>
          </div>
        )}

        {mode === 'regenerating' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              새 백업 코드를 발급하면 기존 코드 10개는 모두 무효화됩니다. 본인 확인을 위해 현재 인증 앱의 6자리 코드를 입력하세요.
            </p>
            <Input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="font-mono text-center text-lg tracking-[0.4em]"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={regenerateCodes} disabled={submitting || code.length !== 6}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '재발급'}
              </Button>
              <Button variant="ghost" onClick={() => setMode('idle')}>
                취소
              </Button>
            </div>
          </div>
        )}

        {mode === 'setup' && setup && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 flex gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                인증 앱을 열고 <strong>"수동으로 키 입력"</strong> 옵션을 선택한 뒤 아래 시크릿을 입력하세요.
                계정 이름은 자유롭게 정해도 됩니다 (예: 온고지신 AI).
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>시크릿 키</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={setup.secret}
                  className="font-mono text-sm tracking-wider"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={copySecret}>
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      복사
                    </>
                  )}
                </Button>
              </div>
            </div>

            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">otpauth URL (개발자용)</summary>
              <code className="block mt-2 p-2 bg-gray-50 rounded text-xs break-all">{setup.otpAuthUrl}</code>
            </details>

            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="enable-code">인증 앱에 표시된 6자리 코드</Label>
              <Input
                id="enable-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="font-mono text-center text-lg tracking-[0.4em]"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-2">
                <Button onClick={enable} disabled={submitting || code.length !== 6}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '활성화 완료'}
                </Button>
                <Button variant="ghost" onClick={() => setMode('idle')}>
                  취소
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === 'disabling' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              비활성화하려면 현재 인증 앱에 표시된 6자리 코드를 입력하세요.
            </p>
            <Input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="font-mono text-center text-lg tracking-[0.4em]"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="destructive" onClick={disable} disabled={submitting || code.length !== 6}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '비활성화'}
              </Button>
              <Button variant="ghost" onClick={() => setMode('idle')}>
                취소
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
