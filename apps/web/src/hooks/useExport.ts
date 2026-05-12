import { useState } from 'react'
import { toast } from 'sonner'
import api from '@/services/api'
import { ensureBomBlob, downloadCsv } from '@/lib/csv'

export type ExportType = 'consultations' | 'patients'

interface ExportOptions {
  startDate?: string
  endDate?: string
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false)

  /**
   * CSV 파일 내보내기 — UTF-8 BOM 을 자동 prepend 해서 Windows Excel 에서
   * 한글이 깨지지 않도록 한다 (apps/web/src/lib/csv.ts).
   */
  const exportToCSV = async (type: ExportType, options?: ExportOptions) => {
    setIsExporting(true)

    try {
      const params = new URLSearchParams()
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)

      const queryString = params.toString()
      const url = `/export/${type}/csv${queryString ? `?${queryString}` : ''}`

      const response = await api.get(url, {
        responseType: 'blob',
      })

      // 서버 응답에 BOM 이 없으면 prepend (한글 깨짐 방지)
      const blob = await ensureBomBlob(response.data as Blob)
      const filename =
        type === 'consultations'
          ? `진료기록_${getDateString()}.csv`
          : `환자목록_${getDateString()}.csv`
      downloadCsv(filename, blob)

      toast.success('내보내기 완료', {
        description: `${filename} 파일이 다운로드되었습니다.`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('내보내기 실패', {
        description: '파일 내보내기 중 오류가 발생했습니다.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * 처방전 PDF 내보내기 (HTML 생성 후 인쇄)
   */
  const exportPrescriptionToPDF = async (prescriptionId: string) => {
    setIsExporting(true)

    try {
      const response = await api.get(`/export/prescription/${prescriptionId}/html`, {
        responseType: 'text',
      })

      // 새 창에서 HTML 열고 인쇄 다이얼로그 표시
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(response.data)
        printWindow.document.close()
        printWindow.onload = () => {
          printWindow.print()
        }
      } else {
        toast.error('팝업 차단됨', {
          description: '브라우저 팝업 차단을 해제해 주세요.',
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('처방전 출력 실패', {
        description: '처방전을 불러오는 중 오류가 발생했습니다.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return {
    isExporting,
    exportToCSV,
    exportPrescriptionToPDF,
  }
}

function getDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
}
