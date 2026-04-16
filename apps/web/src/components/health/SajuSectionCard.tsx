import { motion } from 'framer-motion'

interface SajuSectionCardProps {
  title: string
  content: string
  imageUrl?: string | null
  sectionOrder: number
  isLast?: boolean
}

/** 간이 마크다운 → HTML 변환 */
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-gray-800 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-gray-800 mt-6 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-orange-700">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-700">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-3 border-orange-300 pl-3 py-1 my-2 text-gray-600 bg-orange-50/50 rounded-r">$1</blockquote>')
    .replace(/\n{2,}/g, '</p><p class="text-gray-700 leading-relaxed mb-3">')
    .replace(/^(?!<[a-z])(.+)$/gm, '<p class="text-gray-700 leading-relaxed mb-3">$1</p>')
}

export default function SajuSectionCard({
  title,
  content,
  imageUrl,
  sectionOrder,
  isLast,
}: SajuSectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sectionOrder * 0.1 }}
      className={`bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm ${
        isLast ? '' : 'mb-4'
      }`}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-orange-100">
        <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-400 text-white text-sm font-bold rounded-full">
          {sectionOrder}
        </span>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>

      {/* DALL-E 이미지 */}
      {imageUrl && (
        <div className="mb-6 rounded-xl overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      )}

      {/* 본문 */}
      <div
        className="prose prose-sm max-w-none text-sm"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </motion.div>
  )
}
