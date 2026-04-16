import { motion } from 'framer-motion'
import { Check, Crown, Star } from 'lucide-react'

interface SajuProductCardProps {
  tier: 'mini' | 'standard' | 'premium'
  name: string
  price: number
  sectionCount: number
  features: string[]
  badge?: string | null
  isSelected?: boolean
  onSelect?: () => void
}

export default function SajuProductCard({
  tier,
  name,
  price,
  sectionCount,
  features,
  badge,
  isSelected,
  onSelect,
}: SajuProductCardProps) {
  const isPopular = tier === 'standard'
  const isPremium = tier === 'premium'

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onSelect}
      className={`relative rounded-2xl p-5 md:p-6 border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-orange-400 bg-orange-50/50 shadow-lg shadow-orange-100'
          : isPopular
          ? 'border-orange-200 bg-white shadow-md'
          : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-md'
      }`}
    >
      {/* Badge */}
      {badge && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white ${
            isPremium
              ? 'bg-gradient-to-r from-violet-500 to-purple-500'
              : 'bg-gradient-to-r from-orange-500 to-rose-400'
          }`}
        >
          {badge}
        </div>
      )}

      {/* Tier icon + name */}
      <div className="flex items-center gap-2 mb-3">
        {isPremium ? (
          <Crown className="w-5 h-5 text-purple-500" />
        ) : (
          <Star className="w-5 h-5 text-orange-400" />
        )}
        <h3 className="text-lg font-bold text-gray-900">{name}</h3>
      </div>

      {/* Price */}
      <div className="mb-4">
        <span className="text-3xl font-black text-gray-900">
          {price.toLocaleString()}
        </span>
        <span className="text-sm text-gray-500 ml-1">원</span>
      </div>

      {/* Section count */}
      <p className="text-sm text-gray-500 mb-4">
        {sectionCount}개 섹션 분석
      </p>

      {/* Features */}
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Select indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </motion.div>
  )
}
