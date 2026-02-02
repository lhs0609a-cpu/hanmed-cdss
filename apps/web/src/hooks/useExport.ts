import { useState } from 'react'
import { toast } from 'sonner'
import api from '@/services/api'

export type ExportType = 'consultations' | 'patients'

interface ExportOptions {
  startDate?: string
  endDate?: string
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false)

  /**
   * CSV 파일 내보내기
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

      // 파일 다운로드
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      const filename =
        type === 'consultations'
          ? `진료기록_${getDateString()}.csv`
          : `환자목록_${getDateString()}.csv`
      link.download = filename

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

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
