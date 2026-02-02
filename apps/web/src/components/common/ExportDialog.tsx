import { useState } from 'react'
import { Download, FileText, Users, Calendar, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useExport, ExportType } from '@/hooks/useExport'

interface ExportDialogProps {
  trigger?: React.ReactNode
  defaultType?: ExportType
}

export function ExportDialog({ trigger, defaultType = 'consultations' }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [exportType, setExportType] = useState<ExportType>(defaultType)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { isExporting, exportToCSV } = useExport()

  const handleExport = async () => {
    await exportToCSV(exportType, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
    setOpen(false)
  }

  // 기본 날짜 범위 프리셋
  const setDatePreset = (preset: 'week' | 'month' | 'quarter' | 'year' | 'all') => {
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    setEndDate(formatDate(today))

    switch (preset) {
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        setStartDate(formatDate(weekAgo))
        break
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        setStartDate(formatDate(monthAgo))
        break
      case 'quarter':
        const quarterAgo = new Date(today)
        quarterAgo.setMonth(quarterAgo.getMonth() - 3)
        setStartDate(formatDate(quarterAgo))
        break
      case 'year':
        const yearAgo = new Date(today)
        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
        setStartDate(formatDate(yearAgo))
        break
      case 'all':
        setStartDate('')
        setEndDate('')
        break
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>데이터 내보내기</DialogTitle>
          <DialogDescription>
            진료 기록 또는 환자 목록을 CSV 파일로 내보냅니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 내보내기 유형 선택 */}
          <div className="space-y-3">
            <Label>내보내기 유형</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportType('consultations')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  exportType === 'consultations'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    exportType === 'consultations' ? 'bg-teal-500 text-white' : 'bg-gray-100'
                  }`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">진료 기록</div>
                  <div className="text-xs text-gray-500">처방 및 상담 내역</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportType('patients')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  exportType === 'patients'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    exportType === 'patients' ? 'bg-teal-500 text-white' : 'bg-gray-100'
                  }`}
                >
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">환자 목록</div>
                  <div className="text-xs text-gray-500">환자 정보 전체</div>
                </div>
              </button>
            </div>
          </div>

          {/* 기간 선택 */}
          <div className="space-y-3">
            <Label>기간 설정</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '최근 1주', value: 'week' as const },
                { label: '최근 1개월', value: 'month' as const },
                { label: '최근 3개월', value: 'quarter' as const },
                { label: '최근 1년', value: 'year' as const },
                { label: '전체', value: 'all' as const },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDatePreset(preset.value)}
                  className="px-3 py-1.5 text-sm rounded-full border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label htmlFor="startDate" className="text-xs text-gray-500">
                  시작일
                </Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="endDate" className="text-xs text-gray-500">
                  종료일
                </Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                내보내는 중...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                CSV 다운로드
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
