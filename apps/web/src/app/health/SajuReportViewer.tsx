import { useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Share2,
  BookOpen,
  Star,
  Sparkles,
} from 'lucide-react'
import { useSajuReport, useSajuReportByToken, useGeneratePdf } from '@/hooks/useSaju'
import SajuProgressBar from '@/components/health/SajuProgressBar'
import SajuSectionCard from '@/components/health/SajuSectionCard'
import { ELEMENT_EMOJI, type ElementBalance } from '@/lib/saju'
import { ElementBar } from '@/components/health/ElementChart'

export default function SajuReportViewer() {
  const { id, token: pathToken } = useParams<{ id?: string; token?: string }>()
  const [searchParams] = useSearchParams()
  // id 경로에서도 ?token=xxx 로 전달 가능
  const queryToken = searchParams.get('token') ?? undefined

  // 훅은 항상 호출하고 enabled 옵션으로 제어 (React Hooks 규칙 준수)
  const reportByIdQuery = useSajuReport(id, queryToken)
  const reportByTokenQuery = useSajuReportByToken(pathToken)
  const reportQuery = id ? reportByIdQuery : reportByTokenQuery

  const generatePdf = useGeneratePdf()

  const report = reportQuery.data?.report
  const sections = reportQuery.data?.sections || []

  const isGenerating = report?.status === 'generating'
  const isCompleted = report?.status === 'completed'
  const isFailed = report?.status === 'failed'

  // 목차
  const toc = useMemo(
    () => sections.map((s) => ({ id: s.sectionType, title: s.title, order: s.sectionOrder })),
    [sections],
  )

  // 공유 URL
  const shareUrl = report
    ? `${window.location.origin}/health/saju/report/view/${report.accessToken}`
    : ''

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${report?.name}님의 건강사주 리포트`,
          text: '나만의 건강사주 리포트를 확인해보세요!',
          url: shareUrl,
        })
      } catch {
        // 취소
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert('링크가 복사되었습니다!')
    }
  }

  const handleDownloadPdf = () => {
    if (report?.pdfUrl) {
      window.open(report.pdfUrl, '_blank')
    } else if (report?.id && report?.accessToken) {
      generatePdf.mutate({ reportId: report.id, token: report.accessToken })
    }
  }

  if (reportQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">리포트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl block mb-4">📝</span>
        <h2 className="text-xl font-bold text-gray-800 mb-2">리포트를 찾을 수 없어요</h2>
        <Link to="/health/saju" className="text-orange-500 font-medium hover:underline">
          건강사주 홈으로 이동
        </Link>
      </div>
    )
  }

  // 안전한 ElementBalance 매핑 (오행 키 누락 시 0)
  const rawBalance = (report.elementBalance ?? {}) as Record<string, number>
  const balance: ElementBalance = {
    목: rawBalance['목'] ?? 0,
    화: rawBalance['화'] ?? 0,
    토: rawBalance['토'] ?? 0,
    금: rawBalance['금'] ?? 0,
    수: rawBalance['수'] ?? 0,
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/health/saju"
          className="flex items-center gap-1 text-gray-500 hover:text-orange-500 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          건강사주
        </Link>

        {isCompleted && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              공유
            </button>
            {report.tier === 'premium' && (
              <button
                onClick={handleDownloadPdf}
                disabled={generatePdf.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-purple-500 to-orange-500 rounded-full hover:shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                {generatePdf.isPending ? 'PDF 생성 중...' : 'PDF'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 리포트 정보 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-50 via-purple-50 to-rose-50 rounded-2xl p-6 mb-6 border border-purple-100"
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-purple-500" />
          <span className="text-xs font-medium text-purple-500 uppercase">
            {report.tier} Report
          </span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">
          {report.name}님의 건강사주
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          {report.birthDate}
          {report.birthHour != null ? ` ${report.birthHour}시` : ''} | {report.constitution} 체질
        </p>

        {/* 오행 요약 */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 bg-white/70 rounded-full text-xs font-medium text-gray-600">
            {ELEMENT_EMOJI[report.dominantElement as keyof typeof ELEMENT_EMOJI]} 강한 오행: {report.dominantElement}
          </span>
          <span className="px-2.5 py-1 bg-white/70 rounded-full text-xs font-medium text-gray-600">
            {ELEMENT_EMOJI[report.weakElement as keyof typeof ELEMENT_EMOJI]} 약한 오행: {report.weakElement}
          </span>
        </div>

        {/* 오행 밸런스 */}
        <div className="mt-4">
          <ElementBar balance={balance} />
        </div>
      </motion.div>

      {/* 생성 중 프로그레스 */}
      {(isGenerating || report.status === 'pending_payment') && (
        <div className="mb-6">
          <SajuProgressBar
            completedSections={report.completedSections}
            totalSections={report.totalSections}
            status={report.status}
          />
        </div>
      )}

      {/* 실패 */}
      {isFailed && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 text-center">
          <span className="text-3xl block mb-2">😢</span>
          <h3 className="font-bold text-red-800 mb-1">리포트 생성 실패</h3>
          <p className="text-sm text-red-600">
            리포트 생성 중 오류가 발생했습니다.
            <br />
            고객센터(support@ongojisin.ai)로 문의해주세요.
          </p>
        </div>
      )}

      {/* 목차 (데스크톱 사이드바) */}
      {sections.length > 0 && (
        <div className="hidden lg:block fixed right-8 top-24 w-56">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">목차</h4>
          <nav className="space-y-1">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#section-${item.id}`}
                className="block text-xs text-gray-500 hover:text-orange-500 py-1 transition-colors truncate"
              >
                {item.order}. {item.title}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* 섹션 카드들 */}
      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={section.id} id={`section-${section.sectionType}`}>
            <SajuSectionCard
              title={section.title}
              content={section.content}
              imageUrl={section.imageUrl}
              sectionOrder={section.sectionOrder}
              isLast={i === sections.length - 1}
            />
          </div>
        ))}
      </div>

      {/* 생성 중 안내 (섹션이 아직 없을 때) */}
      {isGenerating && sections.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-6" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            AI가 리포트를 작성하고 있어요
          </h3>
          <p className="text-gray-500">
            잠시만 기다려주세요. 완성된 섹션부터 순서대로 표시됩니다.
          </p>
        </div>
      )}

      {/* 완료 후 CTA */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center pb-8"
        >
          <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-2xl p-6 border border-orange-100">
            <Sparkles className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              리포트가 마음에 드셨나요?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              친구나 가족의 건강사주도 확인해보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleShare}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Share2 className="w-4 h-4" />
                이 리포트 공유하기
              </button>
              <Link
                to="/health/saju/input"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <Star className="w-4 h-4" />
                새 리포트 받기
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
